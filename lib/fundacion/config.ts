// ─────────────────────────────────────────────────────────────────────────────
// lib/fundacion/config.ts — Identidad de la fundación, en un solo lugar
//
// Todo lo que cambia si la fundación cambia de nombre, correo o dominio vive
// acá y en ningún otro archivo. Es a propósito: cuando el nombre queda repartido
// entre el layout, el SEO y media docena de componentes, renombrar algo se
// convierte en un grep completo y siempre queda uno sin cambiar.
// ─────────────────────────────────────────────────────────────────────────────

export const FUNDACION = {
  nombre: "Fundación Luker",
  nombreCorto: "Fundación Luker",
  lema: "Repositorio de Etnoeducación Afrocolombiana",
  descripcion:
    "Archivo abierto de materiales para la enseñanza de la historia, las " +
    "lenguas y los saberes del pueblo negro, afrocolombiano, raizal y palenquero.",
  correo: "CAMBIAME@fundacionluker.org",
  ciudad: "Colombia",
} as const;

/**
 * URL pública del sitio. En Vercel llega por `NEXT_PUBLIC_SITE_URL`; el
 * fallback a `VERCEL_URL` cubre los previews de cada PR, que no tienen dominio
 * fijo. `localhost` queda de último para el desarrollo local.
 */
export const SITIO_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");