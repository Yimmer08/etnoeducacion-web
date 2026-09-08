import Link from "next/link";
import { FUNDACION } from "@/lib/fundacion/config";
import { perfilActual } from "@/lib/auth/sesion";

const ENLACES = [
  { href: "/documentos", texto: "Documentos" },
  { href: "/colecciones", texto: "Colecciones" },
  { href: "/acerca", texto: "Acerca de" },
];

export default async function Navbar() {
  const perfil = await perfilActual();

  return (
    <header className="border-b border-borde bg-crema/95 backdrop-blur sticky top-0 z-40">
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6"
      >
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-md bg-anil font-display text-lg text-crema"
          >
            {FUNDACION.nombre.charAt(0)}
          </span>
          {/* Sin el subtítulo «Repositorio» que había debajo: hacía falta
              cuando el sitio llevaba el nombre de una fundación y había que
              decir qué era esto. Ahora el nombre ya lo dice. */}
          <span className="hidden font-display text-base leading-tight sm:block">
            {FUNDACION.nombreCorto}
          </span>
        </Link>

        <ul className="ml-auto flex items-center gap-1 text-sm">
          {ENLACES.map((e) => (
            <li key={e.href}>
              <Link
                href={e.href}
                className="block rounded-md px-3 py-2 transition-colors hover:bg-crema-dk"
              >
                {e.texto}
              </Link>
            </li>
          ))}
          <li>
            {perfil ? (
              <Link
                href="/panel"
                className="ml-1 block rounded-md bg-anil px-3.5 py-2 text-crema transition-colors hover:bg-anil-lt"
              >
                Panel
              </Link>
            ) : (
              <Link
                href="/acceso"
                className="ml-1 block rounded-md border border-borde px-3.5 py-2 transition-colors hover:bg-crema-dk"
              >
                Entrar
              </Link>
            )}
          </li>
        </ul>
      </nav>
    </header>
  );
}
