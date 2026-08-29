// ─────────────────────────────────────────────────────────────────────────────
// lib/documentos/citacion.ts — Cómo se muestra y se cita un documento
//
// Un repositorio que no da la cita hecha obliga a cada profesor a armarla a
// mano, y ahí es donde se pierde la autoría. Estas funciones son lo que
// convierte los metadatos en algo que se puede pegar en un trabajo.
// ─────────────────────────────────────────────────────────────────────────────

import { extensionDe } from "./archivos";
import { LICENCIA_INFO, type Licencia } from "./tipos";

/**
 * Lista de autores en texto. A partir de `maximo` corta con «y otros»
 * (el «et al.» de toda la vida, en español porque el sitio es en español).
 */
export function formatearAutores(autores: readonly string[], maximo = 3): string {
  const limpios = autores.map((a) => a.trim()).filter(Boolean);

  if (limpios.length === 0) return "Sin autoría registrada";
  if (limpios.length === 1) return limpios[0];

  if (limpios.length > maximo) {
    return `${limpios.slice(0, maximo).join(", ")} y otros`;
  }

  const ultimo = limpios[limpios.length - 1];
  return `${limpios.slice(0, -1).join(", ")} y ${ultimo}`;
}

export interface DatosCita {
  titulo: string;
  subtitulo?: string | null;
  autores: readonly string[];
  anio?: number | null;
  fuente?: string | null;
  slug: string;
}

/**
 * Cita en un formato cercano a APA, sin pretender ser APA exacto: se arma con
 * lo que haya y omite en silencio lo que falte, en vez de dejar «(s.f.)» y
 * corchetes vacíos por todos lados.
 */
export function citaTexto(doc: DatosCita, urlBase?: string): string {
  const partes: string[] = [];

  partes.push(formatearAutores(doc.autores, 3));
  partes.push(doc.anio ? `(${doc.anio}).` : "(s. f.).");

  const titulo = doc.subtitulo ? `${doc.titulo}: ${doc.subtitulo}` : doc.titulo;
  partes.push(`${titulo}.`);

  if (doc.fuente) partes.push(`${doc.fuente}.`);
  if (urlBase) partes.push(`${urlBase.replace(/\/$/, "")}/documentos/${doc.slug}`);

  // El primer elemento ya trae su propio punto solo si el autor terminaba en
  // punto (ej. «Pérez, J.»); si no, se lo agrega acá.
  const cita = partes.join(" ");
  return cita.replace(/^(.+?)(?<!\.)\s\(/, "$1. (");
}

/** Nombre con el que se le ofrece el archivo a quien descarga. */
export function nombreDescarga(slug: string, nombreOriginal: string): string {
  const ext = extensionDe(nombreOriginal);
  return ext ? `${slug}.${ext}` : slug;
}

/** Texto corto de la licencia para la ficha, con enlace cuando es Creative Commons. */
export function enlaceLicencia(licencia: Licencia): string | null {
  const rutas: Partial<Record<Licencia, string>> = {
    cc_by: "by/4.0/deed.es",
    cc_by_sa: "by-sa/4.0/deed.es",
    cc_by_nc: "by-nc/4.0/deed.es",
    cc_by_nc_sa: "by-nc-sa/4.0/deed.es",
  };
  const ruta = rutas[licencia];
  return ruta ? `https://creativecommons.org/licenses/${ruta}` : null;
}

/** ¿Se ofrece el botón de descarga, o solo la consulta en línea? */
export function permiteDescargaDirecta(licencia: Licencia): boolean {
  return LICENCIA_INFO[licencia].redistribuible;
}

/** Fecha en español, sin la hora — que en una ficha bibliográfica no aporta. */
export function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Bogota",
  }).format(fecha);
}

/** Números con separador de miles colombiano (1.234), para los contadores. */
export function formatearNumero(n: number): string {
  return new Intl.NumberFormat("es-CO").format(n);
}
