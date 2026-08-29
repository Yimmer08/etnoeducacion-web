import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { listarColecciones, listarEtiquetas } from "@/lib/documentos/consultas";
import { puedeEditar } from "@/lib/documentos/estados";
import { formatearFecha } from "@/lib/documentos/citacion";
import { formatearBytes } from "@/lib/documentos/archivos";
import { ETIQUETA_DECISION, type Documento, type Revision } from "@/lib/documentos/tipos";
import { InsigniaEstado } from "@/components/Insignias";
import AccionesFlujo from "@/components/panel/AccionesFlujo";
import FormularioEdicion from "@/components/panel/FormularioEdicion";

export const metadata = { title: "Documento" };

export default async function EditarDocumento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, perfil] = await Promise.all([params, exigirPerfil()]);
  const supabase = await crearClienteServidor();

  const [{ data: fila }, colecciones, etiquetasDisponibles] = await Promise.all([
    supabase
      .from("documentos")
      .select("*, documento_etiquetas(etiquetas(slug))")
      .eq("id", id)
      .maybeSingle(),
    listarColecciones(),
    listarEtiquetas(),
  ]);

  // Null tanto si no existe como si la RLS no lo deja ver — 404 en los dos casos.
  if (!fila) notFound();

  const doc = fila as unknown as Documento & {
    documento_etiquetas: Array<{ etiquetas: { slug: string } | { slug: string }[] | null }>;
  };

  const etiquetasActuales = (doc.documento_etiquetas ?? [])
    .map((v) => (Array.isArray(v.etiquetas) ? v.etiquetas[0] : v.etiquetas))
    .filter((e): e is { slug: string } => Boolean(e))
    .map((e) => e.slug);

  const contexto = { rol: perfil.rol, esAutor: doc.subido_por === perfil.id };
  const editable = puedeEditar(doc, contexto);

  // El historial de evaluaciones. La RLS deja verlo al admin y al autor del
  // documento; para cualquier otro la consulta vuelve vacía.
  const { data: revisiones } = await supabase
    .from("revisiones")
    .select("id, decision, comentario, crit_pertinencia, crit_calidad, crit_metadatos, creado_en")
    .eq("documento_id", id)
    .order("creado_en", { ascending: false });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/panel/documentos" className="text-sm text-anil hover:underline">
            ← Documentos
          </Link>
          <h2 className="mt-2 font-display text-2xl">{doc.titulo}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-carbon-suave">
            <InsigniaEstado estado={doc.estado} />
            <span>{doc.archivo_nombre}</span>
            <span>{formatearBytes(doc.archivo_bytes)}</span>
          </div>
        </div>

        {doc.estado === "publicado" && (
          <Link
            href={`/documentos/${doc.slug}`}
            className="rounded-md border border-borde px-3.5 py-2 text-sm hover:bg-crema-dk"
          >
            Ver ficha pública
          </Link>
        )}
      </header>

      <section className="rounded-lg border border-borde bg-crema-dk p-5">
        <h3 className="font-display text-lg">Flujo</h3>
        <p className="mb-4 mt-1 text-sm text-carbon-suave">
          Estado actual: <strong>{doc.estado.replace("_", " ")}</strong>.
        </p>
        <AccionesFlujo documentoId={doc.id} estado={doc.estado} contexto={contexto} />
      </section>

      {(revisiones?.length ?? 0) > 0 && (
        <section>
          <h3 className="font-display text-lg">Historial de evaluaciones</h3>
          <ul className="mt-3 space-y-3">
            {((revisiones ?? []) as Revision[]).map((r) => (
              <li key={r.id} className="rounded-lg border border-borde bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm">{ETIQUETA_DECISION[r.decision]}</strong>
                  <span className="text-xs text-carbon-suave">{formatearFecha(r.creado_en)}</span>
                </div>
                {r.comentario && <p className="mt-2 text-sm leading-relaxed">{r.comentario}</p>}
                {(r.crit_pertinencia || r.crit_calidad || r.crit_metadatos) && (
                  <ul className="mt-3 flex flex-wrap gap-3 text-xs text-carbon-suave">
                    {r.crit_pertinencia && <li>Pertinencia: {r.crit_pertinencia}/5</li>}
                    {r.crit_calidad && <li>Calidad: {r.crit_calidad}/5</li>}
                    {r.crit_metadatos && <li>Metadatos: {r.crit_metadatos}/5</li>}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="font-display text-lg">Ficha</h3>
        <div className="mt-4">
          <FormularioEdicion
            documentoId={doc.id}
            editable={editable}
            colecciones={colecciones}
            etiquetas={etiquetasDisponibles}
            valores={{ ...doc, etiquetas: etiquetasActuales }}
          />
        </div>
      </section>
    </div>
  );
}
