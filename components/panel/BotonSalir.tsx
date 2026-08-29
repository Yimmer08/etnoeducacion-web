"use client";

import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";

export default function BotonSalir() {
  const router = useRouter();

  async function salir() {
    await crearClienteNavegador().auth.signOut();
    // `refresh()` limpia el caché del layout servidor, que dibuja el Navbar
    // según la sesión. Sin él, el botón sigue diciendo «Panel» ya sin sesión.
    router.refresh();
    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={salir}
      className="rounded-md border border-borde px-3.5 py-2 text-sm transition-colors hover:bg-crema-dk"
    >
      Salir
    </button>
  );
}
