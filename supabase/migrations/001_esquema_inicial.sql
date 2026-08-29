-- ══════════════════════════════════════════════════════════════════════════════
-- 001_esquema_inicial.sql — Repositorio de Etnoeducación Afrocolombiana
--
-- 7 tablas. El orden importa: `perfiles` y `colecciones` primero porque
-- `documentos` las referencia.
--
-- Convención: migraciones numeradas NNN_descripcion.sql, una sola vez cada una,
-- nunca se editan después de aplicarse (si algo cambia, se agrega otra
-- migración). `npm run check:migrations` falla si dos comparten número — es la
-- colisión típica entre dos ramas en paralelo.
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── perfiles ─────────────────────────────────────────────────────────────────
-- Un perfil por usuario de Supabase Auth. `id` ES el `auth.uid()` a propósito:
-- así las funciones de RLS de 002 comparan directo contra auth.uid() sin un JOIN
-- de por medio.
--
-- No hay registro público: los perfiles los crea un admin. El repositorio es de
-- lectura abierta, la cuenta solo sirve para SUBIR y REVISAR.
CREATE TABLE perfiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre       text NOT NULL,
  rol          text NOT NULL DEFAULT 'colaborador',
  organizacion text,
  activo       boolean NOT NULL DEFAULT true,
  creado_en    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT perfiles_rol_valido CHECK (rol IN ('admin', 'colaborador'))
);

COMMENT ON COLUMN perfiles.rol IS
  'admin: publica, revisa y borra cualquier documento. colaborador: sube y edita lo suyo, no publica.';

-- ─── colecciones ──────────────────────────────────────────────────────────────
-- Agrupaciones temáticas curadas, cada una con su página propia
-- (ej. «Cátedra de Estudios Afrocolombianos», «Ley 70 de 1993»).
-- Un documento pertenece a 0 o 1 colección; para lo transversal están las
-- etiquetas.
CREATE TABLE colecciones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  nombre      text NOT NULL,
  descripcion text,
  orden       smallint NOT NULL DEFAULT 100,
  activa      boolean NOT NULL DEFAULT true,
  creado_en   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT colecciones_slug_formato CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- ─── etiquetas ────────────────────────────────────────────────────────────────
-- Vocabulario transversal (ej. «tradición oral», «palenquero», «currulao»).
-- Muchos-a-muchos con documentos.
CREATE TABLE etiquetas (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug   text UNIQUE NOT NULL,
  nombre text NOT NULL,

  CONSTRAINT etiquetas_slug_formato CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- ─── documentos ───────────────────────────────────────────────────────────────
-- La tabla central. Los metadatos siguen Dublin Core adaptado a etnoeducación:
-- a los campos bibliográficos habituales se suman `comunidad`, `territorio` y
-- `nivel_educativo`, que son los que de verdad se usan para buscar material de
-- Cátedra Afro y que ningún esquema bibliográfico genérico contempla.
CREATE TABLE documentos (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug     text UNIQUE NOT NULL,

  -- Descriptivos
  titulo   text NOT NULL,
  subtitulo text,
  resumen  text,
  autores  text[] NOT NULL DEFAULT '{}',
  anio     smallint,
  idioma   text NOT NULL DEFAULT 'es',
  tipo     text NOT NULL,

  -- Contexto etnoeducativo (lo propio de este repositorio)
  comunidad       text,  -- consejo comunitario / organización / colectivo
  territorio      text,  -- municipio, departamento o región
  nivel_educativo text,

  -- Procedencia y derechos
  fuente    text,        -- editorial, institución o revista de origen
  isbn_issn text,
  licencia  text NOT NULL DEFAULT 'derechos_reservados',

  -- Archivo. `archivo_ruta` es la ruta dentro del bucket privado de Storage,
  -- nunca una URL: las URLs se firman al vuelo en el servidor (ver 005 y la
  -- ruta /api/documentos/[slug]/archivo).
  archivo_ruta   text NOT NULL,
  archivo_nombre text NOT NULL,
  archivo_bytes  bigint NOT NULL,
  archivo_mime   text NOT NULL,
  archivo_sha256 text,   -- para detectar que el mismo archivo ya está cargado
  paginas        integer,
  portada_url    text,   -- opcional, imagen externa; si es NULL la ficha usa portada tipográfica

  coleccion_id uuid REFERENCES colecciones(id) ON DELETE SET NULL,

  -- Flujo de trabajo (borrador → en_revision → publicado | rechazado → archivado)
  estado        text NOT NULL DEFAULT 'borrador',
  subido_por    uuid REFERENCES perfiles(id) ON DELETE SET NULL,
  revisado_por  uuid REFERENCES perfiles(id) ON DELETE SET NULL,
  revisado_en   timestamptz,
  publicado_en  timestamptz,

  -- Contadores. Se incrementan desde el servidor (ver 004), nunca desde el
  -- cliente: un contador que el navegador puede escribir no es una estadística.
  vistas    integer NOT NULL DEFAULT 0,
  descargas integer NOT NULL DEFAULT 0,

  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT documentos_slug_formato CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT documentos_estado_valido CHECK (
    estado IN ('borrador', 'en_revision', 'publicado', 'rechazado', 'archivado')
  ),
  CONSTRAINT documentos_tipo_valido CHECK (
    tipo IN ('libro', 'cartilla', 'articulo', 'tesis', 'normativa',
             'informe', 'audio', 'video', 'fotografia', 'otro')
  ),
  CONSTRAINT documentos_licencia_valida CHECK (
    licencia IN ('cc_by', 'cc_by_sa', 'cc_by_nc', 'cc_by_nc_sa',
                 'dominio_publico', 'con_permiso', 'derechos_reservados')
  ),
  CONSTRAINT documentos_anio_razonable CHECK (
    anio IS NULL OR (anio BETWEEN 1500 AND 2200)
  ),
  CONSTRAINT documentos_bytes_positivo CHECK (archivo_bytes > 0),
  -- Un documento publicado SIEMPRE tiene fecha de publicación. Sin esto, un
  -- UPDATE que cambia el estado y olvida la fecha deja la portada ordenando
  -- por NULL y el documento nuevo aparece al final.
  CONSTRAINT documentos_publicado_con_fecha CHECK (
    estado <> 'publicado' OR publicado_en IS NOT NULL
  )
);

CREATE INDEX documentos_estado_idx      ON documentos (estado);
CREATE INDEX documentos_coleccion_idx   ON documentos (coleccion_id);
CREATE INDEX documentos_publicado_idx   ON documentos (publicado_en DESC) WHERE estado = 'publicado';
CREATE INDEX documentos_subido_por_idx  ON documentos (subido_por);
CREATE INDEX documentos_tipo_idx        ON documentos (tipo);
CREATE INDEX documentos_anio_idx        ON documentos (anio);
-- Parcial y único: el mismo archivo no se sube dos veces, pero los rechazados
-- y archivados no bloquean una carga nueva.
CREATE UNIQUE INDEX documentos_sha256_vigente_idx ON documentos (archivo_sha256)
  WHERE archivo_sha256 IS NOT NULL AND estado NOT IN ('rechazado', 'archivado');

-- ─── documento_etiquetas ──────────────────────────────────────────────────────
CREATE TABLE documento_etiquetas (
  documento_id uuid NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  etiqueta_id  uuid NOT NULL REFERENCES etiquetas(id)  ON DELETE CASCADE,
  PRIMARY KEY (documento_id, etiqueta_id)
);

CREATE INDEX documento_etiquetas_etiqueta_idx ON documento_etiquetas (etiqueta_id);

-- ─── revisiones ───────────────────────────────────────────────────────────────
-- El mecanismo de evaluación. Cada vez que un admin revisa un documento en cola
-- queda un registro con su decisión y tres criterios de 1 a 5. Es historial: no
-- se borra ni se edita, aunque el documento vuelva a revisión más adelante.
CREATE TABLE revisiones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  revisor_id   uuid REFERENCES perfiles(id) ON DELETE SET NULL,
  decision     text NOT NULL,
  comentario   text,

  -- Criterios de evaluación. Nulos si el revisor no los diligenció.
  crit_pertinencia  smallint,  -- ¿aporta a la etnoeducación afro?
  crit_calidad      smallint,  -- ¿legible, completo, bien escaneado?
  crit_metadatos    smallint,  -- ¿autor, año y fuente correctos?

  creado_en timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT revisiones_decision_valida CHECK (
    decision IN ('aprobado', 'cambios_solicitados', 'rechazado')
  ),
  CONSTRAINT revisiones_pertinencia_rango CHECK (crit_pertinencia IS NULL OR crit_pertinencia BETWEEN 1 AND 5),
  CONSTRAINT revisiones_calidad_rango     CHECK (crit_calidad     IS NULL OR crit_calidad     BETWEEN 1 AND 5),
  CONSTRAINT revisiones_metadatos_rango   CHECK (crit_metadatos   IS NULL OR crit_metadatos   BETWEEN 1 AND 5),
  -- Rechazar o pedir cambios sin decir por qué deja al colaborador sin nada
  -- que corregir. Aprobar sí puede ir sin comentario.
  CONSTRAINT revisiones_negativa_con_motivo CHECK (
    decision = 'aprobado' OR (comentario IS NOT NULL AND length(trim(comentario)) >= 10)
  )
);

CREATE INDEX revisiones_documento_idx ON revisiones (documento_id, creado_en DESC);

-- ─── eventos_documento ────────────────────────────────────────────────────────
-- Bitácora de vistas y descargas para las estadísticas. La IP se guarda
-- HASHEADA con sal del servidor, nunca en claro: sirve para no contar diez
-- veces el mismo clic, no para identificar a nadie.
CREATE TABLE eventos_documento (
  id           bigserial PRIMARY KEY,
  documento_id uuid NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  tipo         text NOT NULL,
  ip_hash      text,
  creado_en    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT eventos_tipo_valido CHECK (tipo IN ('vista', 'descarga'))
);

CREATE INDEX eventos_documento_idx ON eventos_documento (documento_id, creado_en DESC);
CREATE INDEX eventos_fecha_idx     ON eventos_documento (creado_en DESC);

-- ─── actualizado_en automático ────────────────────────────────────────────────
-- Ojo con los contadores: `vistas` y `descargas` los sube cada visitante que
-- abre la ficha. Si el trigger tocara `actualizado_en` también en ese caso,
-- «última actualización» pasaría a significar «última vez que alguien lo miró»,
-- y el panel de un colaborador mostraría documentos suyos «actualizados» que
-- nadie tocó. Por eso se compara la fila SIN los contadores.
CREATE OR REPLACE FUNCTION tocar_actualizado_en() RETURNS trigger AS $$
BEGIN
  IF (to_jsonb(NEW) - 'vistas' - 'descargas' - 'actualizado_en' - 'busqueda')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'vistas' - 'descargas' - 'actualizado_en' - 'busqueda') THEN
    NEW.actualizado_en = now();
  ELSE
    NEW.actualizado_en = OLD.actualizado_en;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER documentos_actualizado_en
  BEFORE UPDATE ON documentos
  FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en();
