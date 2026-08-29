import Image from "next/image";
import Link from "next/link";
import { FUNDACION } from "@/lib/fundacion/config";
import {
  conteoPorColeccion,
  documentosRecientes,
  listarColecciones,
  totalPublicados,
} from "@/lib/documentos/consultas";
import TarjetaDocumento from "@/components/TarjetaDocumento";

export default async function Portada() {
  // Las cuatro consultas son independientes: en serie serían cuatro viajes a
  // Supabase uno detrás del otro, y la portada es lo primero que ve cualquiera.
  const [recientes, colecciones, conteos, total] = await Promise.all([
    documentosRecientes(6),
    listarColecciones(),
    conteoPorColeccion(),
    totalPublicados(),
  ]);

  return (
    <>
      {/* ── Portada ────────────────────────────────────────────────────────────
          El fondo es una imagen, pero `bg-anil` se queda debajo a propósito:
          es el color de la marca y lo que se ve mientras la imagen carga —o si
          falta—, así que el texto crema nunca queda sobre blanco.

          `isolate` crea el contexto de apilamiento para que los `-z-10` de la
          imagen y el velo se queden DENTRO de esta sección y no se metan
          debajo de la barra de navegación. */}
      <section className="relative isolate overflow-hidden border-b border-borde bg-anil text-crema">
        <Image
          src="/portada-africa.jpg"
          // Decorativa: el título dice lo mismo y mejor. Un alt describiendo el
          // mapa haría que un lector de pantalla lo leyera antes del encabezado,
          // que es lo que la persona vino a escuchar.
          alt=""
          fill
          priority
          sizes="100vw"
          // El punto de interés es el mapa, a la derecha. En pantalla angosta se
          // centra, que es donde se ve algo del continente sin recortarlo todo.
          className="-z-10 object-cover object-center sm:object-right"
        />

        {/* Velo. El texto vive en la mitad izquierda: ahí el añil va casi opaco
            y se abre hacia la derecha para dejar ver el mapa. En pantalla
            angosta el texto ocupa todo el ancho, así que el velo es parejo. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-anil/65 sm:bg-transparent sm:bg-gradient-to-r sm:from-anil sm:from-15% sm:via-anil/85 sm:to-anil/35"
        />

        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-sm uppercase tracking-widest text-ocre-lt">{FUNDACION.nombre}</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
            {FUNDACION.lema}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-crema/85">{FUNDACION.descripcion}</p>

          <form action="/documentos" method="get" className="mt-8 flex max-w-xl gap-2">
            <label htmlFor="q-portada" className="sr-only">Buscar en el repositorio</label>
            <input
              id="q-portada"
              name="q"
              type="search"
              placeholder="Buscar por título, autor o comunidad…"
              className="w-full rounded-md border border-transparent bg-crema px-4 py-3 text-carbon placeholder:text-carbon-suave"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md bg-ocre px-5 py-3 font-medium text-carbon transition-colors hover:bg-ocre-lt"
            >
              Buscar
            </button>
          </form>

          <p className="mt-4 text-sm text-crema/70">
            {total === 0
              ? "El repositorio está listo para recibir sus primeros documentos."
              : `${total} ${total === 1 ? "documento disponible" : "documentos disponibles"} para consulta y descarga.`}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl">Colecciones</h2>
          <Link href="/colecciones" className="text-sm text-anil hover:underline">
            Ver todas
          </Link>
        </div>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {colecciones.slice(0, 6).map((c) => (
            <li key={c.id}>
              <Link
                href={`/documentos?coleccion=${c.slug}`}
                className="flex h-full flex-col rounded-lg border border-borde bg-white p-5 transition-colors hover:border-anil"
              >
                <h3 className="font-display text-lg leading-snug">{c.nombre}</h3>
                {c.descripcion && (
                  <p className="recorte-3 mt-2 text-sm text-carbon-suave">{c.descripcion}</p>
                )}
                <span className="mt-4 text-xs uppercase tracking-wide text-carbon-suave">
                  {conteos[c.id] ?? 0}{" "}
                  {(conteos[c.id] ?? 0) === 1 ? "documento" : "documentos"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {recientes.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl">Agregados recientemente</h2>
            <Link href="/documentos" className="text-sm text-anil hover:underline">
              Ver el repositorio
            </Link>
          </div>

          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recientes.map((doc) => (
              <li key={doc.id}>
                <TarjetaDocumento doc={doc} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
