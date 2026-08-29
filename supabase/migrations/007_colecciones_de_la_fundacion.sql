-- ══════════════════════════════════════════════════════════════════════════════
-- 007_colecciones_de_la_fundacion.sql — Las colecciones del acervo real
--
-- 006_semilla.sql sembró nueve colecciones deducidas del marco legal y
-- curricular (Ley 70, Decreto 1122, Ley 1381). Eran un punto de partida, no el
-- archivo de la fundación — el propio README lo dejaba como pendiente antes de
-- producción. Esta migración las reemplaza por las carpetas que la fundación
-- tiene de verdad.
--
-- Se hacen tres cosas, en este orden:
--   1. Renombrar la que ya existía y significa lo mismo (Cátedra), conservando
--      su slug.
--   2. Insertar las ocho nuevas.
--   3. Desactivar —no borrar— las que no corresponden al acervo.
--
-- ⚠️ Los nombres se guardan en capitalización normal, no en MAYÚSCULAS como en
-- las carpetas: el nombre se pinta como título (`<h2>`) en la página pública, y
-- un título en mayúsculas sostenidas se lee peor y los lectores de pantalla lo
-- deletrean. El nombre de la carpeta es cómo está guardado el material; el
-- nombre de la colección es cómo lo lee quien consulta.
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 1. La que ya existía ─────────────────────────────────────────────────────
-- Misma colección, nombre más corto. El SLUG NO SE TOCA: es la URL pública
-- (/colecciones/catedra-estudios-afrocolombianos) y cambiarlo rompería todo
-- enlace ya compartido, que es justo lo que un repositorio no puede permitirse.
-- Por eso este slug es el único de los nueve que no calca su nombre.
UPDATE colecciones
SET nombre      = 'Cátedra de Estudios Afro',
    descripcion = 'Material para implementar la Cátedra de Estudios Afrocolombianos en el aula, obligatoria en todo el país desde el Decreto 1122 de 1998.',
    orden       = 30,
    activa      = true
WHERE slug = 'catedra-estudios-afrocolombianos';

-- ─── 2. Las nuevas ────────────────────────────────────────────────────────────
-- `orden` va de 10 en 10 siguiendo el orden alfabético en que la fundación ve
-- sus carpetas, y deja hueco para intercalar una colección nueva sin renumerar
-- las demás.
--
-- El ON CONFLICT hace la migración repetible: si se corre dos veces (o si una
-- colección se creó a mano desde el panel antes de aplicarla), actualiza en vez
-- de reventar contra el UNIQUE del slug.
INSERT INTO colecciones (slug, nombre, descripcion, orden) VALUES
  ('cartilla-la-aventura-ancestral',
   'Cartilla La Aventura Ancestral',
   'La cartilla La Aventura Ancestral y el material de apoyo que la acompaña.',
   10),

  ('cartillas-lengua-palenkera',
   'Cartillas de Lengua Palenkera',
   'Cartillas para la enseñanza de la lengua palenkera, la lengua criolla de San Basilio de Palenque.',
   20),

  ('cuentos-afro-del-pacifico-colombiano',
   'Cuentos Afro del Pacífico Colombiano',
   'Cuentos y relatos de la tradición oral del Pacífico colombiano, recogidos para llevarlos al aula.',
   40),

  ('diaspora-africana',
   'Diáspora Africana',
   'Historia y memoria de la trata trasatlántica, el cimarronaje y la construcción del pueblo negro, afrocolombiano, raizal y palenquero.',
   50),

  ('etnoeducacion',
   'Etnoeducación',
   'Fundamentos, normatividad y experiencias de la etnoeducación afrocolombiana: Ley 70 de 1993, Ley 115 de 1994, Decreto 804 de 1995 y lo que se ha hecho con ellos en la escuela.',
   60),

  ('maleta-didactica',
   'Maleta Didáctica',
   'Guías, secuencias y recursos listos para llevar al salón: la caja de herramientas del docente.',
   70),

  ('poemas',
   'Poemas',
   'Poesía afrocolombiana: décimas, versos y oralitura para leer y para trabajar en clase.',
   80),

  ('san-basilio-de-palenque',
   'San Basilio de Palenque',
   'Material sobre el primer pueblo libre de América: su historia, su lengua, sus kuagros y su declaratoria como Patrimonio de la Humanidad.',
   90)

ON CONFLICT (slug) DO UPDATE SET
  nombre      = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  orden       = EXCLUDED.orden,
  activa      = true;

-- ─── 3. Las que salen ─────────────────────────────────────────────────────────
-- Se DESACTIVAN, no se borran. Borrarlas dispararía el ON DELETE SET NULL de
-- `documentos.coleccion_id` y dejaría sin colección a cualquier documento que
-- ya estuviera dentro, sin forma de saber en cuál estaba. Desactivada, la
-- colección desaparece del público y del selector del panel (las dos consultas
-- filtran `activa = true`) pero la fila y sus vínculos siguen ahí, y volver
-- atrás es un UPDATE.
UPDATE colecciones
SET activa = false
WHERE slug IN (
  'normatividad-y-politica-publica',
  'historia-y-memoria',
  'lenguas-criollas',
  'tradicion-oral-y-saberes',
  'material-didactico',
  'territorio-y-consejos-comunitarios',
  'musicas-danzas-y-cuerpo',
  'investigacion-academica'
);

-- Si alguna de esas ocho YA tenía documentos, hay que mudarlos antes de que
-- queden en una colección invisible. Un ejemplo, comentado porque depende de
-- qué haya cargado:
--
--   UPDATE documentos
--   SET coleccion_id = (SELECT id FROM colecciones WHERE slug = 'diaspora-africana')
--   WHERE coleccion_id = (SELECT id FROM colecciones WHERE slug = 'historia-y-memoria');
--
-- Para ver si hace falta:
--
--   SELECT c.slug, c.activa, count(d.id) AS documentos
--   FROM colecciones c LEFT JOIN documentos d ON d.coleccion_id = c.id
--   GROUP BY c.slug, c.activa ORDER BY c.activa DESC, documentos DESC;
