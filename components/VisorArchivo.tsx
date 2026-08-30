"use client";

import { useState } from "react";
import { esPdf, seVeEnLinea } from "@/lib/documentos/archivos";

/**
 * Visor en línea. Carga bajo demanda, no al abrir la página: un PDF escaneado
 * de 30 MB descargado automáticamente a un celular con datos móviles es un
 * costo real para quien lo abre. Se ve un botón, y el archivo entra al pulsarlo.
 *
 * El PDF lo dibuja el visor nativo, sin librería de por medio: pdf.js son
 * ~350 KB para hacer lo que el navegador ya hace.
 *
 * En escritorio va incrustado en un `<iframe>`. En un teléfono NO: ni Safari de
 * iOS ni Chrome de Android saben dibujar un PDF dentro de un iframe —pintan la
 * primera página como una imagen fija y no dejan desplazarse, así que el
 * documento parece de una sola hoja—. Ahí se abre en una pestaña nueva y lo
 * toma el visor del sistema, que sí lo pagina y hace zoom.
 */
export default function VisorArchivo({
  slug,
  mime,
  titulo,
}: {
  slug: string;
  mime: string;
  titulo: string;
}) {
  const [abierto, setAbierto] = useState(false);

  if (!seVeEnLinea(mime)) return null;

  const url = `/api/documentos/${slug}/archivo?ver=1`;

  const marco =
    "w-full rounded-lg border border-dashed border-borde bg-crema-dk px-6 py-10 text-center transition-colors hover:border-anil hover:bg-white";

  if (!abierto) {
    return (
      <>
        {/* En un teléfono el PDF NO va en un iframe. Ni Safari de iOS ni Chrome
            de Android saben dibujarlo ahí: pintan la primera página como una
            imagen fija y no dejan desplazarse, así que el documento parece de
            una sola hoja. Se abre en pestaña nueva y lo toma el visor del
            sistema, que sí lo pagina, hace zoom y busca dentro.

            La elección es por CSS y no leyendo el navegador: preguntar por el
            agente de usuario se equivoca seguido, y decidirlo en JavaScript
            haría que el servidor y el cliente dibujen cosas distintas. */}
        {esPdf(mime) && (
          <a href={url} target="_blank" rel="noopener noreferrer" className={`${marco} block sm:hidden`}>
            <span className="block font-display text-lg">Abrir el documento</span>
            <span className="mt-1 block text-sm text-carbon-suave">
              Se abre en una pestaña nueva, con el visor del teléfono.
            </span>
          </a>
        )}

        <button
          type="button"
          onClick={() => setAbierto(true)}
          className={`${marco} ${esPdf(mime) ? "hidden sm:block" : "block"}`}
        >
          <span className="block font-display text-lg">Ver en línea</span>
          <span className="mt-1 block text-sm text-carbon-suave">
            Se abre acá mismo, sin descargar el archivo.
          </span>
        </button>
      </>
    );
  }

  if (mime.startsWith("audio/")) {
    return <audio controls src={url} className="w-full" aria-label={`Audio: ${titulo}`} />;
  }

  if (mime === "video/mp4") {
    return <video controls src={url} className="w-full rounded-lg" aria-label={`Video: ${titulo}`} />;
  }

  if (mime.startsWith("image/")) {
    // La imagen viene de una URL firmada que caduca en 60 s: el optimizador
    // de Next no puede cachearla ni revalidarla.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={titulo} className="w-full rounded-lg" />;
  }

  return (
    <iframe
      src={url}
      title={`Documento: ${titulo}`}
      className="h-[75vh] w-full rounded-lg border border-borde bg-white"
    />
  );
}
