-- ══════════════════════════════════════════════════════════════════════════════
-- 005_storage.sql — Bucket de archivos
--
-- ⚠️ El bucket es PRIVADO aunque el repositorio sea de lectura pública. No es
-- una contradicción: en el bucket conviven los archivos publicados con los
-- borradores y los rechazados. Un bucket público los expondría todos, porque
-- Storage no sabe nada del `estado` de la tabla `documentos`.
--
-- El archivo publicado se entrega por /api/documentos/[slug]/archivo, que
-- primero comprueba contra la RLS que el documento esté publicado y solo
-- entonces firma una URL de corta duración. La RLS decide, la service_role
-- ejecuta — nunca al revés.
--
-- Convención de rutas: `{id_del_perfil}/{uuid}.{ext}`. La primera carpeta es el
-- dueño, y de ahí sale la RLS de abajo: un colaborador no puede leer, pisar ni
-- borrar los archivos de otro.
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  false,
  52428800,  -- 50 MB. Un PDF escaneado de una cartilla llega tranquilo a 20-30 MB.
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/epub+zip',
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'video/mp4'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ─── Políticas del bucket ─────────────────────────────────────────────────────
-- No hay ninguna política para `anon`: el visitante NUNCA toca Storage directo.

CREATE POLICY "documentos_equipo_sube" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND es_equipo()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "documentos_dueno_lee" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (es_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
  );

CREATE POLICY "documentos_dueno_reemplaza" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (es_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
  );

CREATE POLICY "documentos_dueno_borra" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (es_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
  );
