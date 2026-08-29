import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { documentoPorSlug } from "@/lib/documentos/consultas";
import { SITIO_URL } from "@/lib/fundacion/config";
import { formatearBytes } from "@/lib/documentos/archivos";
import {
  citaTexto,
  enlaceLicencia,
  formatearAutores,
  formatearFecha,
  formatearNumero,
  permiteDescargaDirecta,
} from "@/lib/documentos/citacion";
import { ETIQUETA_NIVEL, ETIQUETA_TIPO, IDIOMAS, LICENCIA_INFO } from "@/lib/documentos/tipos";
import { InsigniaEstado, InsigniaLicencia, InsigniaTipo } from "@/components/Insignias";
import VisorArchivo from "@/components/VisorArchivo";
import BotonCopiarCita from "@/components/BotonCopiarCita";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await documentoPorSlug(slug);

  if (!doc) return { title: "Documento no encontrado" };

  const descripcion =
    doc.resumen?.slice(0, 300) ?? `${formatearAutores(doc.autores)} · ${doc.anio ?? "s. f."}`;

  return {
    title: doc.titulo,
    description: descripcion,
    // Un borrador no se indexa aunque su autor abra el enlace estando con sesión.
    robots: doc.estado === "publicado" ? { index: true, follow: true } : { index: false },
    openGraph: {
      title: doc.titulo,
      description: descripcion,
      type: "article",
      url: `${SITIO_URL}/documentos/${doc.slug}`,
    },
  };
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="border-t border-borde py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-carbon-suave">{etiqueta}</dt>
      <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{children}</dd>
    </div>
  );
}

export default async function FichaDocumento({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await documentoPorSlug(slug);

  // `documentoPorSlug` devuelve null tanto si no existe como si la RLS no lo
  // deja ver. Los dos casos son 404 a propósito.
  if (!doc) notFound();

  const idioma = IDIOMAS.find((i) => i.codigo === doc.idioma)?.nombre ?? doc.idioma;
  const licencia = LICENCIA_INFO[doc.licencia];
  const urlLicencia = enlaceLicencia(doc.licencia);
  const sePuedeDescargar = permiteDescargaDirecta(doc.licencia);
  const cita = citaTexto(doc, SITIO_URL);

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav aria-label="Miga de pan" className="mb-6 text-sm text-carbon-suave">
        <Link href="/documentos" className="hover:text-anil">Documentos</Link>
        {doc.colecciones && (
          <>
            <span aria-hidden className="mx-2">/</span>
            <Link href={`/colecciones/${doc.colecciones.slug}`} className="hover:text-anil">
              {doc.colecciones.nombre}
            </Link>
          </>
        )}
      </nav>

      {/* Solo aparece si quien mira puede ver un no-publicado, o sea su autor
          o un admin. Para el público no existe este caso. */}
      {doc.estado !== "publicado" && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-ocre/40 bg-ocre/10 px-4 py-3">
          <InsigniaEstado estado={doc.estado} />
          <p className="text-sm">
            Este documento todavía no es público. Solo lo ven vos y los administradores.
          </p>
        </div>
      )}

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <InsigniaTipo tipo={doc.tipo} />
          <InsigniaLicencia licencia={doc.licencia} />
          {doc.anio && <span className="text-sm text-carbon-suave">{doc.anio}</span>}
        </div>

        <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{doc.titulo}</h1>
        {doc.subtitulo && (
          <p className="mt-2 font-display text-xl text-carbon-suave">{doc.subtitulo}</p>
        )}
        <p className="mt-3 text-lg">{formatearAutores(doc.autores, 5)}</p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {doc.resumen && (
            <section>
              <h2 className="font-display text-xl">Resumen</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed">{doc.resumen}</p>
            </section>
          )}

          <section>
            <h2 className="sr-only">Documento</h2>
            <VisorArchivo slug={doc.slug} mime={doc.archivo_mime} titulo={doc.titulo} />
          </section>

          <section>
            <h2 className="font-display text-xl">Ficha</h2>
            <dl className="mt-2">
              <Dato etiqueta="Tipo">{ETIQUETA_TIPO[doc.tipo]}</Dato>
              <Dato etiqueta="Idioma">{idioma}</Dato>
              <Dato etiqueta="Año">{doc.anio ?? null}</Dato>
              <Dato etiqueta="Páginas">{doc.paginas ?? null}</Dato>
              <Dato etiqueta="Comunidad">{doc.comunidad}</Dato>
              <Dato etiqueta="Territorio">{doc.territorio}</Dato>
              <Dato etiqueta="Nivel educativo">
                {doc.nivel_educativo ? ETIQUETA_NIVEL[doc.nivel_educativo] : null}
              </Dato>
              <Dato etiqueta="Fuente">{doc.fuente}</Dato>
              <Dato etiqueta="ISBN / ISSN">{doc.isbn_issn}</Dato>
              <Dato etiqueta="Colección">
                {doc.colecciones ? (
                  <Link href={`/colecciones/${doc.colecciones.slug}`} className="text-anil hover:underline">
                    {doc.colecciones.nombre}
                  </Link>
                ) : null}
              </Dato>
              <Dato etiqueta="Archivo">
                {`${doc.archivo_mime.split("/").pop()?.toUpperCase()} · ${formatearBytes(doc.archivo_bytes)}`}
              </Dato>
              <Dato etiqueta="Publicado">{formatearFecha(doc.publicado_en)}</Dato>
            </dl>
          </section>

          {doc.etiquetas.length > 0 && (
            <section>
              <h2 className="font-display text-xl">Etiquetas</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {doc.etiquetas.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/documentos?etiqueta=${e.slug}`}
                      className="inline-block rounded-full border border-borde bg-white px-3 py-1 text-sm transition-colors hover:border-anil hover:text-anil"
                    >
                      {e.nombre}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="font-display text-xl">Cómo citar</h2>
            <div className="mt-2 flex items-start gap-3 rounded-lg border border-borde bg-white p-4">
              <p id="texto-cita" className="flex-1 text-sm leading-relaxed">{cita}</p>
              <BotonCopiarCita cita={cita} />
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-borde bg-white p-5">
            {sePuedeDescargar ? (
              <a
                href={`/api/documentos/${doc.slug}/archivo`}
                className="block w-full rounded-md bg-anil px-4 py-3 text-center font-medium text-crema transition-colors hover:bg-anil-lt"
              >
                Descargar
                <span className="ml-1.5 text-sm font-normal text-crema/75">
                  ({formatearBytes(doc.archivo_bytes)})
                </span>
              </a>
            ) : (
              <p className="rounded-md bg-crema-dk px-4 py-3 text-sm text-carbon-suave">
                Este documento se puede <strong>consultar en línea</strong>, pero su licencia
                no permite redistribuirlo como archivo.
              </p>
            )}

            <div className="mt-4 border-t border-borde pt-4">
              <p className="text-sm font-medium">{licencia.nombre}</p>
              {urlLicencia && (
                <a
                  href={urlLicencia}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm text-anil hover:underline"
                >
                  Ver los términos de la licencia
                </a>
              )}
            </div>

            {doc.estado === "publicado" && (
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-borde pt-4 text-center">
                <div>
                  <dt className="text-xs text-carbon-suave">Consultas</dt>
                  <dd className="font-display text-xl">{formatearNumero(doc.vistas)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-carbon-suave">Descargas</dt>
                  <dd className="font-display text-xl">{formatearNumero(doc.descargas)}</dd>
                </div>
              </dl>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
