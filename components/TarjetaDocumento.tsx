import Link from "next/link";
import type { DocumentoTarjeta } from "@/lib/documentos/consultas";
import { formatearAutores } from "@/lib/documentos/citacion";
import { formatearBytes } from "@/lib/documentos/archivos";
import { InsigniaLicencia, InsigniaTipo } from "./Insignias";

/**
 * Portada tipográfica: la inicial del título sobre un color derivado del
 * propio título.
 *
 * Se hace así, y no con miniaturas generadas, porque una miniatura obliga a un
 * segundo bucket público (el de documentos es privado, ver 005_storage.sql) y
 * ese bucket filtraría las portadas de los borradores. Una letra grande cuesta
 * cero y no expone nada.
 */
function portadaDe(titulo: string): { fondo: string; letra: string } {
  const fondos = ["bg-anil", "bg-tierra", "bg-palma", "bg-ocre"];
  let suma = 0;
  for (const c of titulo) suma = (suma + c.codePointAt(0)!) % 997;
  return { fondo: fondos[suma % fondos.length], letra: titulo.trim().charAt(0).toUpperCase() || "?" };
}

export default function TarjetaDocumento({ doc }: { doc: DocumentoTarjeta }) {
  const portada = portadaDe(doc.titulo);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-borde bg-white transition-shadow hover:shadow-md">
      <Link href={`/documentos/${doc.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-[3/2] overflow-hidden bg-crema-dk">
          {doc.portada_url ? (
            /* Portada externa arbitraria: no pasa por el optimizador de Next
               porque el dominio lo escribe quien cataloga y no se puede
               declarar de antemano en next.config. */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.portada_url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div
              aria-hidden
              className={`grid h-full w-full place-items-center ${portada.fondo}`}
            >
              <span className="font-display text-5xl text-crema/90">{portada.letra}</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <InsigniaTipo tipo={doc.tipo} />
            {doc.anio && <span className="text-xs text-carbon-suave">{doc.anio}</span>}
          </div>

          <h3 className="recorte-2 font-display text-base leading-snug group-hover:text-anil">
            {doc.titulo}
          </h3>

          <p className="recorte-2 text-sm text-carbon-suave">{formatearAutores(doc.autores, 2)}</p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <InsigniaLicencia licencia={doc.licencia} />
            <span className="text-xs text-carbon-suave">{formatearBytes(doc.archivo_bytes)}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
