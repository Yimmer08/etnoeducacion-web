// ─────────────────────────────────────────────────────────────────────────────
// lib/supabase/admin.ts — Cliente con service_role (SOLO server-side)
//
// Bypassa la RLS por completo. En este proyecto tiene exactamente DOS usos
// legítimos:
//   1. Firmar URLs de descarga de Storage — el bucket es privado y el visitante
//      anónimo no tiene sesión con la que firmar (ver 005_storage.sql).
//   2. Crear perfiles de colaborador desde el panel de admin.
//
// En los dos casos la autorización se comprueba ANTES, con el cliente de
// sesión y su RLS. Este cliente ejecuta, no decide.
//
// La service_role key jamás llega al navegador: no lleva prefijo NEXT_PUBLIC_,
// así que Next.js ni siquiera la incluye en el bundle del cliente.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

export function crearClienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !claveServicio) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno."
    );
  }

  return createClient(url, claveServicio, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
