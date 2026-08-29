import Link from "next/link";
import { exigirAdmin } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { formatearFecha } from "@/lib/documentos/citacion";
import { formatearBytes } from "@/lib/documentos/archivos";
import { ETIQUETA_TIPO, type TipoDocumento } from "@/lib/documentos/tipos";

export const metadata = { title: "Cola de revisión" };

interface FilaCola {
  id: string;
  slug: string;
  titulo: string;
  tipo: TipoDocumento;
  autores: string[];
  anio: number | null;
  archivo_bytes: number;
  creado_en: string;
  actualizado_en: string;
  subido_por_nombre: string | null;
  revisiones_previas: number;
}

export default async function ColaDeRevision() {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  // La vista `cola_de_revision` (migración 004) ya trae el nombre de quien
  // subió el documento y cuántas veces pasó antes por acá — sin dos consultas
  // más desde la página.
  const { data } = await supabase
    .from("cola_de_revision")
    .select("*")
    .order("actualizado_en", { ascending: true });

  const cola = (data ?? []) as FilaCola[];

  return (
    <div>
      <h2 className="font-display text-2xl">Cola de revisión</h2>
      <p className="mt-2 max-w-2xl text-sm text-carbon-suave">
        Del que lleva más tiempo esperando al más reciente. Ninguno de estos documentos es
        visible para el público todavía.
      </p>

      {cola.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-borde bg-white px-6 py-14 text-center">
          <p className="font-display text-lg">No hay nada esperando revisión</p>
          <p className="mt-1 text-sm text-carbon-suave">Todo lo que se envió ya fue evaluado.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {cola.map((doc) => (
            <li key={doc.id} className="rounded-lg border border-borde bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-display text-lg leading-snug">
                    <Link href={`/panel/documentos/${doc.id}`} className="text-anil hover:underline">
                      {doc.titulo}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm text-carbon-suave">
                    {doc.autores.length > 0 ? doc.autores.join(", ") : "Sin autoría registrada"}
                    {doc.anio ? ` · ${doc.anio}` : ""}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-carbon-suave">
                    <li>{ETIQUETA_TIPO[doc.tipo]}</li>
                    <li>{formatearBytes(doc.archivo_bytes)}</li>
                    <li>Subido por {doc.subido_por_nombre ?? "—"}</li>
                    <li>En espera desde {formatearFecha(doc.actualizado_en)}</li>
                    {doc.revisiones_previas > 0 && (
                      <li className="text-tierra">
                        {doc.revisiones_previas === 1
                          ? "Ya pasó 1 vez por revisión"
                          : `Ya pasó ${doc.revisiones_previas} veces por revisión`}
                      </li>
                    )}
                  </ul>
                </div>

                <div className="flex shrink-0 gap-2">
                  {/* `?ver=1` entrega el archivo para consulta en línea. El
                      revisor tiene que poder abrirlo antes de aprobarlo — la
                      RLS le deja ver los no publicados. */}
                  <a
                    href={`/api/documentos/${doc.slug}/archivo?ver=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-borde px-3.5 py-2 text-sm hover:bg-crema-dk"
                  >
                    Ver archivo
                  </a>
                  <Link
                    href={`/panel/documentos/${doc.id}`}
                    className="rounded-md bg-anil px-3.5 py-2 text-sm text-crema hover:bg-anil-lt"
                  >
                    Evaluar
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
