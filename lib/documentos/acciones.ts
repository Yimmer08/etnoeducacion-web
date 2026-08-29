"use server";

// ─────────────────────────────────────────────────────────────────────────────
// lib/documentos/acciones.ts — Server actions del panel
//
// Todas comparten la misma forma:
//   1. Comprobar quién es (perfilActual).
//   2. Validar los datos con Zod — otra vez, aunque el formulario ya validó.
//   3. Escribir con el cliente de SESIÓN, para que la RLS tenga la última
//      palabra. Ninguna de estas funciones usa service_role.
//
// Los pasos 1 y 2 son para dar un mensaje decente. El que de verdad impide un
// escritura indebida es el 3: si un colaborador manda `estado: "publicado"`
// llamando a la acción a mano, la política `documentos_colaborador_edita` de
// la migración 003 rechaza la fila.
// ─────────────────────────────────────────────────────────────────────────────

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { perfilActual } from "@/lib/auth/sesion";
import { generarSlug, slugUnico } from "./archivos";
import { camposDeTransicion, puedeTransicionar, type AccionFlujo } from "./estados";
import { erroresPorCampo, esquemaDocumento, esquemaRevision } from "./validacion";
import type { EstadoDocumento } from "./tipos";

export interface Resultado {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string>;
  slug?: string;
  id?: string;
}

/** Los slugs ya tomados que empiezan por la misma base, para no chocar. */
async function slugDisponible(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>,
  titulo: string
): Promise<string> {
  const base = generarSlug(titulo);

  const { data } = await supabase
    .from("documentos")
    .select("slug")
    .like("slug", `${base}%`);

  return slugUnico(base, (data ?? []).map((f: { slug: string }) => f.slug));
}

/**
 * Guarda la ficha de un documento cuyo archivo YA está en Storage.
 *
 * El archivo lo sube el navegador directo a Supabase (ver
 * components/panel/FormularioSubida.tsx). No pasa por acá a propósito: una
 * server action tiene un límite de cuerpo de 1 MB por defecto, y un PDF
 * escaneado de 30 MB ni se acerca. Además evita que el mismo archivo viaje dos
 * veces (navegador → servidor → Storage).
 */
export async function crearDocumento(
  entrada: unknown,
  archivo: { ruta: string; nombre: string; bytes: number; mime: string; sha256: string | null }
): Promise<Resultado> {
  const perfil = await perfilActual();
  if (!perfil) return { ok: false, mensaje: "Tu sesión expiró. Volvé a entrar." };

  const validado = esquemaDocumento.safeParse(entrada);
  if (!validado.success) {
    return { ok: false, mensaje: "Revisá los campos marcados.", errores: erroresPorCampo(validado.error) };
  }

  // La ruta tiene que empezar por el id de quien sube: es lo que comprueba la
  // RLS de Storage. Si no coincide, el archivo se subió a la carpeta de otro
  // (o el cliente la manipuló) y la ficha no se crea.
  if (!archivo.ruta.startsWith(`${perfil.id}/`)) {
    return { ok: false, mensaje: "La ruta del archivo no corresponde a tu cuenta." };
  }

  const supabase = await crearClienteServidor();
  const { etiquetas, ...campos } = validado.data;
  const slug = await slugDisponible(supabase, campos.titulo);

  const fila = {
    ...campos,
    archivo_ruta: archivo.ruta,
    archivo_nombre: archivo.nombre,
    archivo_bytes: archivo.bytes,
    archivo_mime: archivo.mime,
    archivo_sha256: archivo.sha256,
    estado: "borrador" as const,
    subido_por: perfil.id,
  };

  let { data, error } = await supabase
    .from("documentos")
    .insert({ ...fila, slug })
    .select("id, slug")
    .single();

  // Dos índices únicos distintos devuelven el mismo código 23505, y confundirlos
  // le da a quien sube un mensaje que no tiene nada que ver con su problema:
  //
  //   · sha256  → el archivo YA está cargado. No hay nada que reintentar.
  //   · slug    → otro documento se llama parecido. Y acá está el detalle: la
  //               RLS le oculta a un colaborador los borradores de los demás,
  //               así que `slugDisponible()` no puede ver todos los slugs
  //               ocupados y elige uno que sí lo está. No es culpa de quien
  //               sube, y se arregla solo reintentando con otro sufijo.
  if (error?.code === "23505") {
    const chocaElArchivo = (error.message ?? "").includes("sha256");

    if (chocaElArchivo) {
      return {
        ok: false,
        mensaje: "Ese archivo ya está en el repositorio. Buscalo antes de volver a subirlo.",
      };
    }

    ({ data, error } = await supabase
      .from("documentos")
      .insert({ ...fila, slug: `${slug}-${Date.now().toString(36).slice(-4)}` })
      .select("id, slug")
      .single());
  }

  if (error || !data) {
    return { ok: false, mensaje: "No se pudo guardar el documento." };
  }

  await vincularEtiquetas(supabase, data.id, etiquetas);

  revalidatePath("/panel/documentos");
  return { ok: true, id: data.id, slug: data.slug };
}

export async function actualizarDocumento(id: string, entrada: unknown): Promise<Resultado> {
  const perfil = await perfilActual();
  if (!perfil) return { ok: false, mensaje: "Tu sesión expiró. Volvé a entrar." };

  const validado = esquemaDocumento.safeParse(entrada);
  if (!validado.success) {
    return { ok: false, mensaje: "Revisá los campos marcados.", errores: erroresPorCampo(validado.error) };
  }

  const supabase = await crearClienteServidor();
  const { etiquetas, ...campos } = validado.data;

  // No se toca `slug` al editar: cambiarlo rompería todo enlace ya compartido
  // al documento, que en un repositorio es justamente lo que no puede pasar.
  const { data, error } = await supabase
    .from("documentos")
    .update(campos)
    .eq("id", id)
    .select("id, slug")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, mensaje: "No se pudo guardar. Puede que ya no tengas permiso de editarlo." };
  }

  await vincularEtiquetas(supabase, id, etiquetas);

  revalidatePath("/panel/documentos");
  revalidatePath(`/documentos/${data.slug}`);
  return { ok: true, id: data.id, slug: data.slug };
}

/** Reemplaza las etiquetas del documento por las que llegaron. */
async function vincularEtiquetas(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>,
  documentoId: string,
  slugs: string[]
): Promise<void> {
  await supabase.from("documento_etiquetas").delete().eq("documento_id", documentoId);
  if (slugs.length === 0) return;

  const { data: etiquetas } = await supabase.from("etiquetas").select("id, slug").in("slug", slugs);
  if (!etiquetas?.length) return;

  await supabase.from("documento_etiquetas").insert(
    etiquetas.map((e: { id: string }) => ({ documento_id: documentoId, etiqueta_id: e.id }))
  );
}

/**
 * Mueve un documento por el flujo. Es la ÚNICA forma de cambiar `estado`:
 * ninguna otra acción escribe esa columna.
 *
 * Cuando la acción es una decisión de revisión (aprobar / rechazar /
 * solicitar cambios) se registra además la evaluación en `revisiones`, con los
 * criterios. Ese historial no se borra nunca, aunque el documento vuelva a
 * pasar por la cola más adelante.
 */
export async function ejecutarTransicion(
  id: string,
  accion: AccionFlujo,
  evaluacion?: { comentario?: string | null; crit_pertinencia?: number | null; crit_calidad?: number | null; crit_metadatos?: number | null }
): Promise<Resultado> {
  const perfil = await perfilActual();
  if (!perfil) return { ok: false, mensaje: "Tu sesión expiró. Volvé a entrar." };

  const supabase = await crearClienteServidor();

  const { data: documento } = await supabase
    .from("documentos")
    .select("id, slug, estado, subido_por, publicado_en")
    .eq("id", id)
    .maybeSingle();

  if (!documento) return { ok: false, mensaje: "El documento no existe o no podés verlo." };

  const doc = documento as {
    slug: string;
    estado: EstadoDocumento;
    subido_por: string | null;
    publicado_en: string | null;
  };

  const contexto = { rol: perfil.rol, esAutor: doc.subido_por === perfil.id };

  if (!puedeTransicionar(doc.estado, accion, contexto)) {
    return {
      ok: false,
      mensaje: `No se puede «${accion}» un documento que está en «${doc.estado}».`,
    };
  }

  // La evaluación se guarda ANTES de mover el estado. Si el UPDATE falla, queda
  // una revisión registrada de un documento que no se movió — molesto pero
  // inocuo. Al revés, un documento publicado sin constancia de quién lo aprobó
  // rompe la trazabilidad, que es la razón de ser de la tabla `revisiones`.
  const esDecision =
    accion === "aprobar" || accion === "rechazar" || accion === "solicitar_cambios";

  if (esDecision) {
    const decision =
      accion === "aprobar" ? "aprobado" : accion === "rechazar" ? "rechazado" : "cambios_solicitados";

    const validada = esquemaRevision.safeParse({
      documento_id: id,
      decision,
      comentario: evaluacion?.comentario ?? null,
      crit_pertinencia: evaluacion?.crit_pertinencia ?? null,
      crit_calidad: evaluacion?.crit_calidad ?? null,
      crit_metadatos: evaluacion?.crit_metadatos ?? null,
    });

    if (!validada.success) {
      return {
        ok: false,
        mensaje: "Falta el motivo de la decisión.",
        errores: erroresPorCampo(validada.error),
      };
    }

    const { error: errorRevision } = await supabase
      .from("revisiones")
      .insert({ ...validada.data, revisor_id: perfil.id });

    if (errorRevision) {
      return { ok: false, mensaje: "No se pudo registrar la evaluación." };
    }
  }

  const campos = camposDeTransicion(accion, {
    revisorId: perfil.id,
    ahora: new Date(),
    publicadoEnPrevio: doc.publicado_en,
  });

  if (!campos) return { ok: false, mensaje: "Acción desconocida." };

  const { error } = await supabase.from("documentos").update(campos).eq("id", id);

  if (error) {
    return { ok: false, mensaje: "No se pudo cambiar el estado del documento." };
  }

  revalidatePath("/panel/documentos");
  revalidatePath("/panel/revision");
  revalidatePath(`/documentos/${doc.slug}`);
  revalidatePath("/documentos");
  return { ok: true, slug: doc.slug };
}

/**
 * Borrado definitivo, solo admin (lo impone la RLS). Borra la fila y el
 * archivo. Para sacar algo del público SIN perderlo está «archivar», que es lo
 * que se debería usar casi siempre.
 */
export async function eliminarDocumento(id: string): Promise<Resultado> {
  const perfil = await perfilActual();
  if (perfil?.rol !== "admin") return { ok: false, mensaje: "Solo un administrador puede borrar." };

  const supabase = await crearClienteServidor();

  const { data: documento } = await supabase
    .from("documentos")
    .select("archivo_ruta")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("documentos").delete().eq("id", id);
  if (error) return { ok: false, mensaje: "No se pudo borrar el documento." };

  // El archivo se borra DESPUÉS de la fila: si se hiciera al revés y el DELETE
  // fallara, quedaría una ficha apuntando a un archivo que ya no existe.
  // Que sobre un archivo huérfano en Storage es el error barato de los dos.
  if (documento?.archivo_ruta) {
    await supabase.storage.from("documentos").remove([documento.archivo_ruta]);
  }

  revalidatePath("/panel/documentos");
  revalidatePath("/documentos");
  return { ok: true };
}
