"use client";

import { useState } from "react";
import { seVeEnLinea } from "@/lib/documentos/archivos";

/**
 * Visor en línea. Carga bajo demanda, no al abrir la página: un PDF escaneado
 * de 30 MB descargado automáticamente a un celular con datos móviles es un
 * costo real para quien lo abre. Se ve la portada y un botón; el `<iframe>`
 * entra al pulsarlo.
 *
 * El PDF lo dibuja el visor nativo del navegador (todos lo traen desde hace
 * años). Ninguna librería de por medio: pdf.js son ~350 KB para hacer lo
 * mismo que el navegador ya hace.
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

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="w-full rounded-lg border border-dashed border-borde bg-crema-dk px-6 py-10 text-center transition-colors hover:border-anil hover:bg-white"
      >
        <span className="block font-display text-lg">Ver en línea</span>
        <span className="mt-1 block text-sm text-carbon-suave">
          Se abre acá mismo, sin descargar el archivo.
        </span>
      </button>
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
