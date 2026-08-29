-- ══════════════════════════════════════════════════════════════════════════════
-- 006_semilla.sql — Colecciones y etiquetas iniciales
--
-- Solo el vocabulario, ningún documento: los documentos entran por el panel,
-- con su archivo real. Sembrar fichas sin archivo dejaría filas rotas
-- (`archivo_ruta` es NOT NULL y apuntaría a algo que no existe en Storage).
--
-- Las colecciones salen del marco legal y curricular colombiano de la
-- etnoeducación afro; se pueden renombrar o desactivar desde el panel sin tocar
-- código. `activa = false` la esconde del público sin borrar sus documentos.
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO colecciones (slug, nombre, descripcion, orden) VALUES
  ('catedra-estudios-afrocolombianos',
   'Cátedra de Estudios Afrocolombianos',
   'Material para implementar la CEA en el aula, obligatoria en todo el país desde el Decreto 1122 de 1998.',
   10),

  ('normatividad-y-politica-publica',
   'Normatividad y política pública',
   'Ley 70 de 1993, Ley 115 de 1994, Decreto 804 de 1995, Decreto 1122 de 1998, Ley 1381 de 2010 y demás marco legal de la etnoeducación.',
   20),

  ('historia-y-memoria',
   'Historia y memoria',
   'Diáspora africana, cimarronaje, palenques y la construcción histórica del pueblo negro, afrocolombiano, raizal y palenquero.',
   30),

  ('lenguas-criollas',
   'Lenguas criollas',
   'Palenquero de San Basilio y creole sanandresano: gramáticas, cartillas y material de enseñanza de las dos lenguas criollas de Colombia.',
   40),

  ('tradicion-oral-y-saberes',
   'Tradición oral y saberes ancestrales',
   'Oralitura, décimas, alabaos, arrullos, medicina tradicional y conocimiento transmitido de generación en generación.',
   50),

  ('material-didactico',
   'Material didáctico',
   'Guías de clase, secuencias didácticas, cartillas y recursos listos para llevar al salón.',
   60),

  ('territorio-y-consejos-comunitarios',
   'Territorio y consejos comunitarios',
   'Titulación colectiva, planes de etnodesarrollo y gobierno propio de los consejos comunitarios.',
   70),

  ('musicas-danzas-y-cuerpo',
   'Músicas, danzas y cuerpo',
   'Currulao, marimba de chonta, bullerengue, mapalé, champeta y las prácticas corporales como vehículo pedagógico.',
   80),

  ('investigacion-academica',
   'Investigación académica',
   'Tesis, artículos e informes de investigación sobre etnoeducación afrocolombiana.',
   90);

INSERT INTO etiquetas (slug, nombre) VALUES
  ('catedra-afro',            'Cátedra Afro'),
  ('ley-70',                  'Ley 70 de 1993'),
  ('decreto-1122',            'Decreto 1122 de 1998'),
  ('etnoeducacion',           'Etnoeducación'),
  ('tradicion-oral',          'Tradición oral'),
  ('palenquero',              'Palenquero'),
  ('creole-sanandresano',     'Creole sanandresano'),
  ('san-basilio-de-palenque', 'San Basilio de Palenque'),
  ('raizal',                  'Raizal'),
  ('cimarronaje',             'Cimarronaje'),
  ('consejo-comunitario',     'Consejo comunitario'),
  ('pacifico-colombiano',     'Pacífico colombiano'),
  ('caribe-colombiano',       'Caribe colombiano'),
  ('currulao',                'Currulao'),
  ('marimba-de-chonta',       'Marimba de chonta'),
  ('bullerengue',             'Bullerengue'),
  ('alabaos',                 'Alabaos'),
  ('medicina-tradicional',    'Medicina tradicional'),
  ('gastronomia',             'Gastronomía'),
  ('mujeres-afro',            'Mujeres afro'),
  ('juventud',                'Juventud'),
  ('primera-infancia',        'Primera infancia'),
  ('formacion-docente',       'Formación docente'),
  ('curriculo',               'Currículo'),
  ('racismo-estructural',     'Racismo estructural'),
  ('ancestralidad',           'Ancestralidad');
