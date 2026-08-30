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
        // `flex-wrap` para las pantallas de 320 px, donde ni con los enlaces
        // ajustados alcanza el renglón: ahí bajan a una segunda línea en vez de
        // desbordar. De 360 px en adelante caben y no cambia nada.
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6"
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
                className="block rounded-md px-2 py-2 transition-colors hover:bg-crema-dk sm:px-3"
              >
                {e.texto}
              </Link>
            </li>
          ))}
          {/* «Entrar» y «Panel» no caben en un teléfono: con ellos la barra pide
              439 px y la pantalla común tiene 390. Y no es un empate que se
              resuelva apretando —quedarían por debajo del tamaño mínimo cómodo
              para el dedo—, así que sale el que menos falta hace: el acceso es
              para el equipo que sube documentos, no para quien consulta. En
              móvil queda en el pie, y /acceso redirige a /panel si ya hay
              sesión, así que un solo enlace sirve para los dos casos.

              El desborde no era solo cosmético: un teléfono, al encontrar algo
              más ancho que la pantalla, ensancha el área de dibujo a esos 439 px
              y aleja el zoom. La ficha de un documento se veía cortada por eso,
              no por nada de la ficha. */}
          <li className="hidden sm:block">
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
