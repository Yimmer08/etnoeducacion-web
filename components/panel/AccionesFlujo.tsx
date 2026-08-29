"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ejecutarTransicion } from "@/lib/documentos/acciones";
import {
  transicionesDisponibles,
  type AccionFlujo,
  type ContextoUsuario,
} from "@/lib/documentos/estados";
import type { EstadoDocumento } from "@/lib/documentos/tipos";

/**
 * Los botones del flujo se dibujan recorriendo `transicionesDisponibles()`, no
 * escribiéndolos a mano. Así nunca aparece un botón que el flujo no permite, y
 * agregar una transición al catálogo la hace aparecer sola en la interfaz.
 */
export default function AccionesFlujo({
  documentoId,
  estado,
  contexto,
}: {
  documentoId: string;
  estado: EstadoDocumento;
  contexto: ContextoUsuario;
}) {
  const router = useRouter();
  const [pendiente, setPendiente] = useState<AccionFlujo | null>(null);
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disponibles = transicionesDisponibles(estado, contexto);
  if (disponibles.length === 0) return null;

  const transicionPendiente = disponibles.find((t) => t.accion === pendiente);

  async function ejecutar(accion: AccionFlujo, datos?: FormData) {
    setEnCurso(true);
    setError(null);

    const numero = (clave: string) => {
      const valor = datos?.get(clave);
      return valor ? Number(valor) : null;
    };

    const resultado = await ejecutarTransicion(documentoId, accion, {
      comentario: datos ? String(datos.get("comentario") ?? "") : null,
      crit_pertinencia: numero("crit_pertinencia"),
      crit_calidad: numero("crit_calidad"),
      crit_metadatos: numero("crit_metadatos"),
    });

    setEnCurso(false);

    if (!resultado.ok) {
      setError(resultado.mensaje ?? "No se pudo ejecutar la acción.");
      return;
    }

    setPendiente(null);
    router.refresh();
  }

  // Formulario de evaluación: solo para las acciones que exigen motivo.
  if (transicionPendiente?.exigeComentario) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ejecutar(transicionPendiente.accion, new FormData(e.currentTarget));
        }}
        className="space-y-4 rounded-lg border border-borde bg-white p-5"
      >
        <h3 className="font-display text-lg">{transicionPendiente.etiqueta}</h3>

        <div>
          <label htmlFor="comentario" className="mb-1.5 block text-sm font-medium">
            Motivo <span className="text-tierra">*</span>
          </label>
          <textarea
            id="comentario"
            name="comentario"
            rows={4}
            required
            minLength={10}
            placeholder="Qué hay que corregir, en concreto."
            className="w-full rounded-md border border-borde px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-carbon-suave">
            Es lo único que va a ver quien subió el documento. Sin esto no sabe qué arreglar.
          </p>
        </div>

        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="mb-1 text-sm font-medium">Evaluación (opcional, 1 a 5)</legend>
          {[
            { campo: "crit_pertinencia", etiqueta: "Pertinencia" },
            { campo: "crit_calidad", etiqueta: "Calidad del archivo" },
            { campo: "crit_metadatos", etiqueta: "Metadatos" },
          ].map((c) => (
            <div key={c.campo}>
              <label htmlFor={c.campo} className="mb-1 block text-xs text-carbon-suave">
                {c.etiqueta}
              </label>
              <select
                id={c.campo}
                name={c.campo}
                defaultValue=""
                className="w-full rounded-md border border-borde px-2 py-1.5 text-sm"
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          ))}
        </fieldset>

        {error && (
          <p role="alert" className="rounded-md bg-tierra/10 px-3 py-2 text-sm text-tierra">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={enCurso}
            className="rounded-md bg-tierra px-4 py-2 text-sm text-crema disabled:opacity-60"
          >
            {enCurso ? "Guardando…" : `Confirmar: ${transicionPendiente.etiqueta}`}
          </button>
          <button
            type="button"
            onClick={() => setPendiente(null)}
            className="rounded-md border border-borde px-4 py-2 text-sm"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {disponibles.map((t) => (
          <button
            key={t.accion}
            type="button"
            title={t.descripcion}
            disabled={enCurso}
            onClick={() => (t.exigeComentario ? setPendiente(t.accion) : ejecutar(t.accion))}
            className={
              t.hacia === "publicado"
                ? "rounded-md bg-palma px-4 py-2 text-sm text-crema disabled:opacity-60"
                : "rounded-md border border-borde bg-white px-4 py-2 text-sm transition-colors hover:bg-crema-dk disabled:opacity-60"
            }
          >
            {t.etiqueta}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-tierra/10 px-3 py-2 text-sm text-tierra">
          {error}
        </p>
      )}
    </div>
  );
}
