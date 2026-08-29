import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { buscarDocumentos, coleccionPorSlug } from "@/lib/documentos/consultas";
import { FILTROS_VACIOS, totalDePaginas, leerFiltros } from "@/lib/documentos/busqueda";
import TarjetaDocumento from "@/components/TarjetaDocumento";
import Paginacion from "@/components/Paginacion";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const coleccion = await coleccionPorSlug(slug);
  if (!coleccion) return { title: "Colección no encontrada" };

  return {
    title: coleccion.nombre,
    description: coleccion.descripcion ?? undefined,
  };
}

export default async function PaginaColeccion({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);

  const coleccion = await coleccionPorSlug(slug);
  if (!coleccion || !coleccion.activa) notFound();

  const pagina = typeof sp.pagina === "string" ? sp.pagina : "1";
  const orden = typeof sp.orden === "string" ? sp.orden : "";

  // La colección viene de la ruta, no de la querystring: acá no se puede
  // filtrar por otra. El resto de la URL se lee con el mismo parser de
  // /documentos para que la paginación y el orden se comporten igual.
  const filtros = {
    ...leerFiltros(new URLSearchParams({ pagina, orden })),
    coleccion: coleccion.slug,
  };

  const { documentos, total } = await buscarDocumentos(filtros);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav aria-label="Miga de pan" className="mb-6 text-sm text-carbon-suave">
        <Link href="/colecciones" className="hover:text-anil">Colecciones</Link>
      </nav>

      <h1 className="font-display text-3xl">{coleccion.nombre}</h1>
      {coleccion.descripcion && (
        <p className="mt-2 max-w-2xl leading-relaxed text-carbon-suave">{coleccion.descripcion}</p>
      )}
      <p className="mt-3 text-sm text-carbon-suave">
        {total} {total === 1 ? "documento" : "documentos"}
      </p>

      {documentos.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-borde bg-white px-6 py-16 text-center">
          <p className="font-display text-lg">Esta colección todavía no tiene documentos</p>
          <Link href="/documentos" className="mt-3 inline-block text-sm text-anil hover:underline">
            Ver el repositorio completo
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {documentos.map((doc) => (
              <li key={doc.id}>
                <TarjetaDocumento doc={doc} />
              </li>
            ))}
          </ul>
          {/* `coleccion: null` a propósito: la colección ya va en la ruta, y
              dejarla también en la querystring daría enlaces redundantes del
              tipo /colecciones/x?coleccion=x. */}
          <Paginacion
            filtros={{ ...FILTROS_VACIOS, ...filtros, coleccion: null }}
            totalPaginas={totalDePaginas(total)}
            ruta={`/colecciones/${coleccion.slug}`}
          />
        </>
      )}
    </div>
  );
}
