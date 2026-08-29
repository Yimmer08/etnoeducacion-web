-- ══════════════════════════════════════════════════════════════════════════════
-- 003_politicas_rls.sql — RLS en TODAS las tablas
--
-- Regla que no se discute: ninguna tabla queda sin RLS. Acá el repositorio es de lectura pública, pero «público» significa
-- exactamente `estado = 'publicado'` — un borrador o un documento rechazado no
-- son visibles para nadie más que su autor y los admins.
--
-- Postgres combina varias políticas permisivas con OR. Por eso hay una política
-- de lectura pública Y otra de lectura de equipo: el visitante anónimo pasa por
-- la primera, el colaborador por la segunda.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE perfiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE colecciones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE etiquetas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE documento_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisiones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_documento   ENABLE ROW LEVEL SECURITY;

-- ─── perfiles ─────────────────────────────────────────────────────────────────
-- Nadie se auto-registra: los perfiles los crea un admin. Cada quien lee el
-- suyo (el panel necesita saber su propio rol) y los admins ven todos.
CREATE POLICY "perfiles_lectura_propia"  ON perfiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "perfiles_admin_total"     ON perfiles FOR ALL    USING (es_admin()) WITH CHECK (es_admin());

-- ─── colecciones y etiquetas ──────────────────────────────────────────────────
CREATE POLICY "colecciones_lectura_publica" ON colecciones FOR SELECT USING (activa = true);
CREATE POLICY "colecciones_lectura_equipo"  ON colecciones FOR SELECT USING (es_equipo());
CREATE POLICY "colecciones_admin_escribe"   ON colecciones FOR ALL    USING (es_admin()) WITH CHECK (es_admin());

CREATE POLICY "etiquetas_lectura_publica"   ON etiquetas FOR SELECT USING (true);
-- El colaborador crea etiquetas al subir; borrarlas es de admins (una etiqueta
-- borrada arrastra sus vínculos por ON DELETE CASCADE).
CREATE POLICY "etiquetas_equipo_crea"       ON etiquetas FOR INSERT WITH CHECK (es_equipo());
CREATE POLICY "etiquetas_admin_total"       ON etiquetas FOR ALL    USING (es_admin()) WITH CHECK (es_admin());

-- ─── documentos ───────────────────────────────────────────────────────────────
CREATE POLICY "documentos_lectura_publica" ON documentos
  FOR SELECT USING (estado = 'publicado');

CREATE POLICY "documentos_lectura_equipo" ON documentos
  FOR SELECT USING (es_admin() OR subido_por = auth.uid());

-- El colaborador crea SIEMPRE a su nombre y SIEMPRE sin publicar. Que
-- `subido_por` venga del cliente no importa: si no coincide con auth.uid(),
-- la política rechaza el INSERT.
CREATE POLICY "documentos_equipo_inserta" ON documentos
  FOR INSERT WITH CHECK (
    es_equipo()
    AND subido_por = auth.uid()
    AND estado IN ('borrador', 'en_revision')
  );

-- Edición del colaborador: solo lo suyo, solo mientras no esté publicado, y
-- el WITH CHECK impide que se auto-publique cambiando `estado`. Ese es el
-- punto entero del flujo de revisión — si esta línea se cae, cualquiera con
-- cuenta publica sin que un admin lo mire.
--
-- Las dos listas son la MISMA a propósito. Cuando el WITH CHECK era más corto
-- que el USING (sin 'rechazado'), un colaborador podía abrir el formulario de
-- un documento devuelto —`puedeEditar()` se lo permitía— y al guardar la fila
-- resultante seguía en 'rechazado', fallaba el WITH CHECK y el UPDATE no
-- afectaba ninguna fila: un error incomprensible justo cuando estaba
-- corrigiendo lo que le pidieron. Lo que el WITH CHECK tiene que impedir es
-- 'publicado' y 'archivado', y eso lo sigue haciendo.
CREATE POLICY "documentos_colaborador_edita" ON documentos
  FOR UPDATE
  USING (subido_por = auth.uid() AND estado IN ('borrador', 'en_revision', 'rechazado'))
  WITH CHECK (subido_por = auth.uid() AND estado IN ('borrador', 'en_revision', 'rechazado'));

CREATE POLICY "documentos_admin_total" ON documentos
  FOR ALL USING (es_admin()) WITH CHECK (es_admin());

-- ─── documento_etiquetas ──────────────────────────────────────────────────────
-- Se lee junto con el documento; el filtro real lo pone la RLS de `documentos`
-- al hacer el JOIN, pero la lectura directa también tiene que respetarlo.
CREATE POLICY "doc_etiquetas_lectura_publica" ON documento_etiquetas
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM documentos d WHERE d.id = documento_id AND d.estado = 'publicado')
  );

CREATE POLICY "doc_etiquetas_equipo" ON documento_etiquetas
  FOR ALL USING (es_admin() OR es_mi_documento(documento_id))
          WITH CHECK (es_admin() OR es_mi_documento(documento_id));

-- ─── revisiones ───────────────────────────────────────────────────────────────
-- Solo un admin evalúa. El colaborador lee las de su propio documento para
-- saber qué corregir. No hay UPDATE ni DELETE: la evaluación es historial.
CREATE POLICY "revisiones_admin_lee"    ON revisiones FOR SELECT USING (es_admin());
CREATE POLICY "revisiones_autor_lee"    ON revisiones FOR SELECT USING (es_mi_documento(documento_id));
CREATE POLICY "revisiones_admin_crea"   ON revisiones FOR INSERT WITH CHECK (es_admin() AND revisor_id = auth.uid());

-- ─── eventos_documento ────────────────────────────────────────────────────────
-- Nadie escribe acá directamente: los eventos entran por la función
-- `registrar_evento_documento()` de 004, que es SECURITY DEFINER y valida que
-- el documento esté publicado. Sin política de INSERT, un cliente con la anon
-- key no puede inflar el contador.
CREATE POLICY "eventos_admin_lee" ON eventos_documento FOR SELECT USING (es_admin());
