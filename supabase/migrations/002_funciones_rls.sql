-- ══════════════════════════════════════════════════════════════════════════════
-- 002_funciones_rls.sql — Funciones helper de RLS
--
-- Las tres son SECURITY DEFINER a propósito: consultan `perfiles`, que a su vez
-- tiene RLS. Sin SECURITY DEFINER, una política de `perfiles` que llame a
-- `es_admin()` entraría en recursión infinita. Al correr como el dueño de la
-- tabla, la RLS del usuario no aplica adentro y la recursión se corta.
--
-- `SET search_path = ''` + nombres calificados (`public.perfiles`): sin esto,
-- un search_path manipulado puede hacer que la función lea otra tabla. Es fácil
-- de olvidar y difícil de notar, así que va desde la primera función.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION es_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol = 'admin' AND activo = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION es_equipo() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol IN ('admin', 'colaborador') AND activo = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- ¿El documento lo subió quien está consultando? Se usa en las políticas de
-- `revisiones` para que un colaborador lea la evaluación de SU documento sin
-- ver las de los demás.
CREATE OR REPLACE FUNCTION es_mi_documento(doc_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documentos
    WHERE id = doc_id AND subido_por = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';
