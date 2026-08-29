import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { InsigniaEstado } from "@/components/Insignias";
import { formatearFecha } from "@/lib/documentos/citacion";
import { ETIQUETA_TIPO, type EstadoDocumento, type TipoDocumento } from "@/lib/documentos/tipos";

export const metadata = { title: "Documentos" };

interface Fila {
  id: string;
  titulo: string;
  estado: EstadoDocumento;
  tipo: TipoDocumento;
  actualizado_en: string;
  descargas: number;
}

export default async function DocumentosDelPanel() {
  const perfil = await exigirPerfil();
  const supabase = await crearClienteServidor();

  // Sin filtro por autor: la RLS ya devuelve lo de este colaborador, o todo si
  // es admin. Escribir el filtro acá duplicaría la regla en dos lugares que
  // después se desincronizan.
  const { data } = await supabase
    .from("documentos")
    .select("id, titulo, estado, tipo, actualizado_en, descargas")
    .order("actualizado_en", { ascending: false });

  const documentos = (data ?? []) as Fila[];

  return (
    <div>
      <h2 className="font-display text-2xl">
        {perfil.rol === "admin" ? "Todos los documentos" : "Tus documentos"}
      </h2>

      {documentos.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-borde bg-white px-6 py-14 text-center">
          <p className="font-display text-lg">Todavía no hay documentos</p>
          <Link
            href="/panel/subir"
            className="mt-4 inline-block rounded-md bg-anil px-4 py-2 text-sm text-crema"
          >
            Subir el primero
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-borde bg-white">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Documentos, del más recientemente modificado al más antiguo
            </caption>
            <thead className="border-b border-borde bg-crema-dk text-left">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Título</th>
                <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">Tipo</th>
                <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">Modificado</th>
                <th scope="col" className="hidden px-4 py-3 text-right font-medium md:table-cell">Descargas</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => (
                <tr key={doc.id} className="border-b border-borde last:border-0 hover:bg-crema">
                  <td className="px-4 py-3">
                    <Link href={`/panel/documentos/${doc.id}`} className="font-medium text-anil hover:underline">
                      {doc.titulo}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><InsigniaEstado estado={doc.estado} /></td>
                  <td className="hidden px-4 py-3 text-carbon-suave sm:table-cell">
                    {ETIQUETA_TIPO[doc.tipo]}
                  </td>
                  <td className="hidden px-4 py-3 text-carbon-suave md:table-cell">
                    {formatearFecha(doc.actualizado_en)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-carbon-suave md:table-cell">
                    {doc.descargas}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
