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
import FondoColecciones from "@/components/FondoColecciones";
import PortadaColeccion from "@/components/PortadaColeccion";

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
      <section className="relative isolate overflow-hidden border-b border-borde bg-anil-portada text-crema">
        <Image
          src="/portada-africa.jpeg"
          // Decorativa: el título dice lo mismo y mejor. Un alt describiendo el
          // mapa haría que un lector de pantalla lo leyera antes del encabezado,
          // que es lo que la persona vino a escuchar.
          alt=""
          fill
          priority
          sizes="100vw"
          // `contain` de tablet para arriba: la franja es mucho más ancha que
          // alta y la imagen es 3:2, así que `cover` la agranda hasta cubrir el
          // ancho y se come más de la mitad del continente. Con `contain` entra
          // completa, apoyada a la derecha, y lo que sobra a la izquierda queda
          // del color de sus propios bordes (--anil-portada): no se ve dónde
          // termina la imagen y dónde empieza el fondo.
          //
          // En pantalla angosta sigue `cover`: ahí la franja es casi cuadrada,
          // recorta poco, y `contain` dejaría el mapa como una estampilla en
          // medio de una franja vacía.
          className="-z-10 object-cover object-center sm:object-contain sm:object-right"
        />

        {/* Velo, suave a propósito.
            La imagen de la portada es más OSCURA que el añil de la marca
            —RGB(11,42,73) contra RGB(31,68,98)— y tiene poquísimo contraste
            interno: el mapa se despega del fondo apenas 8 niveles. Un velo
            espeso, que es lo que pediría una foto clara, acá pinta un color
            MÁS CLARO encima y borra el mapa entero; la portada vuelve a verse
            como el color plano que era antes.

            Así que queda en lo mínimo. Para el contraste no hace falta: el
            texto crema sobre esta imagen da 13.8:1, muy por encima del 4.5:1
            que pide la norma. Sirve para asentar el texto del lado izquierdo y
            como red por si algún día la imagen se cambia por una más clara. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-anil-portada/40 sm:bg-transparent sm:bg-gradient-to-r sm:from-anil-portada/80 sm:via-anil-portada/30 sm:via-40% sm:to-transparent"
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

          {/* crema/80, no /70: sobre la imagen el fondo bajo esta línea llega a
              RGB(37,78,109) y con /70 el contraste cae a 4.4:1, por debajo del
              4.5:1 que pide la norma para texto pequeño. Con /80 sube a 5.9:1.
              Sobre el añil plano anterior /70 alcanzaba; con la imagen, no. */}
          <p className="mt-4 text-sm text-crema/80">
            {total === 0
              ? "El repositorio está listo para recibir sus primeros documentos."
              : `${total} ${total === 1 ? "documento disponible" : "documentos disponibles"} para consulta y descarga.`}
          </p>
        </div>
      </section>

      {/* ── Colecciones ────────────────────────────────────────────────────────
          La sección se parte en dos: la de afuera lleva el fondo y va de borde
          a borde, y la de adentro centra el contenido. Antes era una sola con
          `mx-auto max-w-6xl`, y un fondo ahí se habría cortado a los lados
          junto con el contenido.

          Mismo fondo que /colecciones, por el mismo componente: las dos vistas
          de las colecciones tienen que leerse como una sola cosa. */}
      <section className="relative isolate overflow-hidden border-y border-borde bg-arena">
        <FondoColecciones />

        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
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
                  className="group flex h-full flex-col overflow-hidden rounded-lg border border-borde bg-white transition-colors hover:border-anil"
                >
                  <PortadaColeccion slug={c.slug} nombre={c.nombre} />

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-lg leading-snug">{c.nombre}</h3>
                    {c.descripcion && (
                      <p className="recorte-3 mt-2 text-sm text-carbon-suave">{c.descripcion}</p>
                    )}
                    <span className="mt-4 text-xs uppercase tracking-wide text-carbon-suave">
                      {conteos[c.id] ?? 0}{" "}
                      {(conteos[c.id] ?? 0) === 1 ? "documento" : "documentos"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
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
