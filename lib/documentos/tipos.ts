// ─────────────────────────────────────────────────────────────────────────────
// lib/documentos/tipos.ts — Tipos y catálogos del dominio
//
// Los catálogos de acá son la MISMA lista que los CHECK constraints de
// 001_esquema_inicial.sql. Si se agrega un tipo de documento o una licencia,
// hay que tocar los dos lados: acá para la interfaz, y una migración nueva
// para el constraint. `lib/documentos/tipos.test.ts` no puede comprobar eso
// (no habla con la base), así que queda escrito acá.
// ─────────────────────────────────────────────────────────────────────────────

export const ESTADOS = [
  "borrador",
  "en_revision",
  "publicado",
  "rechazado",
  "archivado",
] as const;
export type EstadoDocumento = (typeof ESTADOS)[number];

export const TIPOS_DOCUMENTO = [
  "libro",
  "cartilla",
  "articulo",
  "tesis",
  "normativa",
  "informe",
  "audio",
  "video",
  "fotografia",
  "otro",
] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const LICENCIAS = [
  "cc_by",
  "cc_by_sa",
  "cc_by_nc",
  "cc_by_nc_sa",
  "dominio_publico",
  "con_permiso",
  "derechos_reservados",
] as const;
export type Licencia = (typeof LICENCIAS)[number];

export const DECISIONES_REVISION = [
  "aprobado",
  "cambios_solicitados",
  "rechazado",
] as const;
export type DecisionRevision = (typeof DECISIONES_REVISION)[number];

export type Rol = "admin" | "colaborador";

/**
 * Idiomas que se ofrecen al catalogar. Incluye las dos lenguas criollas de
 * Colombia — el palenquero (`pln`) y el creole sanandresano (`icr`) — con sus
 * códigos ISO 639-3 reales, no inventados: son parte del objeto de este
 * repositorio y meterlas dentro de «otro» sería borrarlas del buscador.
 */
export const IDIOMAS: ReadonlyArray<{ codigo: string; nombre: string }> = [
  { codigo: "es", nombre: "Español" },
  { codigo: "pln", nombre: "Palenquero" },
  { codigo: "icr", nombre: "Creole sanandresano" },
  { codigo: "en", nombre: "Inglés" },
  { codigo: "fr", nombre: "Francés" },
  { codigo: "pt", nombre: "Portugués" },
  { codigo: "mul", nombre: "Multilingüe" },
];

export const NIVELES_EDUCATIVOS = [
  "primera_infancia",
  "primaria",
  "secundaria",
  "media",
  "superior",
  "formacion_docente",
  "comunitario",
] as const;
export type NivelEducativo = (typeof NIVELES_EDUCATIVOS)[number];

// ─── Etiquetas legibles ───────────────────────────────────────────────────────

export const ETIQUETA_ESTADO: Record<EstadoDocumento, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  publicado: "Publicado",
  rechazado: "Rechazado",
  archivado: "Archivado",
};

export const ETIQUETA_TIPO: Record<TipoDocumento, string> = {
  libro: "Libro",
  cartilla: "Cartilla",
  articulo: "Artículo",
  tesis: "Tesis",
  normativa: "Normativa",
  informe: "Informe",
  audio: "Audio",
  video: "Video",
  fotografia: "Fotografía",
  otro: "Otro",
};

export const ETIQUETA_NIVEL: Record<NivelEducativo, string> = {
  primera_infancia: "Primera infancia",
  primaria: "Básica primaria",
  secundaria: "Básica secundaria",
  media: "Media",
  superior: "Educación superior",
  formacion_docente: "Formación docente",
  comunitario: "Comunitario",
};

/**
 * Licencias con su nombre y si permiten redistribuir. `redistribuible` es lo
 * que decide si la ficha muestra el botón de descarga directa o solo el visor:
 * un documento «con permiso» del autor se puede consultar, pero no se ofrece
 * como archivo para repartir.
 */
export const LICENCIA_INFO: Record<
  Licencia,
  { nombre: string; corto: string; redistribuible: boolean }
> = {
  cc_by: { nombre: "Creative Commons Atribución", corto: "CC BY", redistribuible: true },
  cc_by_sa: {
    nombre: "Creative Commons Atribución-CompartirIgual",
    corto: "CC BY-SA",
    redistribuible: true,
  },
  cc_by_nc: {
    nombre: "Creative Commons Atribución-NoComercial",
    corto: "CC BY-NC",
    redistribuible: true,
  },
  cc_by_nc_sa: {
    nombre: "Creative Commons Atribución-NoComercial-CompartirIgual",
    corto: "CC BY-NC-SA",
    redistribuible: true,
  },
  dominio_publico: { nombre: "Dominio público", corto: "Dominio público", redistribuible: true },
  con_permiso: {
    nombre: "Publicado con permiso del autor",
    corto: "Con permiso",
    redistribuible: false,
  },
  derechos_reservados: {
    nombre: "Todos los derechos reservados",
    corto: "Derechos reservados",
    redistribuible: false,
  },
};

export const ETIQUETA_DECISION: Record<DecisionRevision, string> = {
  aprobado: "Aprobado",
  cambios_solicitados: "Cambios solicitados",
  rechazado: "Rechazado",
};

// ─── Formas de fila ───────────────────────────────────────────────────────────

export interface Documento {
  id: string;
  slug: string;
  titulo: string;
  subtitulo: string | null;
  resumen: string | null;
  autores: string[];
  anio: number | null;
  idioma: string;
  tipo: TipoDocumento;
  comunidad: string | null;
  territorio: string | null;
  nivel_educativo: NivelEducativo | null;
  fuente: string | null;
  isbn_issn: string | null;
  licencia: Licencia;
  archivo_ruta: string;
  archivo_nombre: string;
  archivo_bytes: number;
  archivo_mime: string;
  archivo_sha256: string | null;
  paginas: number | null;
  portada_url: string | null;
  coleccion_id: string | null;
  estado: EstadoDocumento;
  subido_por: string | null;
  revisado_por: string | null;
  revisado_en: string | null;
  publicado_en: string | null;
  vistas: number;
  descargas: number;
  creado_en: string;
  actualizado_en: string;
}

export interface Coleccion {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activa: boolean;
}

export interface Etiqueta {
  id: string;
  slug: string;
  nombre: string;
}

export interface Perfil {
  id: string;
  nombre: string;
  rol: Rol;
  organizacion: string | null;
  activo: boolean;
}

export interface Revision {
  id: string;
  documento_id: string;
  revisor_id: string | null;
  decision: DecisionRevision;
  comentario: string | null;
  crit_pertinencia: number | null;
  crit_calidad: number | null;
  crit_metadatos: number | null;
  creado_en: string;
}
