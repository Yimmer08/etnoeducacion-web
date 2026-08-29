"use client";

import { useState } from "react";

/**
 * Copiar la cita al portapapeles. `navigator.clipboard` no existe en contextos
 * no seguros (http) ni en navegadores viejos, así que si falla se selecciona el
 * texto para que se pueda copiar con Ctrl+C — nunca se queda sin salida.
 */
export default function BotonCopiarCita({ cita }: { cita: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(cita);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      const nodo = document.getElementById("texto-cita");
      if (nodo) {
        const rango = document.createRange();
        rango.selectNodeContents(nodo);
        const seleccion = window.getSelection();
        seleccion?.removeAllRanges();
        seleccion?.addRange(rango);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={copiar}
      className="shrink-0 rounded-md border border-borde bg-white px-3 py-1.5 text-xs transition-colors hover:bg-crema-dk"
    >
      {/* aria-live para que un lector de pantalla anuncie el cambio */}
      <span aria-live="polite">{copiado ? "Copiado ✓" : "Copiar cita"}</span>
    </button>
  );
}
