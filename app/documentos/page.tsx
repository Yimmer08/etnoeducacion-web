import type { Metadata } from "next";
import { buscarDocumentos, listarColecciones, listarEtiquetas } from "@/lib/documentos/consultas";
import { leerFiltros, totalDePaginas } from "@/lib/documentos/busqueda";
import FormularioFiltros from "@/components/FormularioFiltros";
import TarjetaDocumento from "@/components/TarjetaDocumento";
import Paginacion from "@/components/Paginacion";

export const metadata: Metadata = {
  title: "Documentos",
  description: "Buscá en el repositorio por título, autor, comunidad, colección o año.",
};

export default async function ListadoDocumentos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // `searchParams` llega como objeto con valores que pueden ser array (?tipo=a&tipo=b).
  // Se normaliza a URLSearchParams para que leerFiltros vea siempre lo mismo,
  // y con el primer valor de cada clave — no con "a,b", que no valida contra
  // ningún catálogo y quedaría descartado.
  const busqueda = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (typeof valor === "string") busqueda.set(clave, valor);
    else if (Array.isArray(valor) && valor[0]) busqueda.set(clave, valor[0]);
  }

  const filtros = leerFiltros(busqueda);

  const [{ documentos, total }, colecciones, etiquetas] = await Promise.all([
    buscarDocumentos(filtros),
    listarColecciones(),
    listarEtiquetas(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl">Documentos</h1>
      <p className="mt-2 max-w-2xl text-carbon-suave">
        Todo el material publicado del repositorio. Se puede consultar en línea y descargar
        según la licencia de cada documento.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <h2 className="sr-only">Filtros</h2>
          <FormularioFiltros
            filtros={filtros}
            colecciones={colecciones}
            etiquetas={etiquetas}
            total={total}
          />
        </aside>

        <div>
          {documentos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-borde bg-white px-6 py-16 text-center">
              <p className="font-display text-lg">No hay documentos que coincidan</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-carbon-suave">
                Probá con menos filtros, o escribí una sola palabra clave. El buscador
                también encuentra por nombre de comunidad y de territorio.
              </p>
            </div>
          ) : (
            <>
              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {documentos.map((doc) => (
                  <li key={doc.id}>
                    <TarjetaDocumento doc={doc} />
                  </li>
                ))}
              </ul>
              <Paginacion filtros={filtros} totalPaginas={totalDePaginas(total)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
