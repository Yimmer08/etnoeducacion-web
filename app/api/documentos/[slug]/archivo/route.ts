// ─────────────────────────────────────────────────────────────────────────────
// GET /api/documentos/[slug]/archivo — Entrega del archivo
//
// El bucket es privado (005_storage.sql), así que nadie llega al archivo por
// una URL de Storage. Se pasa siempre por acá, y acá el orden importa:
//
//   1. Se busca el documento con el cliente de SESIÓN → la RLS decide. Un
//      visitante anónimo solo encuentra los publicados; quien lo subió
//      encuentra además el suyo en borrador.
//   2. Solo si el paso 1 devolvió algo se usa el cliente de service_role para
//      firmar la URL.
//
// La RLS decide, la service_role ejecuta. Al revés —firmar primero y
// comprobar después— es como se filtran los borradores.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { hashDeCabeceras } from "@/lib/analitica/ip";
import { nombreDescarga, permiteDescargaDirecta } from "@/lib/documentos/citacion";
import type { Licencia } from "@/lib/documentos/tipos";

/** La URL firmada dura lo justo para que el navegador la siga. */
const SEGUNDOS_DE_VIGENCIA = 60;

const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const dynamic = "force-dynamic";

export async function GET(
  peticion: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!SLUG_VALIDO.test(slug)) {
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }

  const enLinea = peticion.nextUrl.searchParams.get("ver") === "1";

  // ── 1. ¿Existe y esta persona puede verlo? Lo responde la RLS ──────────────
  const supabase = await crearClienteServidor();

  const { data: documento } = await supabase
    .from("documentos")
    .select("id, slug, estado, licencia, archivo_ruta, archivo_nombre, subido_por")
    .eq("slug", slug)
    .maybeSingle();

  if (!documento) {
    // Mismo 404 para «no existe» y para «no te corresponde»: distinguirlos le
    // confirma a un desconocido que ese slug existe.
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }

  const fila = documento as {
    slug: string;
    estado: string;
    licencia: Licencia;
    archivo_ruta: string;
    archivo_nombre: string;
    subido_por: string | null;
  };

  // ── 2. La licencia decide si se ofrece como archivo o solo para consulta ───
  // No es DRM y no pretende serlo: quien ve un PDF en pantalla puede guardarlo.
  // Es que el repositorio no REPARTE lo que no tiene permiso de repartir, que
  // es la diferencia que le importa a quien cedió el documento.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const esDelEquipo = Boolean(user);

  if (!enLinea && !permiteDescargaDirecta(fila.licencia) && !esDelEquipo) {
    return NextResponse.json(
      {
        error:
          "Este documento se puede consultar en línea, pero su licencia no permite redistribuirlo como archivo.",
      },
      { status: 403 }
    );
  }

  // ── 3. Firmar. Recién acá entra la service_role ────────────────────────────
  const admin = crearClienteAdmin();

  const { data: firmada, error: errorFirma } = await admin.storage
    .from("documentos")
    .createSignedUrl(fila.archivo_ruta, SEGUNDOS_DE_VIGENCIA, {
      download: enLinea ? undefined : nombreDescarga(fila.slug, fila.archivo_nombre),
    });

  if (errorFirma || !firmada?.signedUrl) {
    console.error("[archivo] no se pudo firmar:", errorFirma?.message);
    return NextResponse.json({ error: "El archivo no está disponible." }, { status: 502 });
  }

  // ── 4. Contar. Nunca antes de saber que la entrega va a salir bien ─────────
  // Solo cuenta lo publicado: la función de la migración 004 lo verifica por su
  // cuenta, así que la vista previa de un borrador no ensucia la estadística.
  if (fila.estado === "publicado") {
    const { error: errorEvento } = await supabase.rpc("registrar_evento_documento", {
      p_slug: fila.slug,
      p_tipo: enLinea ? "vista" : "descarga",
      p_ip_hash: hashDeCabeceras(peticion.headers),
    });

    // Que falle el contador no puede impedir la descarga: la estadística es
    // secundaria, el documento es el producto.
    if (errorEvento) {
      console.error("[archivo] no se registró el evento:", errorEvento.message);
    }
  }

  return NextResponse.redirect(firmada.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
