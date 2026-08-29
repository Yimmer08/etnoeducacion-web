// ─────────────────────────────────────────────────────────────────────────────
// proxy.ts — Renovación de la sesión de Supabase
//
// Se llama `proxy.ts` y no `middleware.ts` porque Next.js 16 renombró la
// convención; `middleware.ts` sigue funcionando pero avisa que está obsoleto
// en cada build.
//
// Hace UNA sola cosa: refrescar el token antes de que la página se renderice, y
// mandar al login a quien entre a /panel sin sesión. Nada más.
//
// ⚠️ Esto NO es el control de acceso. Corre en el borde, con la cookie
// como única fuente, y una cookie se puede fabricar. Quien decide qué datos
// salen es la RLS de Postgres, y `exigirPerfil()`/`exigirAdmin()` la
// comprueban de nuevo del lado del servidor en cada página del panel. Esto es
// para que no aparezca un panel vacío antes del redirect.
// ─────────────────────────────────────────────────────────────────────────────

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export default async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/panel")) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/acceso";
    // Para volver a donde iba después de entrar.
    destino.searchParams.set("siguiente", request.nextUrl.pathname);
    return NextResponse.redirect(destino);
  }

  return respuesta;
}

export const config = {
  matcher: [
    /*
     * Todo menos los estáticos de Next, el favicon y las imágenes. Sin esta
     * exclusión esto corre en cada archivo del build y le agrega una llamada a
     * Supabase a cada uno.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
