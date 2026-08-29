import Link from "next/link";
import { filtrosAQuery, type Filtros } from "@/lib/documentos/busqueda";

/**
 * Paginación con enlaces reales (`<a>`), no con botones que llaman a un
 * `router.push`. Así funciona el clic derecho → «abrir en pestaña nueva», y
 * los buscadores pueden recorrer el repositorio entero.
 */
export default function Paginacion({
  filtros,
  totalPaginas,
  ruta = "/documentos",
}: {
  filtros: Filtros;
  totalPaginas: number;
  ruta?: string;
}) {
  if (totalPaginas <= 1) return null;

  const actual = Math.min(Math.max(1, filtros.pagina), totalPaginas);

  const enlace = (pagina: number) => {
    const qs = filtrosAQuery({ ...filtros, pagina });
    return qs ? `${ruta}?${qs}` : ruta;
  };

  // Una ventana de 5 alrededor de la actual, siempre pegada a los bordes: con
  // 40 páginas no se pintan 40 enlaces.
  const desde = Math.max(1, Math.min(actual - 2, totalPaginas - 4));
  const hasta = Math.min(totalPaginas, Math.max(actual + 2, 5));
  const paginas: number[] = [];
  for (let p = desde; p <= hasta; p++) paginas.push(p);

  return (
    <nav aria-label="Paginación" className="mt-10 flex items-center justify-center gap-1">
      {actual > 1 && (
        <Link
          href={enlace(actual - 1)}
          rel="prev"
          className="rounded-md border border-borde px-3 py-2 text-sm hover:bg-crema-dk"
        >
          ← Anterior
        </Link>
      )}

      {paginas.map((p) => (
        <Link
          key={p}
          href={enlace(p)}
          aria-current={p === actual ? "page" : undefined}
          className={
            p === actual
              ? "rounded-md bg-anil px-3.5 py-2 text-sm text-crema"
              : "rounded-md border border-borde px-3.5 py-2 text-sm hover:bg-crema-dk"
          }
        >
          {p}
        </Link>
      ))}

      {actual < totalPaginas && (
        <Link
          href={enlace(actual + 1)}
          rel="next"
          className="rounded-md border border-borde px-3 py-2 text-sm hover:bg-crema-dk"
        >
          Siguiente →
        </Link>
      )}
    </nav>
  );
}
