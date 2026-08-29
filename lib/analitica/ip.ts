// ─────────────────────────────────────────────────────────────────────────────
// lib/analitica/ip.ts — Hash de IP para no contar dos veces el mismo clic
//
// La IP NUNCA se guarda en claro. Se guarda un HMAC-SHA256 con una sal del
// servidor, que sirve para una sola cosa: reconocer que dos descargas seguidas
// vienen del mismo lado y no contarlas dos veces (la dedupe de 30 minutos de
// `registrar_evento_documento`, migración 004).
//
// Es HMAC y no un SHA256 pelado a propósito: el espacio de direcciones IPv4
// tiene ~4.300 millones de valores, o sea que un SHA256 sin clave se revierte
// con una tabla precalculada en cuestión de horas. Con la sal secreta de por
// medio, el hash no se puede volver a una IP sin tener la sal.
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac } from "node:crypto";

/**
 * La IP de quien hace la petición, leída de las cabeceras del proxy.
 *
 * `x-forwarded-for` puede traer una cadena («cliente, proxy1, proxy2»): la
 * primera es la del cliente. En Vercel la cabecera la escribe el proxy, así
 * que no la puede falsear el navegador; en otro alojamiento habría que
 * revisarlo antes de confiar en ella.
 */
export function leerIp(cabeceras: Headers): string | null {
  const reenviada = cabeceras.get("x-forwarded-for");
  if (reenviada) {
    const primera = reenviada.split(",")[0]?.trim();
    if (primera) return primera;
  }
  return cabeceras.get("x-real-ip")?.trim() || null;
}

/**
 * Hash de la IP. Devuelve `null` si no hay IP o si falta la sal — y en ese
 * caso el evento se registra igual, solo que sin deduplicar. Preferimos una
 * estadística con algo de ruido antes que guardar una IP en claro por no tener
 * una variable de entorno configurada.
 */
export function hashearIp(ip: string | null): string | null {
  if (!ip) return null;

  const sal = process.env.ANALITICA_IP_SALT;
  if (!sal) return null;

  return createHmac("sha256", sal).update(ip).digest("hex");
}

/** Atajo: de las cabeceras al hash, que es como se usa en las rutas. */
export function hashDeCabeceras(cabeceras: Headers): string | null {
  return hashearIp(leerIp(cabeceras));
}
