// ─────────────────────────────────────────────────────────────────────────────
// lib/auth/sesion.ts — Quién está mirando
//
// ⚠️ Estas funciones son para DECIDIR QUÉ SE DIBUJA, no para proteger datos.
// La protección real es la RLS: aunque alguien llegue a `/panel` saltándose el
// middleware, sus consultas siguen devolviendo solo lo suyo.
//
// Se usa `getUser()` y no `getSession()` a propósito: `getSession()` lee la
// cookie y confía en ella, mientras que `getUser()` valida el token contra el
// servidor de Supabase. En el servidor, la cookie es exactamente lo que no se
// puede dar por bueno.
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/documentos/tipos";

export async function perfilActual(): Promise<Perfil | null> {
  const supabase = await crearClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, organizacion, activo")
    .eq("id", user.id)
    .maybeSingle();

  // Un perfil desactivado es como no tener perfil: la RLS ya lo trata así
  // (`es_equipo()` exige `activo = true`), y la interfaz tiene que coincidir.
  if (!data || !data.activo) return null;

  return data as Perfil;
}

/** Para las páginas del panel: sin perfil, al login. */
export async function exigirPerfil(): Promise<Perfil> {
  const perfil = await perfilActual();
  if (!perfil) redirect("/acceso");
  return perfil;
}

/** Para lo que solo hace un admin: revisar, publicar, gestionar colecciones. */
export async function exigirAdmin(): Promise<Perfil> {
  const perfil = await exigirPerfil();
  if (perfil.rol !== "admin") redirect("/panel");
  return perfil;
}
