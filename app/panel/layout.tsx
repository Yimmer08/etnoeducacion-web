import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/sesion";
import BotonSalir from "@/components/panel/BotonSalir";

export const metadata = { robots: { index: false, follow: false } };

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  // Segunda comprobación, del lado del servidor. El middleware ya mandó al
  // login a quien no tenga cookie, pero el middleware corre en el borde y solo
  // ve la cookie; esto valida el token contra Supabase.
  const perfil = await exigirPerfil();

  const enlaces = [
    { href: "/panel", texto: "Inicio", soloAdmin: false },
    { href: "/panel/subir", texto: "Subir documento", soloAdmin: false },
    { href: "/panel/documentos", texto: "Documentos", soloAdmin: false },
    { href: "/panel/revision", texto: "Cola de revisión", soloAdmin: true },
    { href: "/panel/estadisticas", texto: "Estadísticas", soloAdmin: true },
  ].filter((e) => !e.soloAdmin || perfil.rol === "admin");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-borde pb-4">
        <div>
          <h1 className="font-display text-2xl">Panel</h1>
          <p className="text-sm text-carbon-suave">
            {perfil.nombre} ·{" "}
            <span className="capitalize">{perfil.rol === "admin" ? "Administrador" : "Colaborador"}</span>
          </p>
        </div>
        <BotonSalir />
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Panel" className="lg:sticky lg:top-20 lg:self-start">
          <ul className="flex flex-wrap gap-1 lg:flex-col">
            {enlaces.map((e) => (
              <li key={e.href}>
                <Link
                  href={e.href}
                  className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-crema-dk"
                >
                  {e.texto}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>{children}</div>
      </div>
    </div>
  );
}
