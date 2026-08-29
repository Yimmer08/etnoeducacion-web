"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-2xl">Algo salió mal</h1>
      <p className="mt-2 text-carbon-suave">
        No se pudo cargar esta página. Podés intentar de nuevo.
      </p>
      {/* El detalle del error NO se muestra: puede traer nombres de tablas o
          mensajes de Postgres, que no le sirven a nadie y sí orientan a quien
          quiera hurgar. Va a la consola del servidor. */}
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md bg-anil px-4 py-2.5 text-crema"
      >
        Reintentar
      </button>
    </div>
  );
}
