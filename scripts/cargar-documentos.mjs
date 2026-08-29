#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// scripts/cargar-documentos.mjs — Carga masiva del acervo
//
// Sube de una vez un árbol de carpetas al repositorio: cada subcarpeta de
// primer nivel es una colección (007_colecciones_de_la_fundacion.sql) y cada
// archivo dentro de ella —a cualquier profundidad— entra como un documento.
//
//   node scripts/cargar-documentos.mjs "D:/ACERVO" --dry-run
//   node scripts/cargar-documentos.mjs "D:/ACERVO"
//
// ⚠️ Usa `service_role`, o sea que se salta la RLS. Es la excepción, no la
// regla, y por eso vive en un script de consola y no en la aplicación: lo corre
// un admin desde su máquina, una vez, con el acervo delante. La aplicación
// sigue subiendo archivo por archivo desde el navegador con la sesión de quien
// sube, que es donde la RLS tiene que decidir. Nada de esto se despliega.
//
// Es REPETIBLE: antes de subir cada archivo comprueba su SHA-256 contra los que
// ya están cargados, así que si se corta a mitad de camino se vuelve a correr y
// sigue donde iba, sin duplicar nada.
//
// Lo que deja es un punto de partida catalogado a medias: título, tipo,
// colección y archivo. El resumen, la autoría, el año y las etiquetas se
// completan después desde el panel, documento por documento — eso no lo puede
// adivinar un script leyendo nombres de archivo.
// ─────────────────────────────────────────────────────────────────────────────

import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

// ═══ Parte pura ══════════════════════════════════════════════════════════════
// Todo lo de este bloque entra un dato y sale otro, sin tocar disco ni red: es
// lo que `scripts/cargar-documentos.test.mjs` comprueba. Mismo criterio que
// `lib/` en la aplicación.

/** 50 MB — el `file_size_limit` del bucket en 005_storage.sql. */
export const MAX_BYTES = 52_428_800;

/**
 * Extensión → MIME. Es la inversa de `MIMES_PERMITIDOS` de
 * lib/documentos/archivos.ts, y tiene que seguir coincidiendo con la lista de
 * `allowed_mime_types` del bucket: Storage rechaza lo que no esté ahí.
 *
 * En el navegador el MIME lo pone el `File`; acá no hay navegador, así que sale
 * de la extensión. Es menos fiable, y por eso Storage vuelve a comprobarlo.
 */
export const MIMES_POR_EXTENSION = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  odt: "application/vnd.oasis.opendocument.text",
  epub: "application/epub+zip",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  mp4: "video/mp4",
};

/**
 * Carpetas que el sistema operativo deja tiradas y que no son acervo.
 * `LOST.DIR` la crea Android al recuperar una tarjeta SD; el resto son de
 * Windows y macOS.
 */
export const CARPETAS_DE_SISTEMA = [
  "LOST.DIR",
  "System Volume Information",
  "$RECYCLE.BIN",
  "RECYCLER",
  ".Trash",
  ".Trashes",
  ".Spotlight-V100",
  ".fseventsd",
  "FOUND.000",
];

/**
 * Qué colección le toca a cada carpeta, y con qué valores por defecto entran
 * sus documentos.
 *
 * `alias` existe porque el nombre de la carpeta y el de la colección no tienen
 * por qué coincidir: la carpeta puede venir con el nombre cortado, con una
 * grafía distinta («SAN BACILIO» por «San Basilio») o abreviada. Se comparan
 * normalizados y por prefijo, así que basta con que empiecen igual.
 *
 * `tipo` es obligatorio en `documentos` y no se puede deducir de un PDF, así
 * que se toma de la carpeta: lo que está en «CARTILLAS…» es una cartilla. Es
 * una suposición, y se corrige desde el panel cuando no aplique.
 */
export const COLECCIONES = [
  {
    slug: "cartilla-la-aventura-ancestral",
    alias: ["CARTILLA LA AVENTURA ANCESTRAL", "CARTILLAA LA AVENTURA ANCESTRAL"],
    tipo: "cartilla",
  },
  {
    slug: "cartillas-lengua-palenkera",
    alias: ["CARTILLAS LENGUA PALENKERA", "CARTILLAS LENGUA PALENQUERA"],
    tipo: "cartilla",
    comunidad: "San Basilio de Palenque",
    territorio: "Mahates, Bolívar",
  },
  {
    slug: "catedra-estudios-afrocolombianos",
    alias: ["CATEDRA DE ESTUDIOS AFRO", "CATEDRA ESTUDIOS AFRO", "CEA"],
    tipo: "otro",
  },
  {
    slug: "cuentos-afro-del-pacifico-colombiano",
    alias: ["CUENTOS AFRO DEL PACIFICO COLOMBIANO", "CUENTOS AFRO DEL PACIFICO"],
    tipo: "libro",
    territorio: "Pacífico colombiano",
  },
  {
    slug: "diaspora-africana",
    alias: ["DIASPORA AFRICANA"],
    tipo: "otro",
  },
  {
    slug: "etnoeducacion",
    alias: ["ETNOEDUCACION"],
    tipo: "otro",
  },
  {
    slug: "maleta-didactica",
    alias: ["MALETA DIDACTICA"],
    tipo: "cartilla",
  },
  {
    slug: "poemas",
    alias: ["POEMAS"],
    tipo: "libro",
  },
  {
    slug: "san-basilio-de-palenque",
    alias: ["SAN BASILIO DE PALENQUE", "SAN BACILIO DE PALENQUE"],
    tipo: "otro",
    comunidad: "San Basilio de Palenque",
    territorio: "Mahates, Bolívar",
  },
];

/** MAYÚSCULAS, sin tildes, sin signos, con un solo espacio entre palabras. */
export function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/**
 * La colección de una carpeta, o null si no la reconoce.
 *
 * Compara por prefijo en las dos direcciones porque el nombre real puede ser
 * más largo que el alias («CARTILLAS LENGUA PALENKERA 2024») o al revés, si el
 * alias se escribió completo y la carpeta viene abreviada. Exige 8 caracteres
 * de coincidencia para que un prefijo corto no case con cualquier cosa.
 */
export function coleccionDeCarpeta(nombreCarpeta, colecciones = COLECCIONES) {
  const carpeta = normalizar(nombreCarpeta);
  if (carpeta.length < 3) return null;

  for (const coleccion of colecciones) {
    for (const alias of coleccion.alias) {
      const normalizado = normalizar(alias);
      const minimo = Math.min(8, normalizado.length, carpeta.length);
      if (
        carpeta.slice(0, minimo) === normalizado.slice(0, minimo) &&
        (carpeta.startsWith(normalizado) || normalizado.startsWith(carpeta))
      ) {
        return coleccion;
      }
    }
  }
  return null;
}

// Se comparan normalizadas y no literales: `normalizar()` convierte el punto de
// «LOST.DIR» en espacio, así que buscar el nombre crudo en la lista no
// encontraría nunca nada. Se calcula una sola vez.
const SISTEMA_NORMALIZADAS = new Set(CARPETAS_DE_SISTEMA.map(normalizar));

/** ¿Es una carpeta que el sistema operativo dejó y hay que saltarse? */
export function esCarpetaDeSistema(nombre) {
  return SISTEMA_NORMALIZADAS.has(normalizar(nombre)) || nombre.startsWith(".");
}

export function mimeDeExtension(nombreArchivo) {
  const extension = extname(nombreArchivo).slice(1).toLowerCase();
  return MIMES_POR_EXTENSION[extension] ?? null;
}

/** Palabras que no se capitalizan dentro de un título, solo al principio. */
const MINUSCULAS = new Set([
  "a", "al", "con", "de", "del", "e", "el", "en", "la", "las", "lo", "los",
  "o", "para", "por", "sin", "sobre", "u", "un", "una", "unas", "unos", "y",
]);

/**
 * El título a partir del nombre del archivo.
 *
 * Quita la extensión, la numeración de orden con la que suelen venir
 * («01 - Cartilla.pdf») y los guiones bajos del escáner. Si el nombre viene
 * TODO EN MAYÚSCULAS —que es lo normal en un acervo digitalizado— lo pasa a
 * capitalización de título; si trae minúsculas, se respeta tal cual, porque
 * quien lo nombró ya decidió cómo se escribe.
 *
 * Es un punto de partida para catalogar, no el título definitivo: se corrige en
 * el panel, donde alguien lo está leyendo.
 */
export function tituloDesdeNombre(nombreArchivo) {
  const sinExtension = basename(nombreArchivo, extname(nombreArchivo));

  const limpio = sinExtension
    .replace(/[_]+/g, " ")
    .replace(/^\s*\d{1,3}\s*[-.)]\s*/, "") // «01 - », «3.», «12) »
    .replace(/\s+/g, " ")
    .trim();

  if (!limpio) return "Documento sin título";
  if (/[a-záéíóúñü]/.test(limpio)) return limpio; // ya tiene minúsculas: no se toca

  return limpio
    .toLowerCase()
    .split(" ")
    .map((palabra, i) =>
      i > 0 && MINUSCULAS.has(palabra)
        ? palabra
        : palabra.charAt(0).toUpperCase() + palabra.slice(1)
    )
    .join(" ");
}

const LARGO_MAXIMO_SLUG = 80;

/**
 * Mismo slug que `generarSlug` de lib/documentos/archivos.ts. Está duplicado
 * porque ese módulo es TypeScript y este script corre con `node` pelado, sin
 * compilar; el test comprueba que las dos implementaciones coincidan, para que
 * un cambio allá no genere slugs distintos acá.
 */
export function generarSlug(texto) {
  const base = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!base) return "documento";
  if (base.length <= LARGO_MAXIMO_SLUG) return base;

  const cortado = base.slice(0, LARGO_MAXIMO_SLUG);
  const ultimoGuion = cortado.lastIndexOf("-");
  return (ultimoGuion > 0 ? cortado.slice(0, ultimoGuion) : cortado).replace(/-+$/g, "");
}

export function slugUnico(base, ocupados) {
  const tomados = new Set(ocupados);
  if (!tomados.has(base)) return base;

  let n = 2;
  while (tomados.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export function formatearBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;

  const unidades = ["KB", "MB", "GB"];
  let valor = bytes / 1024;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i++;
  }
  return `${valor.toFixed(i === 0 ? 0 : 1)} ${unidades[i]}`;
}

/** `--estado=publicado --dry-run` → `{ estado: "publicado", "dry-run": true }` */
export function parsearOpciones(argv) {
  const opciones = {};
  const sueltos = [];

  for (const argumento of argv) {
    if (!argumento.startsWith("--")) {
      sueltos.push(argumento);
      continue;
    }
    const [clave, ...resto] = argumento.slice(2).split("=");
    opciones[clave] = resto.length ? resto.join("=") : true;
  }

  return { opciones, sueltos };
}

// ═══ Parte que toca disco y red ══════════════════════════════════════════════

const ESTADOS_VALIDOS = ["borrador", "en_revision", "publicado"];

/**
 * Carga .env.local y .env sin pisar lo que ya venga del entorno. Es un parser
 * mínimo a propósito: no hay dependencia de dotenv en el proyecto y acá solo
 * hacen falta tres variables.
 */
async function cargarEntorno() {
  for (const archivo of [".env.local", ".env"]) {
    let contenido;
    try {
      contenido = await readFile(archivo, "utf8");
    } catch {
      continue;
    }

    for (const linea of contenido.split("\n")) {
      const limpia = linea.trim();
      if (!limpia || limpia.startsWith("#")) continue;

      const igual = limpia.indexOf("=");
      if (igual <= 0) continue;

      const clave = limpia.slice(0, igual).trim();
      const valor = limpia.slice(igual + 1).trim().replace(/^["']|["']$/g, "");
      if (!(clave in process.env)) process.env[clave] = valor;
    }
  }
}

/**
 * Todos los archivos de una carpeta, entrando en las subcarpetas — un acervo
 * digitalizado casi nunca es plano: dentro de una colección hay carpetas por
 * cartilla, por módulo o por año, y todo eso pertenece a la misma colección.
 *
 * Se saltan las carpetas del sistema y los archivos ocultos. El orden es
 * alfabético en español para que el informe de la carga se pueda seguir contra
 * lo que muestra el explorador de archivos.
 *
 * Toca disco, así que el test lo ejercita con una carpeta temporal de verdad
 * en vez de simular `fs`: es lo que hace, y simularlo probaría el simulacro.
 */
export async function archivosDe(carpeta) {
  const entradas = await readdir(carpeta, { withFileTypes: true });
  const archivos = [];

  for (const entrada of entradas.sort((a, b) => a.name.localeCompare(b.name, "es"))) {
    const ruta = join(carpeta, entrada.name);

    if (entrada.isDirectory()) {
      if (esCarpetaDeSistema(entrada.name)) continue;
      archivos.push(...(await archivosDe(ruta)));
    } else if (entrada.isFile() && !entrada.name.startsWith(".")) {
      archivos.push(ruta);
    }
  }

  return archivos;
}

/** Los slugs ya usados. Paginado: PostgREST corta en 1000 filas por consulta. */
async function slugsExistentes(supabase) {
  const slugs = new Set();
  const tamano = 1000;

  for (let pagina = 0; ; pagina++) {
    const { data, error } = await supabase
      .from("documentos")
      .select("slug")
      .range(pagina * tamano, (pagina + 1) * tamano - 1);

    if (error) throw new Error(`No se pudieron leer los slugs: ${error.message}`);
    for (const fila of data) slugs.add(fila.slug);
    if (data.length < tamano) return slugs;
  }
}

/** El perfil dueño de la carga: el que se pida, o el único admin que haya. */
async function resolverPerfil(supabase, pedido) {
  if (pedido) {
    const { data } = await supabase
      .from("perfiles")
      .select("id, nombre, rol")
      .eq("id", pedido)
      .maybeSingle();

    if (!data) throw new Error(`No existe el perfil ${pedido} en la tabla perfiles.`);
    return data;
  }

  const { data, error } = await supabase
    .from("perfiles")
    .select("id, nombre, rol")
    .eq("rol", "admin")
    .eq("activo", true);

  if (error) throw new Error(`No se pudo leer perfiles: ${error.message}`);

  if (!data.length) {
    throw new Error(
      "No hay ningún admin activo en `perfiles`. Creá el primero como explica el README (§4) antes de cargar."
    );
  }
  if (data.length > 1) {
    const lista = data.map((p) => `  ${p.id}  ${p.nombre}`).join("\n");
    throw new Error(`Hay varios admin. Elegí uno con --perfil=<uuid>:\n${lista}`);
  }

  return data[0];
}

function ayuda() {
  console.log(`
Carga masiva del acervo al repositorio.

  node scripts/cargar-documentos.mjs <carpeta> [opciones]

La <carpeta> contiene una subcarpeta por colección. Los archivos sueltos en la
raíz se ignoran: todo documento entra dentro de una colección.

Opciones
  --dry-run           No sube ni escribe nada: solo dice qué haría. Corré esto
                      primero, siempre.
  --estado=<estado>   borrador | en_revision | publicado   (por defecto: borrador)
  --licencia=<lic>    Licencia de todo lo cargado (por defecto: con_permiso)
  --perfil=<uuid>     Perfil al que se le atribuye la carga. Por defecto, el
                      único admin activo.
  --solo=<carpeta>    Carga una sola subcarpeta.
  --limite=<n>        Corta después de n documentos. Útil para probar con 2 o 3.

Ejemplos
  node scripts/cargar-documentos.mjs "D:/ACERVO" --dry-run
  node scripts/cargar-documentos.mjs "D:/ACERVO" --solo=POEMAS --limite=3
  node scripts/cargar-documentos.mjs "D:/ACERVO" --estado=publicado
`);
}

async function principal() {
  const { opciones, sueltos } = parsearOpciones(process.argv.slice(2));

  // Sin carpeta no hay nada que hacer, y salir con 1 es lo que espera quien
  // encadena el comando. Pedir la ayuda a propósito, en cambio, no es un error.
  if (opciones.help || opciones.ayuda) {
    ayuda();
    return;
  }
  if (!sueltos.length) {
    ayuda();
    process.exit(1);
  }

  // `--estado` a secas queda como `true`, y seguir con eso significa cargar
  // doscientos documentos con el valor equivocado. Se corta acá.
  for (const clave of ["estado", "licencia", "perfil", "solo", "limite"]) {
    if (opciones[clave] === true) {
      throw new Error(`A --${clave} le falta el valor: --${clave}=algo`);
    }
  }

  const raiz = sueltos[0];
  const ensayo = Boolean(opciones["dry-run"]);
  const estado = opciones.estado ?? "borrador";
  const licencia = opciones.licencia ?? "con_permiso";
  const limite = opciones.limite ? Number(opciones.limite) : Infinity;

  if (!ESTADOS_VALIDOS.includes(estado)) {
    throw new Error(`--estado tiene que ser uno de: ${ESTADOS_VALIDOS.join(", ")}`);
  }

  if (!Number.isInteger(limite) && limite !== Infinity) {
    throw new Error("--limite tiene que ser un número entero.");
  }

  const informacion = await stat(raiz).catch(() => null);
  if (!informacion?.isDirectory()) throw new Error(`No existe la carpeta «${raiz}».`);

  await cargarEntorno();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Se leen de .env.local."
    );
  }

  const supabase = createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const perfil = await resolverPerfil(supabase, opciones.perfil);

  const { data: coleccionesEnBase, error: errorColecciones } = await supabase
    .from("colecciones")
    .select("id, slug, nombre");

  if (errorColecciones) {
    throw new Error(`No se pudieron leer las colecciones: ${errorColecciones.message}`);
  }

  const idPorSlug = new Map(coleccionesEnBase.map((c) => [c.slug, c.id]));
  const slugs = await slugsExistentes(supabase);

  console.log(`\n  Origen     ${raiz}`);
  console.log(`  Destino    ${url}`);
  console.log(`  Atribuido  ${perfil.nombre} (${perfil.rol})`);
  console.log(`  Estado     ${estado}${ensayo ? "\n  Modo       ENSAYO — no se escribe nada" : ""}\n`);

  const carpetas = (await readdir(raiz, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && !esCarpetaDeSistema(e.name))
    .filter((e) => !opciones.solo || normalizar(e.name).startsWith(normalizar(opciones.solo)))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const resumen = { cargados: 0, repetidos: 0, saltados: 0, fallidos: 0 };

  for (const carpeta of carpetas) {
    // Alcanzado el límite no queda nada por hacer: sin esto se seguirían
    // imprimiendo las carpetas siguientes como si fueran a cargarse.
    if (resumen.cargados >= limite) break;

    const coleccion = coleccionDeCarpeta(carpeta.name);

    if (!coleccion) {
      console.log(`  ⊘ ${carpeta.name}`);
      console.log(`    Sin colección asignada. Agregá su nombre en COLECCIONES, dentro de este script.\n`);
      continue;
    }

    const coleccionId = idPorSlug.get(coleccion.slug);
    if (!coleccionId) {
      console.log(`  ⊘ ${carpeta.name}`);
      console.log(`    Falta la colección «${coleccion.slug}»: aplicá la migración 007 primero.\n`);
      continue;
    }

    const archivos = await archivosDe(join(raiz, carpeta.name));
    const plural = archivos.length === 1 ? "archivo" : "archivos";
    console.log(`  ▸ ${carpeta.name} → ${coleccion.slug} (${archivos.length} ${plural})`);

    for (const ruta of archivos) {
      if (resumen.cargados >= limite) break;

      const nombre = basename(ruta);
      const mime = mimeDeExtension(nombre);

      if (!mime) {
        console.log(`      · ${nombre} — formato no aceptado, se salta`);
        resumen.saltados++;
        continue;
      }

      const contenido = await readFile(ruta);

      if (contenido.byteLength === 0 || contenido.byteLength > MAX_BYTES) {
        console.log(
          `      · ${nombre} — ${formatearBytes(contenido.byteLength)}, fuera del límite de ${formatearBytes(MAX_BYTES)}`
        );
        resumen.saltados++;
        continue;
      }

      const sha256 = createHash("sha256").update(contenido).digest("hex");

      const { data: yaEsta } = await supabase
        .from("documentos")
        .select("slug, estado")
        .eq("archivo_sha256", sha256)
        .maybeSingle();

      if (yaEsta) {
        console.log(`      · ${nombre} — ya está cargado (/documentos/${yaEsta.slug})`);
        resumen.repetidos++;
        continue;
      }

      const titulo = tituloDesdeNombre(nombre);
      const slug = slugUnico(generarSlug(titulo), slugs);
      const extension = extname(nombre).slice(1).toLowerCase();
      const rutaStorage = `${perfil.id}/${randomUUID()}.${extension}`;

      if (ensayo) {
        console.log(`      · ${titulo}  →  /documentos/${slug}  [${formatearBytes(contenido.byteLength)}]`);
        slugs.add(slug);
        resumen.cargados++;
        continue;
      }

      // El archivo primero, la ficha después: `archivo_ruta` es NOT NULL y
      // apuntar a algo que todavía no existe en Storage deja una ficha rota.
      const { error: errorSubida } = await supabase.storage
        .from("documentos")
        .upload(rutaStorage, contenido, { contentType: mime, upsert: false });

      if (errorSubida) {
        console.log(`      ✖ ${nombre} — no se pudo subir: ${errorSubida.message}`);
        resumen.fallidos++;
        continue;
      }

      const { error: errorFicha } = await supabase.from("documentos").insert({
        slug,
        titulo,
        tipo: coleccion.tipo,
        idioma: "es",
        licencia,
        comunidad: coleccion.comunidad ?? null,
        territorio: coleccion.territorio ?? null,
        coleccion_id: coleccionId,
        archivo_ruta: rutaStorage,
        archivo_nombre: nombre,
        archivo_bytes: contenido.byteLength,
        archivo_mime: mime,
        archivo_sha256: sha256,
        estado,
        subido_por: perfil.id,
        publicado_en: estado === "publicado" ? new Date().toISOString() : null,
      });

      if (errorFicha) {
        // Se retira el archivo recién subido: un objeto huérfano en Storage no
        // lo ve nadie, pero ocupa y confunde a quien mire el bucket después.
        await supabase.storage.from("documentos").remove([rutaStorage]);
        console.log(`      ✖ ${nombre} — no se pudo guardar la ficha: ${errorFicha.message}`);
        resumen.fallidos++;
        continue;
      }

      slugs.add(slug);
      resumen.cargados++;
      console.log(`      ✓ ${titulo}  →  /documentos/${slug}`);
    }

    console.log("");
  }

  console.log(
    `  ${ensayo ? "Se cargarían" : "Cargados"} ${resumen.cargados} · ` +
      `repetidos ${resumen.repetidos} · saltados ${resumen.saltados} · fallidos ${resumen.fallidos}\n`
  );

  if (!ensayo && resumen.cargados > 0 && estado !== "publicado") {
    console.log(
      `  Quedaron en «${estado}». Se publican desde el panel, uno por uno, después de\n` +
        `  completar autoría, año y resumen.\n`
    );
  }

  if (resumen.fallidos > 0) process.exitCode = 1;
}

// El script se puede importar desde el test sin que se ejecute la carga.
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  principal().catch((error) => {
    console.error(`\n  ✖ ${error.message}\n`);
    process.exit(1);
  });
}
