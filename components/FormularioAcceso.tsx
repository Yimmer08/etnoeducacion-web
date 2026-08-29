"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";

export default function FormularioAcceso({ siguiente }: { siguiente: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setCargando(true);

    const datos = new FormData(evento.currentTarget);
    const supabase = crearClienteNavegador();

    const { error: fallo } = await supabase.auth.signInWithPassword({
      email: String(datos.get("correo") ?? ""),
      password: String(datos.get("clave") ?? ""),
    });

    if (fallo) {
      // Un mensaje único para credenciales malas: decir «ese correo no existe»
      // le confirma a cualquiera qué correos tienen cuenta acá.
      setError("Correo o contraseña incorrectos.");
      setCargando(false);
      return;
    }

    // `refresh()` antes de `push()`: sin él, el layout servidor (que dibuja el
    // Navbar según la sesión) se queda con la versión cacheada de antes de
    // entrar, y el botón sigue diciendo «Entrar» ya estando adentro.
    router.refresh();
    router.push(siguiente);
  }

  const claseCampo =
    "w-full rounded-md border border-borde bg-white px-3 py-2.5 focus:border-anil";

  return (
    <form onSubmit={entrar} className="space-y-4">
      <div>
        <label htmlFor="correo" className="mb-1.5 block text-sm font-medium">
          Correo
        </label>
        <input
          id="correo"
          name="correo"
          type="email"
          required
          autoComplete="email"
          className={claseCampo}
        />
      </div>

      <div>
        <label htmlFor="clave" className="mb-1.5 block text-sm font-medium">
          Contraseña
        </label>
        <input
          id="clave"
          name="clave"
          type="password"
          required
          autoComplete="current-password"
          className={claseCampo}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-tierra/10 px-3 py-2 text-sm text-tierra">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={cargando}
        className="w-full rounded-md bg-anil px-4 py-2.5 font-medium text-crema transition-colors hover:bg-anil-lt disabled:opacity-60"
      >
        {cargando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
