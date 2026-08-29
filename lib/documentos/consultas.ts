// ─────────────────────────────────────────────────────────────────────────────
// lib/documentos/consultas.ts — Lectura del repositorio público
//
// Todas usan el cliente de SESIÓN, no el de service_role. Es a propósito: así
// la RLS es la que decide qué filas salen. Un visitante anónimo ve lo
// publicado; el mismo código, con la sesión de un colaborador, le devuelve
// además sus borradores, sin una sola línea de `if` extra.
//
// El único `.eq("estado", "publicado")` explícito está en las consultas del
// sitio público, y es redundante con la RLS a propósito: si algún día una
// política se afloja por error, el sitio público sigue mostrando solo lo
// publicado. Dos cierres para la misma puerta.
// ─────────────────────────────────────────────────────────────────────────────

import { crearClienteServidor } from "@/lib/supabase/server";
import { columnaDeOrden, rangoDePagina, type Filtros } from "./busqueda";
import type { Coleccion, Documento, Etiqueta } from "./tipos";

/** Columnas de la tarjeta de un listado — sin `resumen` ni rutas de archivo. */
const CAMPOS_TARJETA =
  "id, slug, titulo, subtitulo, autores, anio, tipo, idioma, archivo_mime, archivo_bytes, " +
  "portada_url, licencia, publicado_en, descargas, vistas, coleccion_id";

export interface ResultadoBusqueda {
  documentos: DocumentoTarjeta[];
  total: number;
}

export type DocumentoTarjeta = Pick<
  Documento,
  | "id" | "slug" | "titulo" | "subtitulo" | "autores" | "anio" | "tipo" | "idioma"
  | "archivo_mime" | "archivo_bytes" | "portada_url" | "licencia" | "publicado_en"
  | "descargas" | "vistas" | "coleccion_id"
>;

export async function buscarDocumentos(filtros: Filtros): Promise<ResultadoBusqueda> {
  const supabase = await crearClienteServidor();

  // El select cambia según los filtros porque los JOIN de PostgREST son parte
  // del select: `!inner` convierte el LEFT JOIN en INNER y sirve de filtro.
  // Sin filtro de etiqueta no se pide el join, para no traerse la tabla puente
  // de cada fila.
  let select = CAMPOS_TARJETA;
  if (filtros.etiqueta) {
    select += ", documento_etiquetas!inner(etiquetas!inner(slug))";
  }
  if (filtros.coleccion) {
    select += ", colecciones!inner(slug)";
  }

  let consulta = supabase
    .from("documentos")
    .select(select, { count: "exact" })
    .eq("estado", "publicado");

  if (filtros.q) {
    // `websearch` no lanza excepción con lo que sea que escriba una persona
    // (ver normalizarConsulta en busqueda.ts).
    consulta = consulta.textSearch("busqueda", filtros.q, {
      type: "websearch",
      config: "spanish",
    });
  }

  if (filtros.tipo) consulta = consulta.eq("tipo", filtros.tipo);
  if (filtros.idioma) consulta = consulta.eq("idioma", filtros.idioma);
  if (filtros.nivel) consulta = consulta.eq("nivel_educativo", filtros.nivel);
  if (filtros.anioDesde != null) consulta = consulta.gte("anio", filtros.anioDesde);
  if (filtros.anioHasta != null) consulta = consulta.lte("anio", filtros.anioHasta);
  if (filtros.coleccion) consulta = consulta.eq("colecciones.slug", filtros.coleccion);
  if (filtros.etiqueta) {
    consulta = consulta.eq("documento_etiquetas.etiquetas.slug", filtros.etiqueta);
  }

  const { columna, ascendente } = columnaDeOrden(filtros.orden);
  const { desde, hasta } = rangoDePagina(filtros.pagina);

  const { data, error, count } = await consulta
    .order(columna, { ascending: ascendente, nullsFirst: false })
    // Desempate estable: sin esto, dos documentos publicados el mismo día
    // pueden cambiar de orden entre una página y la siguiente, y uno se
    // repite mientras otro no aparece nunca.
    .order("id", { ascending: true })
    .range(desde, hasta);

  if (error) {
    console.error("[consultas] buscarDocumentos:", error.message);
    return { documentos: [], total: 0 };
  }

  return {
    documentos: (data ?? []) as unknown as DocumentoTarjeta[],
    total: count ?? 0,
  };
}

export interface DocumentoConRelaciones extends Documento {
  colecciones: Pick<Coleccion, "slug" | "nombre"> | null;
  etiquetas: Etiqueta[];
}

/**
 * La ficha completa. Devuelve `null` si no existe O si la RLS no deja verlo —
 * los dos casos se tratan igual a propósito: decir «existe pero no podés
 * verlo» le confirma a un desconocido que ese slug existe.
 */
export async function documentoPorSlug(slug: string): Promise<DocumentoConRelaciones | null> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase
    .from("documentos")
    .select("*, colecciones(slug, nombre), documento_etiquetas(etiquetas(id, slug, nombre))")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;

  // PostgREST devuelve un OBJETO en un embed muchos-a-uno (`colecciones`) y un
  // ARRAY en uno-a-muchos (`documento_etiquetas`). Sin tipos generados,
  // supabase-js los tipa todos como array — leer `colecciones[0]` compila
  // perfecto y en runtime siempre da undefined — y como los fixtures de los
  // tests suelen copiar la forma del TIPO y no la de la respuesta real, tampoco
  // lo atrapan. Por eso se normaliza acá y no se lee el embed en crudo.
  const fila = data as Record<string, unknown>;
  const coleccionCruda = fila.colecciones;
  const colecciones = Array.isArray(coleccionCruda)
    ? ((coleccionCruda[0] ?? null) as DocumentoConRelaciones["colecciones"])
    : ((coleccionCruda ?? null) as DocumentoConRelaciones["colecciones"]);

  const vinculos = (fila.documento_etiquetas ?? []) as Array<{ etiquetas: Etiqueta | Etiqueta[] | null }>;
  const etiquetas = vinculos
    .map((v) => (Array.isArray(v.etiquetas) ? v.etiquetas[0] : v.etiquetas))
    .filter((e): e is Etiqueta => Boolean(e));

  return { ...(data as unknown as Documento), colecciones, etiquetas };
}

export async function listarColecciones(): Promise<Coleccion[]> {
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("colecciones")
    .select("id, slug, nombre, descripcion, orden, activa")
    .eq("activa", true)
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });

  return (data ?? []) as Coleccion[];
}

export async function coleccionPorSlug(slug: string): Promise<Coleccion | null> {
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("colecciones")
    .select("id, slug, nombre, descripcion, orden, activa")
    .eq("slug", slug)
    .maybeSingle();

  return (data as Coleccion) ?? null;
}

/**
 * Cuántos documentos publicados tiene cada colección, para las tarjetas.
 *
 * Se trae una fila por documento y se cuenta acá, en vez de hacer una consulta
 * `count` por colección (serían 9 viajes en vez de 1). Es la decisión correcta
 * para el tamaño de este repositorio, pero tiene un techo: PostgREST corta en
 * su `max-rows` (1000 por defecto en Supabase), así que pasado ese número los
 * conteos empiezan a quedarse cortos. Cuando llegue ese día, se cambia por una
 * vista materializada con el conteo por colección.
 */
export async function conteoPorColeccion(): Promise<Record<string, number>> {
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("documentos")
    .select("coleccion_id")
    .eq("estado", "publicado");

  const conteo: Record<string, number> = {};
  for (const fila of (data ?? []) as Array<{ coleccion_id: string | null }>) {
    if (fila.coleccion_id) conteo[fila.coleccion_id] = (conteo[fila.coleccion_id] ?? 0) + 1;
  }
  return conteo;
}

export async function listarEtiquetas(): Promise<Etiqueta[]> {
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("etiquetas")
    .select("id, slug, nombre")
    .order("nombre", { ascending: true });

  return (data ?? []) as Etiqueta[];
}

/** Los últimos publicados, para la portada. */
export async function documentosRecientes(limite = 6): Promise<DocumentoTarjeta[]> {
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("documentos")
    .select(CAMPOS_TARJETA)
    .eq("estado", "publicado")
    .order("publicado_en", { ascending: false, nullsFirst: false })
    .limit(limite);

  return (data ?? []) as unknown as DocumentoTarjeta[];
}

export async function totalPublicados(): Promise<number> {
  const supabase = await crearClienteServidor();

  const { count } = await supabase
    .from("documentos")
    .select("id", { count: "exact", head: true })
    .eq("estado", "publicado");

  return count ?? 0;
}
