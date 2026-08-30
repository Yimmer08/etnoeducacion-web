# Repositorio de Etnoeducación Afrocolombiana

Archivo digital de documentos para la fundación: consulta pública abierta,
carga y publicación controladas por un flujo de revisión.

Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase (Postgres, Auth,
Storage, RLS) + Vercel. Migraciones SQL numeradas, lógica pura testeada en
`lib/`, y cuatro pasos de CI antes de cada commit.

---

## Qué hace

**Para quien consulta** (sin cuenta, sin registro):

- Busca por título, autoría, resumen, comunidad, territorio y fuente — con
  búsqueda de texto completo en español y ponderación por campo.
- Filtra por tipo, colección, etiqueta, nivel educativo, idioma y rango de años.
- Lee el PDF en línea o lo descarga, según lo que permita su licencia.
- Copia la cita bibliográfica hecha.

**Para el equipo de la fundación** (con cuenta):

- **Colaborador**: sube documentos, llena su ficha, los manda a revisión y
  corrige lo que le devuelvan. No puede publicar.
- **Administrador**: además evalúa la cola de revisión con tres criterios,
  aprueba o devuelve con motivo escrito, gestiona colecciones y ve las
  estadísticas de uso.

### El flujo de trabajo

```
borrador ──enviar a revisión──▶ en_revision ──aprobar──▶ publicado
   ▲                              │  │                      │
   │                              │  └──rechazar──▶ rechazado
   │       ┌──solicitar cambios───┘                      │
   └───────┴──────────────corregir───────────────────────┘
                                                  publicado ⇄ archivado
```

Está escrito como datos en `lib/documentos/estados.ts`, no como cadenas de
`if`: la interfaz dibuja un botón por cada transición disponible, así que nunca
aparece una acción que el flujo no permite. La barrera real, de todos modos, es
la RLS — un colaborador no puede poner `estado = 'publicado'` ni llamando a la
API a mano.

---

## Puesta en marcha

### 1. Crear el proyecto de Supabase

**Un proyecto de Supabase propio, no compartido con otra app.** Compartir
instancia significa compartir tablas, bucket y políticas de RLS.

### 2. Aplicar las migraciones, en orden

```
supabase/migrations/001_esquema_inicial.sql        7 tablas
supabase/migrations/002_funciones_rls.sql          es_admin(), es_equipo(), es_mi_documento()
supabase/migrations/003_politicas_rls.sql          RLS en todas las tablas
supabase/migrations/004_busqueda_y_estadisticas.sql  texto completo + contadores
supabase/migrations/005_storage.sql                bucket privado + sus políticas
supabase/migrations/006_semilla.sql                vocabulario inicial, 26 etiquetas
supabase/migrations/007_colecciones_de_la_fundacion.sql  las 9 colecciones del acervo
```

Se pueden pegar en el SQL Editor de Supabase una por una. **En orden**: 003
depende de las funciones de 002, y 005 de las de 002 también.

### 3. Variables de entorno

Copiar `.env.example` a `.env.local` y llenarlo. Las tres primeras son
obligatorias; `ANALITICA_IP_SALT` se puede dejar para después (sin ella el
contador funciona, solo que sin deduplicar).

### 4. Crear el primer administrador

No hay registro público: las cuentas las crea un admin, y el primero hay que
sembrarlo a mano.

1. En Supabase → **Authentication → Users → Add user**, crear el usuario con su
   correo y contraseña.
2. Copiar su UUID y correr en el SQL Editor:

```sql
INSERT INTO perfiles (id, nombre, rol, organizacion)
VALUES ('<el-uuid-del-usuario>', 'Nombre Apellido', 'admin', 'Nombre de la fundación');
```

Sin la fila en `perfiles`, el usuario puede iniciar sesión pero `es_equipo()`
devuelve falso y no ve nada: la sesión de Auth y el perfil son dos cosas
distintas a propósito.

### 5. Correr

```bash
npm install
npm run dev
```

---

## Cargar el acervo de una vez

Subir doscientos PDF por el formulario del panel, de a uno, no es trabajo para
nadie. `scripts/cargar-documentos.mjs` sube un árbol de carpetas completo: cada
subcarpeta de primer nivel es una colección y cada archivo dentro de ella —a
cualquier profundidad— entra como un documento.

### 1. Ordenar las carpetas

Una carpeta por colección, con estos nombres. Se comparan sin tildes y sin
distinguir mayúsculas, y basta con que empiecen igual, así que
`CARTILLAS LENGUA PALENKERA 2024` también se reconoce:

| Carpeta                                | Colección                            |
| -------------------------------------- | ------------------------------------ |
| `CARTILLA LA AVENTURA ANCESTRAL`       | Cartilla La Aventura Ancestral       |
| `CARTILLAS LENGUA PALENKERA`           | Cartillas de Lengua Palenkera        |
| `CATEDRA DE ESTUDIOS AFRO`             | Cátedra de Estudios Afro             |
| `CUENTOS AFRO DEL PACIFICO COLOMBIANO` | Cuentos Afro del Pacífico Colombiano |
| `DIASPORA AFRICANA`                    | Diáspora Africana                    |
| `ETNOEDUCACION`                        | Etnoeducación                        |
| `MALETA DIDACTICA`                     | Maleta Didáctica                     |
| `POEMAS`                               | Poemas                               |
| `SAN BASILIO DE PALENQUE`              | San Basilio de Palenque              |

Lo que no esté en esa lista se informa y se salta, sin subir nada — no hay
manera de que una carpeta caiga en la colección equivocada por descuido. Para
sumar una carpeta nueva hay dos pasos: la colección en una migración y su
nombre en la constante `COLECCIONES` del script. Las carpetas que deja el
sistema operativo (`LOST.DIR`, `System Volume Information`, las ocultas) se
saltan solas.

Se aceptan PDF, Word, ODT, EPUB, imágenes, MP3, OGG, WAV y MP4, hasta 50 MB por
archivo — la misma lista del bucket (`005_storage.sql`). El resto se informa y
se salta.

### 2. Aplicar la migración 007

Sin ella no existen las colecciones y el script no tiene dónde poner nada. Se
pega en el SQL Editor de Supabase como las anteriores.

### 3. Ensayar

```bash
npm run cargar:acervo -- "D:/ACERVO" --dry-run
```

No sube ni escribe nada: dice qué haría, con qué título y en qué colección
quedaría cada archivo. **Correrlo siempre antes que la carga de verdad.**

### 4. Cargar

```bash
npm run cargar:acervo -- "D:/ACERVO"
```

Necesita `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en
`.env.local` (las lee de ahí solo). Los documentos entran en **borrador**, a
nombre del único admin activo; con `--estado=publicado` salen publicados
directo, sin pasar por la cola de revisión.

Se puede volver a correr cuantas veces haga falta: antes de subir cada archivo
compara su SHA-256 con lo que ya está cargado, así que si se corta a la mitad
—se cayó internet, se cerró la consola— se vuelve a lanzar y sigue donde iba,
sin duplicar nada.

| Opción             | Para qué                                            |
| ------------------ | --------------------------------------------------- |
| `--dry-run`        | Ensayo: no sube ni escribe nada.                     |
| `--estado=<e>`     | `borrador` (por defecto), `en_revision`, `publicado`. |
| `--licencia=<l>`   | Licencia de todo lo cargado (por defecto `con_permiso`). |
| `--perfil=<uuid>`  | A quién se le atribuye, si hay más de un admin.      |
| `--solo=<carpeta>` | Una sola colección.                                  |
| `--limite=<n>`     | Corta a los n documentos. Para probar con dos o tres. |

### 5. Completar las fichas

El script deja lo que se puede sacar de un nombre de archivo: título, tipo,
colección y el archivo. **La autoría, el año, el resumen y las etiquetas no las
puede adivinar** — se completan en el panel, documento por documento, en
`/panel/documentos`. Es la parte que necesita a alguien que conozca el material,
y es también la que hace que el buscador sirva: la búsqueda pondera título,
autoría y resumen, y un documento sin resumen aparece mucho menos.

Un apunte sobre el script: usa `service_role`, o sea que se salta la RLS. Es la
excepción y por eso vive en la consola y no en la aplicación — lo corre un admin
desde su máquina, una vez, con el acervo delante. La aplicación sigue subiendo
archivo por archivo con la sesión de quien sube, que es donde la RLS tiene que
decidir. Nada de esto se despliega a Vercel.

---

## Comandos

```bash
npm run dev               # desarrollo local
npm run build             # build de producción
npm run lint              # linter
npm run test              # 120 tests (vitest)
npm run check:migrations  # detecta números de migración duplicados

npm run cargar:acervo -- <carpeta> --dry-run   # carga masiva (ver más abajo)
```

Ojo con el `--` de `cargar:acervo`: sin él, npm se queda los argumentos en vez
de pasárselos al script. También se puede llamar directo:
`node scripts/cargar-documentos.mjs <carpeta> --dry-run`.

Los cuatro que corre el CI, en este orden: `check:migrations` → `lint` →
`test` → `build`. Correrlos en local antes de pedir un commit ahorra el viaje
de ida y vuelta.

---

## Decisiones que conviene conocer antes de tocar código

**El bucket de Storage es privado, aunque el repositorio sea público.** En el
bucket conviven los archivos publicados con los borradores y los rechazados; un
bucket público los expondría todos, porque Storage no sabe nada del `estado` de
la tabla. Todo archivo se entrega por `/api/documentos/[slug]/archivo`, que
primero comprueba contra la RLS y solo entonces firma una URL de 60 segundos.
**La RLS decide, la `service_role` ejecuta** — nunca al revés.

**El archivo lo sube el navegador directo a Supabase**, no la server action.
Una server action tiene un límite de cuerpo de 1 MB por defecto y acá se
aceptan hasta 50 MB. La RLS de Storage exige que la primera carpeta de la ruta
sea el id del perfil (`{perfil}/{uuid}.pdf`), así que nadie escribe en la
carpeta de otro.

**La búsqueda se mantiene por trigger, no por columna generada.**
`array_to_string(autores, ' ')` es `STABLE`, no `IMMUTABLE`, y Postgres rechaza
cualquier expresión no inmutable en una columna generada. Buscar por autor es
justo lo que más se usa en un repositorio.

**Los filtros viven en la URL, no en estado de React.** Una búsqueda es un
enlace que se comparte por WhatsApp, el botón «atrás» funciona y la página se
renderiza en el servidor. El formulario de filtros es un `<form method="get">`
de toda la vida: funciona sin JavaScript.

**La IP nunca se guarda en claro.** El contador de vistas y descargas guarda un
HMAC-SHA256 con sal del servidor, que solo sirve para no contar dos veces el
mismo clic. Es HMAC y no SHA256 pelado porque el espacio IPv4 completo se
revierte con una tabla precalculada en horas.

**No se toca el `slug` al editar.** Cambiarlo rompería todo enlace ya
compartido, que en un repositorio es exactamente lo que no puede pasar.

**«Archivar» antes que «borrar».** Archivar saca el documento del público sin
perder el archivo ni sus estadísticas. El borrado definitivo existe, es solo de
admin, y casi nunca es lo que se quiere.

---

## Mapa del código

```
app/
  page.tsx                       portada
  documentos/                    listado con filtros + ficha de cada documento
  colecciones/                   listado + página de cada colección
  acceso/                        login (solo equipo)
  acerca/                        qué es, cómo entra un documento, licencias, privacidad
  panel/                         subir · documentos · cola de revisión · estadísticas
  api/documentos/[slug]/archivo  entrega del archivo (URL firmada + contador)

lib/
  fundacion/config.ts            nombre, correo, dominio — el ÚNICO archivo con datos de marca
  supabase/                      cliente de navegador, de servidor y de service_role
  auth/sesion.ts                 quién está mirando
  documentos/
    tipos.ts                     catálogos y tipos del dominio
    estados.ts                   flujo de trabajo (máquina de estados)      ← testeado
    archivos.ts                  validación, rutas de Storage, slugs        ← testeado
    busqueda.ts                  filtros de la URL                          ← testeado
    validacion.ts                esquemas Zod del formulario                ← testeado
    citacion.ts                  autores, cita, licencias, formatos         ← testeado
    consultas.ts                 lectura del repositorio público
    acciones.ts                  server actions del panel
  analitica/ip.ts                hash de IP                                 ← testeado

public/
  portada-africa.jpeg             fondo de la portada (ver abajo)

supabase/migrations/             el esquema, en orden
```

### Cambiar el fondo de la portada

La franja añil de la portada lleva de fondo `public/portada-africa.jpeg`.
Cambiar la imagen es reemplazar ese archivo: no hay ninguna ruta escrita en
otro lado.

Dos cosas que conviene respetar al elegir el reemplazo:

- **Oscura y con el motivo hacia la derecha.** El texto va sobre la mitad
  izquierda, que un velo de añil cubre casi por completo; el degradado se abre
  hacia la derecha, y ahí es donde la imagen se ve. Un fondo claro no rompe
  nada —el velo lo sostiene— pero desaprovecha la mitad que sí se ve.
- **JPG antes que PNG.** Es una fotografía con textura: en PNG pesa varias
  veces más sin verse mejor. Next la vuelve a comprimir y sirve AVIF o WebP
  según el navegador, pero parte de lo que se le entregue.

Si el archivo falta, la portada se queda en añil plano —el color de la marca— y
no se ve ningún hueco ni ícono de imagen rota.

---

## Pendiente antes de salir a producción

1. **El nombre real de la fundación.** Está como marcador de posición en
   `lib/fundacion/config.ts` (`nombre`, `nombreCorto`, `correo`, `ciudad`) — y
   solo ahí. Ningún componente escribe el nombre a mano.
2. **La paleta**, si la fundación tiene manual de marca. Vive completa en
   `app/globals.css`; ningún componente escribe un color a mano.
3. **Revisar las 26 etiquetas** de `006_semilla.sql` con quien conozca el
   acervo. Salen del marco legal y curricular colombiano (Ley 70 de 1993,
   Decreto 1122 de 1998, Ley 1381 de 2010), pero el archivo real de cada
   fundación tiene sus propios énfasis. Las colecciones ya se revisaron: las
   nueve de `007_colecciones_de_la_fundacion.sql` son las carpetas reales de la
   fundación, y las del vocabulario inicial quedaron desactivadas.
4. **Decidir la política de retención** de `eventos_documento`: hoy crece sin
   límite. La vista de estadísticas solo mira 90 días, así que un borrado
   periódico de lo más viejo no le quita nada a nadie.

## Cómo trabajar en este repositorio

- Ninguna tarea se desarrolla directo sobre `main`. Cada una en su rama
  (`feature/…`, `fix/…`) y termina en un Pull Request.
- Antes de cada commit, correr los cuatro pasos del CI en local:
  `npm run check:migrations && npm run lint && npm run test && npm run build`.
  Ahorra el viaje de ida y vuelta.
- **Las migraciones no se editan después de aplicarse.** Si algo cambia, se
  agrega otra con el número siguiente. `npm run check:migrations` falla si dos
  ramas eligieron el mismo número — la última en llegar a `main` cede el suyo.
- Los mensajes de commit siguen [Conventional Commits](https://www.conventionalcommits.org/es/)
  (`feat:`, `fix:`, `docs:`, `refactor:`…).

## Licencia del código

Pendiente de decidir. Mientras no haya un archivo `LICENSE`, el código es «todos
los derechos reservados» por defecto — que probablemente no es lo que se quiere
para un proyecto de archivo abierto. Si la idea es que otras fundaciones puedan
reusarlo, agregar una licencia permisiva (MIT) o copyleft (AGPL-3.0, que obliga
a compartir las mejoras incluso si solo se despliega como servicio web).

Esto es sobre el CÓDIGO. La licencia de cada DOCUMENTO del repositorio es cosa
aparte, vive en su ficha y no cambia por esto.
