-- ══════════════════════════════════════════════════════════════════════════════
-- 004_busqueda_y_estadisticas.sql — Buscador de texto completo y contadores
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── Columna de búsqueda ──────────────────────────────────────────────────────
-- Se mantiene por TRIGGER y no como columna GENERATED a propósito:
-- `array_to_string(autores, ' ')` es STABLE, no IMMUTABLE, y Postgres rechaza
-- cualquier expresión no inmutable en una columna generada. Buscar por autor es
-- justo lo que más se usa en un repositorio, así que el trigger es el camino.
--
-- Los pesos ordenan el resultado: un término que aparece en el título o en el
-- autor (A) pesa más que uno que aparece en el resumen (C) o en el territorio (D).
ALTER TABLE documentos ADD COLUMN busqueda tsvector;

CREATE OR REPLACE FUNCTION armar_busqueda_documento() RETURNS trigger AS $$
BEGIN
  NEW.busqueda :=
      setweight(to_tsvector('spanish', coalesce(NEW.titulo, '')), 'A')
   || setweight(to_tsvector('spanish', array_to_string(NEW.autores, ' ')), 'A')
   || setweight(to_tsvector('spanish', coalesce(NEW.subtitulo, '')), 'B')
   || setweight(to_tsvector('spanish', coalesce(NEW.resumen, '')), 'C')
   || setweight(to_tsvector('spanish',
        concat_ws(' ', NEW.comunidad, NEW.territorio, NEW.fuente, NEW.nivel_educativo)), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER documentos_busqueda
  BEFORE INSERT OR UPDATE ON documentos
  FOR EACH ROW EXECUTE FUNCTION armar_busqueda_documento();

CREATE INDEX documentos_busqueda_idx ON documentos USING GIN (busqueda);

-- Rellena las filas que ya existieran (en una base nueva no hay ninguna, pero
-- esta migración tiene que ser correcta si se aplica sobre datos ya cargados).
UPDATE documentos SET actualizado_en = actualizado_en;

-- ─── Registro de vistas y descargas ───────────────────────────────────────────
-- SECURITY DEFINER porque `eventos_documento` no tiene política de INSERT: los
-- eventos entran SOLO por acá. La función valida ella misma que el documento
-- esté publicado, así que un cliente con la anon key no puede registrar
-- descargas de un borrador ni inventar un documento que no existe.
--
-- Dedupe de 30 minutos por (documento, tipo, ip_hash): sin esto, cinco F5
-- seguidos son cinco «vistas» y la estadística deja de significar algo.
-- El hash lo calcula el servidor con una sal propia (lib/analitica/ip.ts); acá
-- nunca llega una IP en claro.
CREATE OR REPLACE FUNCTION registrar_evento_documento(
  p_slug    text,
  p_tipo    text,
  p_ip_hash text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_id       uuid;
  v_reciente boolean;
BEGIN
  IF p_tipo NOT IN ('vista', 'descarga') THEN
    RAISE EXCEPTION 'Tipo de evento inválido: %', p_tipo;
  END IF;

  SELECT id INTO v_id
  FROM public.documentos
  WHERE slug = p_slug AND estado = 'publicado';

  IF v_id IS NULL THEN
    RETURN;  -- documento inexistente o no publicado: no se cuenta, y sin ruido
  END IF;

  IF p_ip_hash IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.eventos_documento
      WHERE documento_id = v_id
        AND tipo = p_tipo
        AND ip_hash = p_ip_hash
        AND creado_en > now() - interval '30 minutes'
    ) INTO v_reciente;

    IF v_reciente THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.eventos_documento (documento_id, tipo, ip_hash)
  VALUES (v_id, p_tipo, p_ip_hash);

  IF p_tipo = 'vista' THEN
    UPDATE public.documentos SET vistas = vistas + 1 WHERE id = v_id;
  ELSE
    UPDATE public.documentos SET descargas = descargas + 1 WHERE id = v_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION registrar_evento_documento(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION registrar_evento_documento(text, text, text) TO anon, authenticated;

-- ─── Vistas de apoyo ──────────────────────────────────────────────────────────
-- `security_invoker = true`: la vista se evalúa con los permisos de quien
-- consulta, no de quien la creó. Sin esto una vista es un agujero por el que se
-- lee lo que la RLS de la tabla no dejaría. Es un descuido fácil de cometer y
-- caro de detectar, así que va puesto desde la primera vista que se crea.

-- Actividad de los últimos 90 días, para el panel de estadísticas.
CREATE VIEW actividad_por_dia WITH (security_invoker = true) AS
  SELECT
    date_trunc('day', creado_en)::date AS dia,
    tipo,
    count(*)                           AS total
  FROM eventos_documento
  WHERE creado_en > now() - interval '90 days'
  GROUP BY 1, 2;

-- Cola de revisión con los datos que el admin necesita para decidir, sin
-- traerse la tabla entera.
CREATE VIEW cola_de_revision WITH (security_invoker = true) AS
  SELECT
    d.id,
    d.slug,
    d.titulo,
    d.tipo,
    d.autores,
    d.anio,
    d.archivo_bytes,
    d.creado_en,
    d.actualizado_en,
    p.nombre AS subido_por_nombre,
    (SELECT count(*) FROM revisiones r WHERE r.documento_id = d.id) AS revisiones_previas
  FROM documentos d
  LEFT JOIN perfiles p ON p.id = d.subido_por
  WHERE d.estado = 'en_revision';
