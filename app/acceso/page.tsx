import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { perfilActual } from "@/lib/auth/sesion";
import { FUNDACION } from "@/lib/fundacion/config";
import FormularioAcceso from "@/components/FormularioAcceso";

export const metadata: Metadata = {
  title: "Entrar",
  // El login no se indexa: no es contenido del repositorio.
  robots: { index: false, follow: false },
};

export default async function Acceso({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string }>;
}) {
  const [perfil, sp] = await Promise.all([perfilActual(), searchParams]);

  if (perfil) redirect("/panel");

  // Solo se acepta un destino interno. Sin este filtro, `?siguiente=https://…`
  // convierte el login en un redirector abierto: un enlace que parece del
  // repositorio y termina en otro sitio (open redirect).
  const siguiente =
    sp.siguiente && sp.siguiente.startsWith("/") && !sp.siguiente.startsWith("//")
      ? sp.siguiente
      : "/panel";

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl">Entrar</h1>
      <p className="mt-2 text-carbon-suave">
        El acceso es para el equipo de {FUNDACION.nombreCorto} que sube y revisa documentos.
        Para consultar el repositorio no hace falta cuenta.
      </p>

      <div className="mt-8 rounded-lg border border-borde bg-white p-6">
        <FormularioAcceso siguiente={siguiente} />
      </div>

      <p className="mt-6 text-sm text-carbon-suave">
        ¿No tenés cuenta? Las cuentas las crea un administrador —{" "}
        <a href={`mailto:${FUNDACION.correo}`} className="text-anil hover:underline">
          escribinos
        </a>
        .
      </p>

      <Link href="/" className="mt-4 text-sm text-anil hover:underline">
        ← Volver al repositorio
      </Link>
    </div>
  );
}
