import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashDeCabeceras, hashearIp, leerIp } from "./ip";

const SAL_ORIGINAL = process.env.ANALITICA_IP_SALT;

beforeEach(() => {
  process.env.ANALITICA_IP_SALT = "sal-de-prueba";
});

afterEach(() => {
  if (SAL_ORIGINAL === undefined) delete process.env.ANALITICA_IP_SALT;
  else process.env.ANALITICA_IP_SALT = SAL_ORIGINAL;
});

describe("leerIp", () => {
  it("toma la PRIMERA de x-forwarded-for (la del cliente, no la del proxy)", () => {
    const h = new Headers({ "x-forwarded-for": "190.24.1.5, 10.0.0.1, 10.0.0.2" });
    expect(leerIp(h)).toBe("190.24.1.5");
  });

  it("cae a x-real-ip si no hay x-forwarded-for", () => {
    expect(leerIp(new Headers({ "x-real-ip": "190.24.1.5" }))).toBe("190.24.1.5");
  });

  it("null cuando no hay ninguna cabecera", () => {
    expect(leerIp(new Headers())).toBeNull();
  });
});

describe("hashearIp", () => {
  it("nunca devuelve la IP en claro", () => {
    const hash = hashearIp("190.24.1.5");
    expect(hash).not.toBeNull();
    expect(hash).not.toContain("190.24");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("la misma IP da el mismo hash (si no, la dedupe de 30 min no serviría)", () => {
    expect(hashearIp("190.24.1.5")).toBe(hashearIp("190.24.1.5"));
  });

  it("IPs distintas dan hashes distintos", () => {
    expect(hashearIp("190.24.1.5")).not.toBe(hashearIp("190.24.1.6"));
  });

  // Cambiar la sal invalida los hashes viejos — que es justo lo que se espera
  // de una rotación de secreto.
  it("con otra sal, el mismo dato da otro hash", () => {
    const conUna = hashearIp("190.24.1.5");
    process.env.ANALITICA_IP_SALT = "otra-sal";
    expect(hashearIp("190.24.1.5")).not.toBe(conUna);
  });

  // Preferimos perder la dedupe antes que guardar una IP en claro por no tener
  // la variable configurada.
  it("sin sal configurada devuelve null, no un hash sin clave", () => {
    delete process.env.ANALITICA_IP_SALT;
    expect(hashearIp("190.24.1.5")).toBeNull();
  });

  it("sin IP devuelve null", () => {
    expect(hashearIp(null)).toBeNull();
  });
});

describe("hashDeCabeceras", () => {
  it("encadena leerIp + hashearIp", () => {
    const h = new Headers({ "x-forwarded-for": "190.24.1.5" });
    expect(hashDeCabeceras(h)).toBe(hashearIp("190.24.1.5"));
  });
});
