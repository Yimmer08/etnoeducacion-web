// ─────────────────────────────────────────────────────────────────────────────
// lib/documentos/busqueda.ts — Filtros del buscador
//
// Los filtros viven en la URL, no en estado de React. Así una búsqueda es un
// enlace que se puede compartir con un profesor por WhatsApp, el botón «atrás»
// del navegador funciona, y la página se puede renderizar en el servidor.
//
// Todo lo de acá es puro: entra un URLSearchParams, sale un objeto tipado con
// los valores inválidos ya descartados. Nada de lo que venga de la URL se pasa
// a la consulta sin pasar antes por acá.
// ─────────────────────────────────────────────────────────────────────────────

import {
  NIVELES_EDUCATIVOS,
  TIPOS_DOCUMENTO,
  IDIOMAS,
  type NivelEducativo,
  type TipoDocumento,
} from "./tipos";

export const POR_PAGINA = 12;

export const ORDENES = ["recientes", "antiguos", "titulo", "descargas"] as const;
export type Orden = (typeof ORDENES)[number];

export const ETIQUETA_ORDEN: Record<Orden, string> = {
  recientes: "Más recientes",
  antiguos: "Más antiguos",
  titulo: "Título (A-Z)",
  descargas: "Más descargados",
};

export interface Filtros {
  q: string;
  tipo: TipoDocumento | null;
  coleccion: string | null;
  etiqueta: string | null;
  idioma: string | null;
  nivel: NivelEducativo | null;
  anioDesde: number | null;
  anioHasta: number | null;
  orden: Orden;
  pagina: number;
}

export const FILTROS_VACIOS: Filtros = {
  q: "",
  tipo: null,
  coleccion: null,
  etiqueta: null,
  idioma: null,
  nivel: null,
  anioDesde: null,
  anioHasta: null,
  orden: "recientes",
  pagina: 1,
};

/** Largo máximo de la consulta. Más allá no hay búsqueda razonable, solo ruido. */
const MAX_CONSULTA = 120;

/**
 * Deja el texto de búsqueda listo para `websearch_to_tsquery`.
 *
 * Se usa `websearch` y no `plainto`/`phrase` a propósito: es la única variante
 * que NUNCA lanza excepción con lo que sea que escriba una persona. Un
 * paréntesis suelto o un `&` en `plainto_tsquery` revienta la consulta entera
 * y la página cae con un 500 — con `websearch` se trata como texto y ya.
 */
export function normalizarConsulta(texto: string): string {
  return texto.replace(/\s+/g, " ").trim().slice(0, MAX_CONSULTA);
}

const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function leerSlug(valor: string | null): string | null {
  if (!valor) return null;
  const limpio = valor.trim().toLowerCase();
  return SLUG_VALIDO.test(limpio) ? limpio : null;
}

function leerEntero(valor: string | null, min: number, max: number): number | null {
  if (!valor) return null;
  const n = Number.parseInt(valor, 10);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

function leerDeLista<T extends string>(valor: string | null, lista: readonly T[]): T | null {
  if (!valor) return null;
  return (lista as readonly string[]).includes(valor) ? (valor as T) : null;
}

const CODIGOS_IDIOMA = IDIOMAS.map((i) => i.codigo);
const ANIO_MIN = 1500;
const ANIO_MAX = 2200;

/**
 * Lee los filtros de la URL. Cualquier valor que no sea válido se descarta en
 * silencio y queda en su valor por defecto: una URL manipulada a mano da un
 * listado sin ese filtro, nunca un error.
 */
export function leerFiltros(params: URLSearchParams): Filtros {
  let anioDesde = leerEntero(params.get("desde"), ANIO_MIN, ANIO_MAX);
  let anioHasta = leerEntero(params.get("hasta"), ANIO_MIN, ANIO_MAX);

  // Un rango al revés (2020–1990) no devuelve nada y parece que el buscador
  // está roto. Se voltea, que es lo que la persona quiso decir.
  if (anioDesde !== null && anioHasta !== null && anioDesde > anioHasta) {
    [anioDesde, anioHasta] = [anioHasta, anioDesde];
  }

  return {
    q: normalizarConsulta(params.get("q") ?? ""),
    tipo: leerDeLista(params.get("tipo"), TIPOS_DOCUMENTO),
    coleccion: leerSlug(params.get("coleccion")),
    etiqueta: leerSlug(params.get("etiqueta")),
    idioma: leerDeLista(params.get("idioma"), CODIGOS_IDIOMA),
    nivel: leerDeLista(params.get("nivel"), NIVELES_EDUCATIVOS),
    anioDesde,
    anioHasta,
    orden: leerDeLista(params.get("orden"), ORDENES) ?? "recientes",
    pagina: leerEntero(params.get("pagina"), 1, 1000) ?? 1,
  };
}

/**
 * El camino de vuelta: filtros → querystring, para armar los enlaces.
 * Omite todo lo que esté en su valor por defecto, para que la URL de un
 * listado sin filtros sea `/documentos` pelado y no `/documentos?q=&tipo=…`.
 */
export function filtrosAQuery(filtros: Partial<Filtros>): string {
  const p = new URLSearchParams();

  if (filtros.q) p.set("q", filtros.q);
  if (filtros.tipo) p.set("tipo", filtros.tipo);
  if (filtros.coleccion) p.set("coleccion", filtros.coleccion);
  if (filtros.etiqueta) p.set("etiqueta", filtros.etiqueta);
  if (filtros.idioma) p.set("idioma", filtros.idioma);
  if (filtros.nivel) p.set("nivel", filtros.nivel);
  if (filtros.anioDesde != null) p.set("desde", String(filtros.anioDesde));
  if (filtros.anioHasta != null) p.set("hasta", String(filtros.anioHasta));
  if (filtros.orden && filtros.orden !== "recientes") p.set("orden", filtros.orden);
  if (filtros.pagina && filtros.pagina > 1) p.set("pagina", String(filtros.pagina));

  return p.toString();
}

/** ¿Hay algo filtrando, o es el listado completo? Decide si se muestra «Limpiar filtros». */
export function hayFiltrosActivos(f: Filtros): boolean {
  return Boolean(
    f.q || f.tipo || f.coleccion || f.etiqueta || f.idioma || f.nivel ||
    f.anioDesde != null || f.anioHasta != null
  );
}

/** El rango de filas que le toca a una página, para `.range()` de PostgREST. */
export function rangoDePagina(pagina: number, porPagina = POR_PAGINA): { desde: number; hasta: number } {
  const p = Math.max(1, Math.floor(pagina));
  const desde = (p - 1) * porPagina;
  return { desde, hasta: desde + porPagina - 1 };
}

export function totalDePaginas(total: number, porPagina = POR_PAGINA): number {
  if (total <= 0) return 1;
  return Math.ceil(total / porPagina);
}

/** Columna y dirección para `.order()`, según el orden pedido. */
export function columnaDeOrden(orden: Orden): { columna: string; ascendente: boolean } {
  switch (orden) {
    case "antiguos":
      return { columna: "publicado_en", ascendente: true };
    case "titulo":
      return { columna: "titulo", ascendente: true };
    case "descargas":
      return { columna: "descargas", ascendente: false };
    case "recientes":
    default:
      return { columna: "publicado_en", ascendente: false };
  }
}
