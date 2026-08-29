// ─────────────────────────────────────────────────────────────────────────────
// lib/documentos/estados.ts — El flujo de trabajo de carga y publicación
//
//   borrador ──enviar a revisión──▶ en_revision ──aprobar──▶ publicado
//      ▲                              │  │                      │
//      │                              │  └──rechazar──▶ rechazado
//      │       ┌──solicitar cambios───┘                      │
//      └───────┴──────────────corregir───────────────────────┘
//                                                     publicado ⇄ archivado
//
// Está escrito como DATOS y no como una cadena de `if`, por dos razones:
//   1. La interfaz dibuja los botones recorriendo `transicionesDisponibles()`.
//      No hay forma de que aparezca un botón que el flujo no permite.
//   2. Se puede testear entero sin base de datos ni navegador.
//
// ⚠️ Esto NO es la barrera de seguridad. La barrera es la RLS de
// 003_politicas_rls.sql, que impide que un colaborador ponga `estado =
// 'publicado'` aunque llame a la API a mano. Lo de acá es para que la interfaz
// no le ofrezca acciones que el servidor va a rechazar.
// ─────────────────────────────────────────────────────────────────────────────

import type { EstadoDocumento, Rol } from "./tipos";

export const ACCIONES = [
  "enviar_a_revision",
  "aprobar",
  "solicitar_cambios",
  "rechazar",
  "retirar",
  "corregir",
  "archivar",
  "restaurar",
] as const;
export type AccionFlujo = (typeof ACCIONES)[number];

/** Quién puede ejecutar una acción. */
type Autoridad = "solo_admin" | "autor_o_admin";

export interface Transicion {
  accion: AccionFlujo;
  desde: readonly EstadoDocumento[];
  hacia: EstadoDocumento;
  autoridad: Autoridad;
  /** Texto del botón. */
  etiqueta: string;
  /** Qué le pasa al documento, en una línea, para el tooltip. */
  descripcion: string;
  /** Si es true, la interfaz pide un comentario antes de ejecutar. */
  exigeComentario: boolean;
}

export const TRANSICIONES: readonly Transicion[] = [
  {
    accion: "enviar_a_revision",
    desde: ["borrador"],
    hacia: "en_revision",
    autoridad: "autor_o_admin",
    etiqueta: "Enviar a revisión",
    descripcion: "Queda en la cola para que un administrador lo evalúe.",
    exigeComentario: false,
  },
  {
    accion: "retirar",
    desde: ["en_revision"],
    hacia: "borrador",
    autoridad: "autor_o_admin",
    etiqueta: "Retirar de la cola",
    descripcion: "Vuelve a borrador para seguir editándolo.",
    exigeComentario: false,
  },
  {
    accion: "aprobar",
    desde: ["en_revision"],
    hacia: "publicado",
    autoridad: "solo_admin",
    etiqueta: "Aprobar y publicar",
    descripcion: "Queda visible para cualquier visitante del repositorio.",
    exigeComentario: false,
  },
  {
    accion: "solicitar_cambios",
    desde: ["en_revision"],
    hacia: "borrador",
    autoridad: "solo_admin",
    etiqueta: "Solicitar cambios",
    descripcion: "Vuelve a quien lo subió, con el comentario de qué corregir.",
    exigeComentario: true,
  },
  {
    accion: "rechazar",
    desde: ["en_revision"],
    hacia: "rechazado",
    autoridad: "solo_admin",
    etiqueta: "Rechazar",
    descripcion: "No entra al repositorio. Queda el motivo registrado.",
    exigeComentario: true,
  },
  {
    accion: "corregir",
    desde: ["rechazado"],
    hacia: "borrador",
    autoridad: "autor_o_admin",
    etiqueta: "Retomar y corregir",
    descripcion: "Reabre el documento como borrador para trabajarlo de nuevo.",
    exigeComentario: false,
  },
  {
    accion: "archivar",
    desde: ["publicado", "borrador", "rechazado"],
    hacia: "archivado",
    autoridad: "solo_admin",
    etiqueta: "Archivar",
    descripcion: "Sale del repositorio público sin borrarse ni perder sus estadísticas.",
    exigeComentario: false,
  },
  {
    accion: "restaurar",
    desde: ["archivado"],
    hacia: "publicado",
    autoridad: "solo_admin",
    etiqueta: "Restaurar",
    // Ojo con el `hacia`: es el caso normal (se archivó algo publicado), pero
    // camposDeTransicion() lo baja a «borrador» si el documento nunca llegó a
    // publicarse. Ver el comentario de esa función.
    descripcion:
      "Deshace el archivado. Vuelve a ser visible si ya estaba publicado; si nunca lo estuvo, vuelve a borrador.",
    exigeComentario: false,
  },
];

export interface ContextoUsuario {
  rol: Rol;
  /** ¿Quien mira es quien subió el documento? */
  esAutor: boolean;
}

function tieneAutoridad(t: Transicion, ctx: ContextoUsuario): boolean {
  if (ctx.rol === "admin") return true;
  return t.autoridad === "autor_o_admin" && ctx.esAutor;
}

/**
 * Las acciones que esta persona puede ejecutar sobre un documento en este
 * estado. La interfaz dibuja un botón por cada una y ninguno más.
 */
export function transicionesDisponibles(
  estado: EstadoDocumento,
  ctx: ContextoUsuario
): Transicion[] {
  return TRANSICIONES.filter((t) => t.desde.includes(estado) && tieneAutoridad(t, ctx));
}

export function puedeTransicionar(
  estado: EstadoDocumento,
  accion: AccionFlujo,
  ctx: ContextoUsuario
): boolean {
  return transicionesDisponibles(estado, ctx).some((t) => t.accion === accion);
}

export function buscarTransicion(accion: AccionFlujo): Transicion | undefined {
  return TRANSICIONES.find((t) => t.accion === accion);
}

/**
 * Los campos que hay que escribir en `documentos` al ejecutar una acción.
 *
 * `publicado_en` se pone la PRIMERA vez que se publica y no se vuelve a tocar
 * al restaurar un archivado: si se reescribiera, un documento de 2024 que se
 * archivó y se restauró hoy saldría de primero en «lo más reciente», que es
 * exactamente lo que no queremos. El constraint
 * `documentos_publicado_con_fecha` obliga a que exista, así que al restaurar
 * hay que pasar la fecha original — de ahí el parámetro.
 */
export function camposDeTransicion(
  accion: AccionFlujo,
  opciones: { revisorId: string; ahora: Date; publicadoEnPrevio?: string | null }
): {
  estado: EstadoDocumento;
  revisado_por: string | null;
  revisado_en: string | null;
  publicado_en?: string;
} | null {
  const t = buscarTransicion(accion);
  if (!t) return null;

  const iso = opciones.ahora.toISOString();

  // «Archivar» se puede hacer sobre un borrador o un rechazado, no solo sobre
  // un publicado. Si «restaurar» los mandara a todos a `publicado`, archivar y
  // restaurar sería un atajo para publicar SIN pasar por revisión y sin dejar
  // registro en `revisiones` — justo lo que el flujo existe para impedir.
  // Restaurar deshace el archivado y nada más: devuelve el documento a donde
  // estaba.
  if (accion === "restaurar") {
    return opciones.publicadoEnPrevio
      ? {
          estado: "publicado",
          revisado_por: null,
          revisado_en: null,
          publicado_en: opciones.publicadoEnPrevio,
        }
      : { estado: "borrador", revisado_por: null, revisado_en: null };
  }

  const esDecisionDeAdmin =
    accion === "aprobar" || accion === "rechazar" || accion === "solicitar_cambios";

  const base = {
    estado: t.hacia,
    revisado_por: esDecisionDeAdmin ? opciones.revisorId : null,
    revisado_en: esDecisionDeAdmin ? iso : null,
  };

  if (t.hacia === "publicado") {
    return { ...base, publicado_en: opciones.publicadoEnPrevio ?? iso };
  }

  return base;
}

// ─── Espejo de la RLS, para la interfaz ───────────────────────────────────────
// Repiten en TypeScript lo que 003_politicas_rls.sql ya impone en la base. No
// sustituyen a la RLS: sirven para no mostrar un formulario de edición que al
// guardar va a devolver error.

export function puedeEditar(
  doc: { estado: EstadoDocumento; subido_por: string | null },
  ctx: ContextoUsuario
): boolean {
  if (ctx.rol === "admin") return true;
  if (!ctx.esAutor) return false;
  return doc.estado === "borrador" || doc.estado === "en_revision" || doc.estado === "rechazado";
}

export function puedeVer(
  doc: { estado: EstadoDocumento; subido_por: string | null },
  ctx: ContextoUsuario | null
): boolean {
  if (doc.estado === "publicado") return true;
  if (!ctx) return false;
  return ctx.rol === "admin" || ctx.esAutor;
}

/** ¿Este documento sale en el repositorio público? */
export function esPublico(estado: EstadoDocumento): boolean {
  return estado === "publicado";
}
