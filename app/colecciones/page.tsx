import type { Metadata } from "next";
import Link from "next/link";
import { conteoPorColeccion, listarColecciones } from "@/lib/documentos/consultas";

export const metadata: Metadata = {
  title: "Colecciones",
  description: "Las colecciones temáticas en las que se organiza el repositorio.",
};

export default async function Colecciones() {
  const [colecciones, conteos] = await Promise.all([listarColecciones(), conteoPorColeccion()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl">Colecciones</h1>
      <p className="mt-2 max-w-2xl text-carbon-suave">
        El material está agrupado por temas. Un documento pertenece a una sola colección;
        para lo que atraviesa varias, están las etiquetas.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {colecciones.map((c) => {
          const n = conteos[c.id] ?? 0;
          return (
            <li key={c.id}>
              <Link
                href={`/colecciones/${c.slug}`}
                className="flex h-full flex-col rounded-lg border border-borde bg-white p-6 transition-colors hover:border-anil"
              >
                <h2 className="font-display text-xl leading-snug">{c.nombre}</h2>
                {c.descripcion && (
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-carbon-suave">
                    {c.descripcion}
                  </p>
                )}
                <span className="mt-4 text-xs uppercase tracking-wide text-carbon-suave">
                  {n} {n === 1 ? "documento" : "documentos"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
