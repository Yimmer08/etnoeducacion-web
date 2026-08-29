"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { crearDocumento } from "@/lib/documentos/acciones";
import {
  formatearBytes,
  MAX_BYTES,
  rutaEnStorage,
  validarArchivo,
} from "@/lib/documentos/archivos";
import type { Coleccion, Etiqueta } from "@/lib/documentos/tipos";
import CamposDocumento, { leerFormulario } from "./CamposDocumento";

/**
 * SHA-256 del archivo, calculado en el navegador.
 *
 * Sirve para que el índice único parcial de la migración 001
 * (`documentos_sha256_vigente_idx`) rechace el mismo archivo cargado dos veces
 * —que en un repositorio compartido pasa seguido: dos personas suben la misma
 * cartilla con títulos distintos—.
 *
 * `crypto.subtle` solo existe en contextos seguros (https o localhost). Si no
 * está, se devuelve null y se sigue: perder la detección de duplicados es
 * mejor que no poder subir.
 */
async function calcularSha256(archivo: File): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  try {
    const buffer = await archivo.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

export default function FormularioSubida({
  perfilId,
  colecciones,
  etiquetas,
}: {
  perfilId: string;
  colecciones: Coleccion[];
  etiquetas: Etiqueta[];
}) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [paso, setPaso] = useState<"listo" | "subiendo" | "guardando">("listo");

  function elegirArchivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const elegido = evento.target.files?.[0] ?? null;
    setArchivo(elegido);
    setErrorArchivo(null);

    if (!elegido) return;

    // Se valida al elegir, no al enviar: enterarse de que el archivo no sirve
    // después de llenar 16 campos es la peor versión de este formulario.
    const resultado = validarArchivo({
      nombre: elegido.name,
      bytes: elegido.size,
      mime: elegido.type,
    });

    if (!resultado.ok) {
      setErrorArchivo(resultado.motivo);
      setArchivo(null);
      evento.target.value = "";
    }
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);
    setErrores({});

    if (!archivo) {
      setErrorArchivo("Elegí el archivo del documento.");
      return;
    }

    const datos = leerFormulario(new FormData(evento.currentTarget));
    const supabase = crearClienteNavegador();
    const ruta = rutaEnStorage(perfilId, archivo.name, crypto.randomUUID());

    // ── 1. El archivo va del navegador DIRECTO a Storage ────────────────────
    // No pasa por una server action: el límite de cuerpo por defecto son 1 MB
    // y acá se aceptan hasta 50. La RLS de Storage (005) comprueba que la
    // carpeta sea la de esta cuenta.
    setPaso("subiendo");
    const { error: errorSubida } = await supabase.storage
      .from("documentos")
      .upload(ruta, archivo, { contentType: archivo.type, upsert: false });

    if (errorSubida) {
      setPaso("listo");
      setMensaje(`No se pudo subir el archivo: ${errorSubida.message}`);
      return;
    }

    // ── 2. Recién con el archivo arriba se crea la ficha ────────────────────
    setPaso("guardando");
    const sha256 = await calcularSha256(archivo);

    const resultado = await crearDocumento(datos, {
      ruta,
      nombre: archivo.name,
      bytes: archivo.size,
      mime: archivo.type,
      sha256,
    });

    if (!resultado.ok) {
      // Si la ficha no se pudo crear, el archivo que acabamos de subir queda
      // huérfano en Storage. Se borra acá mismo: un bucket lleno de archivos
      // sin ficha no lo limpia nadie después.
      await supabase.storage.from("documentos").remove([ruta]);
      setPaso("listo");
      setMensaje(resultado.mensaje ?? "No se pudo guardar el documento.");
      setErrores(resultado.errores ?? {});
      return;
    }

    router.push(`/panel/documentos/${resultado.id}`);
  }

  const ocupado = paso !== "listo";

  return (
    <form onSubmit={enviar} className="space-y-8">
      <fieldset className="rounded-lg border border-borde bg-white p-5">
        <legend className="px-2 font-display text-lg">Archivo</legend>

        <input
          id="archivo"
          type="file"
          required
          onChange={elegirArchivo}
          accept=".pdf,.doc,.docx,.odt,.epub,.jpg,.jpeg,.png,.webp,.mp3,.ogg,.wav,.mp4"
          className="w-full rounded-md border border-borde px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-crema-dk file:px-3 file:py-1.5 file:text-sm"
        />

        <p className="mt-2 text-xs text-carbon-suave">
          PDF, Word, ODT, EPUB, imagen, audio o video MP4. Máximo {formatearBytes(MAX_BYTES)}.
        </p>

        {archivo && (
          <p className="mt-2 text-sm">
            <strong>{archivo.name}</strong>{" "}
            <span className="text-carbon-suave">({formatearBytes(archivo.size)})</span>
          </p>
        )}

        {errorArchivo && (
          <p role="alert" className="mt-2 rounded-md bg-tierra/10 px-3 py-2 text-sm text-tierra">
            {errorArchivo}
          </p>
        )}
      </fieldset>

      <CamposDocumento colecciones={colecciones} etiquetas={etiquetas} errores={errores} />

      {mensaje && (
        <p role="alert" className="rounded-md bg-tierra/10 px-3 py-2 text-sm text-tierra">
          {mensaje}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-borde pt-5">
        <button
          type="submit"
          disabled={ocupado}
          className="rounded-md bg-anil px-5 py-2.5 font-medium text-crema transition-colors hover:bg-anil-lt disabled:opacity-60"
        >
          {paso === "subiendo" ? "Subiendo archivo…" : paso === "guardando" ? "Guardando ficha…" : "Guardar como borrador"}
        </button>
        <p className="text-sm text-carbon-suave">
          Queda en borrador. Lo mandás a revisión cuando esté listo.
        </p>
      </div>
    </form>
  );
}
