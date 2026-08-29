import { createBrowserClient } from "@supabase/ssr";

/** Cliente para componentes del navegador. Solo la anon key: la RLS es la barrera. */
export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
