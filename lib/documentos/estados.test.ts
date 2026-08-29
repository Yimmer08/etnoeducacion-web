import { describe, expect, it } from "vitest";
import {
  camposDeTransicion,
  puedeEditar,
  puedeTransicionar,
  puedeVer,
  transicionesDisponibles,
  TRANSICIONES,
  type ContextoUsuario,
} from "./estados";

const admin: ContextoUsuario = { rol: "admin", esAutor: false };
const autor: ContextoUsuario = { rol: "colaborador", esAutor: true };
const otro: ContextoUsuario = { rol: "colaborador", esAutor: false };

describe("transicionesDisponibles", () => {
  it("el autor puede mandar su borrador a revisión", () => {
    const acciones = transicionesDisponibles("borrador", autor).map((t) => t.accion);
    expect(acciones).toContain("enviar_a_revision");
  });

  // El punto entero del flujo de revisión: si esto se rompe, un colaborador
  // publica sin que nadie lo mire.
  it("el colaborador NUNCA puede publicar, esté el documento donde esté", () => {
    for (const estado of ["borrador", "en_revision", "rechazado", "archivado", "publicado"] as const) {
      const acciones = transicionesDisponibles(estado, autor).map((t) => t.accion);
      expect(acciones).not.toContain("aprobar");
      expect(acciones).not.toContain("restaurar");
    }
  });

  it("un colaborador que no es el autor no puede hacer nada", () => {
    for (const estado of ["borrador", "en_revision", "rechazado", "archivado", "publicado"] as const) {
      expect(transicionesDisponibles(estado, otro)).toEqual([]);
    }
  });

  it("el admin aprueba, rechaza o pide cambios sobre lo que está en revisión", () => {
    const acciones = transicionesDisponibles("en_revision", admin).map((t) => t.accion);
    expect(acciones).toEqual(
      expect.arrayContaining(["aprobar", "rechazar", "solicitar_cambios", "retirar"])
    );
  });

  it("un documento publicado solo se archiva, no se vuelve a revisar", () => {
    const acciones = transicionesDisponibles("publicado", admin).map((t) => t.accion);
    expect(acciones).toEqual(["archivar"]);
  });

  it("rechazado se puede retomar como borrador", () => {
    expect(puedeTransicionar("rechazado", "corregir", autor)).toBe(true);
    expect(puedeTransicionar("rechazado", "corregir", otro)).toBe(false);
  });

  it("no ofrece acciones que no salgan del estado actual", () => {
    for (const ctx of [admin, autor]) {
      for (const estado of ["borrador", "en_revision", "publicado", "rechazado", "archivado"] as const) {
        for (const t of transicionesDisponibles(estado, ctx)) {
          expect(t.desde).toContain(estado);
        }
      }
    }
  });
});

describe("TRANSICIONES (consistencia del catálogo)", () => {
  it("ninguna transición deja el documento en el mismo estado", () => {
    for (const t of TRANSICIONES) {
      expect(t.desde).not.toContain(t.hacia);
    }
  });

  it("las decisiones negativas exigen comentario", () => {
    for (const accion of ["rechazar", "solicitar_cambios"] as const) {
      const t = TRANSICIONES.find((x) => x.accion === accion);
      expect(t?.exigeComentario).toBe(true);
    }
  });
});

describe("camposDeTransicion", () => {
  const ahora = new Date("2026-08-29T15:00:00.000Z");

  it("aprobar deja fecha de publicación y de revisión", () => {
    const campos = camposDeTransicion("aprobar", { revisorId: "rev-1", ahora });
    expect(campos).toEqual({
      estado: "publicado",
      revisado_por: "rev-1",
      revisado_en: "2026-08-29T15:00:00.000Z",
      publicado_en: "2026-08-29T15:00:00.000Z",
    });
  });

  // Archivar se puede hacer sobre un borrador. Si restaurar lo mandara a
  // «publicado», archivar+restaurar sería un atajo de admin para publicar sin
  // pasar por revisión y sin registro en `revisiones`.
  it("restaurar un documento que NUNCA se publicó lo devuelve a borrador", () => {
    const campos = camposDeTransicion("restaurar", {
      revisorId: "rev-1",
      ahora,
      publicadoEnPrevio: null,
    });
    expect(campos?.estado).toBe("borrador");
    expect(campos).not.toHaveProperty("publicado_en");
  });

  // Un documento de 2024 que se archivó y se restaura hoy no puede saltar al
  // primer puesto de «lo más reciente».
  it("restaurar conserva la fecha de publicación original", () => {
    const campos = camposDeTransicion("restaurar", {
      revisorId: "rev-1",
      ahora,
      publicadoEnPrevio: "2024-03-01T10:00:00.000Z",
    });
    expect(campos?.publicado_en).toBe("2024-03-01T10:00:00.000Z");
    // Restaurar no es una decisión de revisión: no ensucia revisado_por.
    expect(campos?.revisado_por).toBeNull();
  });

  it("enviar a revisión no toca revisado_por ni publicado_en", () => {
    const campos = camposDeTransicion("enviar_a_revision", { revisorId: "rev-1", ahora });
    expect(campos).toEqual({ estado: "en_revision", revisado_por: null, revisado_en: null });
    expect(campos).not.toHaveProperty("publicado_en");
  });

  it("devuelve null si la acción no existe", () => {
    // @ts-expect-error — a propósito: comprueba el caso de una acción inventada
    expect(camposDeTransicion("inventada", { revisorId: "r", ahora })).toBeNull();
  });
});

describe("puedeVer / puedeEditar", () => {
  it("cualquiera ve lo publicado, incluso sin sesión", () => {
    expect(puedeVer({ estado: "publicado", subido_por: "a" }, null)).toBe(true);
  });

  it("un borrador no se ve sin sesión", () => {
    expect(puedeVer({ estado: "borrador", subido_por: "a" }, null)).toBe(false);
  });

  it("el autor ve su borrador, otro colaborador no", () => {
    expect(puedeVer({ estado: "borrador", subido_por: "a" }, autor)).toBe(true);
    expect(puedeVer({ estado: "borrador", subido_por: "a" }, otro)).toBe(false);
  });

  it("el colaborador no edita lo ya publicado", () => {
    expect(puedeEditar({ estado: "publicado", subido_por: "a" }, autor)).toBe(false);
    expect(puedeEditar({ estado: "publicado", subido_por: "a" }, admin)).toBe(true);
  });
});
