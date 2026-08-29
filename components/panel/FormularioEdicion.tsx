"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { actualizarDocumento } from "@/lib/documentos/acciones";
import type { Coleccion, Etiqueta } from "@/lib/documentos/tipos";
import CamposDocumento, { leerFormulario, type ValoresDocumento } from "./CamposDocumento";

export default function FormularioEdicion({
  documentoId,
  valores,
  colecciones,
  etiquetas,
  editable,
}: {
  documentoId: string;
  valores: ValoresDocumento;
  colecciones: Coleccion[];
  etiquetas: Etiqueta[];
  editable: boolean;
}) {
  const router = useRouter();
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setMensaje(null);
    setErrores({});

    const resultado = await actualizarDocumento(
      documentoId,
      leerFormulario(new FormData(evento.currentTarget))
    );

    setGuardando(false);

    if (!resultado.ok) {
      setMensaje(resultado.mensaje ?? "No se pudo guardar.");
      setErrores(resultado.errores ?? {});
      return;
    }

    setMensaje("Guardado.");
    router.refresh();
  }

  if (!editable) {
    return (
      <p className="rounded-lg border border-borde bg-crema-dk px-4 py-3 text-sm text-carbon-suave">
        Este documento no se puede editar en su estado actual. Un documento publicado solo
        lo modifica un administrador.
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-8">
      <CamposDocumento
        valores={valores}
        colecciones={colecciones}
        etiquetas={etiquetas}
        errores={errores}
      />

      {mensaje && (
        <p
          role="status"
          className={
            mensaje === "Guardado."
              ? "rounded-md bg-palma/10 px-3 py-2 text-sm text-palma"
              : "rounded-md bg-tierra/10 px-3 py-2 text-sm text-tierra"
          }
        >
          {mensaje}
        </p>
      )}

      <div className="border-t border-borde pt-5">
        <button
          type="submit"
          disabled={guardando}
          className="rounded-md bg-anil px-5 py-2.5 font-medium text-crema transition-colors hover:bg-anil-lt disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
