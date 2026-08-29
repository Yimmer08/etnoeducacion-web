// ─────────────────────────────────────────────────────────────────────────────
// lib/documentos/archivos.ts — Nombres, rutas y validación de archivos
//
// Todo lo de acá es puro (entra un dato, sale otro) para poder testearlo sin
// Storage ni navegador. Es el criterio de todo `lib/`: la lógica que se puede
// equivocar vive separada del componente que la usa.
// ─────────────────────────────────────────────────────────────────────────────

/** 50 MB — el mismo `file_size_limit` del bucket en 005_storage.sql. */
export const MAX_BYTES = 52_428_800;

/**
 * MIME permitidos, con las extensiones que les corresponden.
 *
 * Se comprueban las DOS cosas —tipo declarado y extensión— porque cada una se
 * puede falsear por su lado: el `type` de un `File` lo pone el navegador
 * adivinando, y la extensión la pone quien renombró el archivo. Que coincidan
 * no prueba nada por sí solo, pero descarta el caso torpe de un `.exe`
 * renombrado a `.pdf`. La validación de verdad la hace Storage con su propia
 * lista de `allowed_mime_types`.
 */
export const MIMES_PERMITIDOS: Record<string, readonly string[]> = {
  "application/pdf": ["pdf"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.oasis.opendocument.text": ["odt"],
  "application/epub+zip": ["epub"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "audio/mpeg": ["mp3"],
  "audio/ogg": ["ogg"],
  "audio/wav": ["wav"],
  "video/mp4": ["mp4"],
};

export interface ArchivoCandidato {
  nombre: string;
  bytes: number;
  mime: string;
}

export type ResultadoValidacion = { ok: true } | { ok: false; motivo: string };

/** La extensión en minúsculas, sin punto. Cadena vacía si no tiene. */
export function extensionDe(nombre: string): string {
  const limpio = nombre.trim();
  const punto = limpio.lastIndexOf(".");
  // `punto <= 0` cubre "sin-extension" y ".oculto" (que no tiene extensión,
  // tiene nombre que empieza por punto).
  if (punto <= 0 || punto === limpio.length - 1) return "";
  return limpio.slice(punto + 1).toLowerCase();
}

export function validarArchivo(archivo: ArchivoCandidato): ResultadoValidacion {
  if (archivo.bytes <= 0) {
    return { ok: false, motivo: "El archivo está vacío." };
  }

  if (archivo.bytes > MAX_BYTES) {
    return {
      ok: false,
      motivo: `El archivo pesa ${formatearBytes(archivo.bytes)} y el máximo son ${formatearBytes(MAX_BYTES)}.`,
    };
  }

  const extensionesDelMime = MIMES_PERMITIDOS[archivo.mime];
  if (!extensionesDelMime) {
    return {
      ok: false,
      motivo: `El formato «${archivo.mime || "desconocido"}» no se acepta. Se aceptan PDF, Word, ODT, EPUB, imágenes, audio y video MP4.`,
    };
  }

  const extension = extensionDe(archivo.nombre);
  if (!extensionesDelMime.includes(extension)) {
    return {
      ok: false,
      motivo: `La extensión «.${extension || "(ninguna)"}» no corresponde al formato ${archivo.mime}.`,
    };
  }

  return { ok: true };
}

/**
 * Ruta dentro del bucket: `{id del perfil}/{uuid}.{ext}`.
 *
 * La primera carpeta tiene que ser el id de quien sube porque la RLS de
 * Storage compara justamente `(storage.foldername(name))[1]` contra
 * `auth.uid()` (005_storage.sql). Si esto cambia de forma, la subida empieza a
 * fallar con un 403 y el motivo no se ve por ningún lado.
 *
 * El nombre original NO se usa como nombre de archivo: llega con espacios,
 * tildes y a veces con el nombre de una persona. Se guarda aparte, en
 * `documentos.archivo_nombre`, y es el que se le ofrece a quien descarga.
 */
export function rutaEnStorage(perfilId: string, nombreOriginal: string, uuid: string): string {
  const extension = extensionDe(nombreOriginal);
  return extension ? `${perfilId}/${uuid}.${extension}` : `${perfilId}/${uuid}`;
}

/** Bytes en algo que una persona pueda leer. */
export function formatearBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;

  const unidades = ["KB", "MB", "GB"];
  let valor = bytes / 1024;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i++;
  }
  // Un decimal a partir de MB; en KB el decimal no aporta nada.
  return `${valor.toFixed(i === 0 ? 0 : 1)} ${unidades[i]}`;
}

export function esPdf(mime: string): boolean {
  return mime === "application/pdf";
}

/** ¿Se puede mostrar dentro del navegador sin descargarlo? */
export function seVeEnLinea(mime: string): boolean {
  return esPdf(mime) || mime.startsWith("image/") || mime.startsWith("audio/") || mime === "video/mp4";
}

// ─── Slugs ────────────────────────────────────────────────────────────────────

const LARGO_MAXIMO_SLUG = 80;

/**
 * Convierte un título en slug: minúsculas, sin tildes, sin signos, con guiones.
 *
 * Corta en el último guion antes del límite en vez de cortar a la mitad de una
 * palabra: `ley-70-de-1993-comunidades` es mejor que `ley-70-de-1993-comuni`.
 */
export function generarSlug(texto: string): string {
  const base = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // los acentos que NFD dejó sueltos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!base) return "documento";
  if (base.length <= LARGO_MAXIMO_SLUG) return base;

  const cortado = base.slice(0, LARGO_MAXIMO_SLUG);
  const ultimoGuion = cortado.lastIndexOf("-");
  return (ultimoGuion > 0 ? cortado.slice(0, ultimoGuion) : cortado).replace(/-+$/g, "");
}

/**
 * Un slug que no choque con los que ya existen. `titulo`, `titulo-2`,
 * `titulo-3`… La base de datos tiene un UNIQUE encima igual: esto evita el
 * error, no lo reemplaza (dos personas guardando a la vez siguen pudiendo
 * chocar, y ahí manda el UNIQUE).
 */
export function slugUnico(base: string, ocupados: Iterable<string>): string {
  const tomados = new Set(ocupados);
  if (!tomados.has(base)) return base;

  let n = 2;
  while (tomados.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
