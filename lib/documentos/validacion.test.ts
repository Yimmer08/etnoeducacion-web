import { describe, expect, it } from "vitest";
import { erroresPorCampo, esquemaDocumento, esquemaRevision } from "./validacion";

const base = {
  titulo: "Cartilla de Cátedra Afro",
  idioma: "es",
  tipo: "cartilla",
  licencia: "cc_by",
};

describe("esquemaDocumento", () => {
  it("acepta lo mínimo y rellena los opcionales con null / []", () => {
    const r = esquemaDocumento.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.subtitulo).toBeNull();
      expect(r.data.anio).toBeNull();
      expect(r.data.autores).toEqual([]);
      expect(r.data.etiquetas).toEqual([]);
    }
  });

  // Un campo que se dejó en blanco tiene que llegar como null, no como "".
  // Si no, la ficha muestra renglones vacíos en vez de omitir el dato.
  it("convierte la cadena vacía del formulario en null", () => {
    const r = esquemaDocumento.safeParse({ ...base, subtitulo: "", fuente: "  ", anio: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.subtitulo).toBeNull();
      expect(r.data.fuente).toBeNull();
      expect(r.data.anio).toBeNull();
    }
  });

  it("el año llega como número aunque el formulario lo mande como texto", () => {
    const r = esquemaDocumento.safeParse({ ...base, anio: "1993" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.anio).toBe(1993);
  });

  it("rechaza un título demasiado corto", () => {
    const r = esquemaDocumento.safeParse({ ...base, titulo: "ab" });
    expect(r.success).toBe(false);
  });

  it("rechaza tipo, idioma y licencia fuera de catálogo", () => {
    expect(esquemaDocumento.safeParse({ ...base, tipo: "podcast" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, idioma: "zz" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, licencia: "gpl" }).success).toBe(false);
  });

  // Los mismos límites que el CHECK `documentos_anio_razonable` de la 001: si
  // acá pasara, Postgres lo rechazaría con un error mucho peor de leer.
  it("respeta el rango de años de la migración", () => {
    expect(esquemaDocumento.safeParse({ ...base, anio: 1499 }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, anio: 2201 }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, anio: 1993 }).success).toBe(true);
  });

  it("acepta las lenguas criollas", () => {
    expect(esquemaDocumento.safeParse({ ...base, idioma: "pln" }).success).toBe(true);
    expect(esquemaDocumento.safeParse({ ...base, idioma: "icr" }).success).toBe(true);
  });

  it("la portada tiene que ser https, no http ni javascript:", () => {
    expect(esquemaDocumento.safeParse({ ...base, portada_url: "http://x.org/a.jpg" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, portada_url: "javascript:alert(1)" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, portada_url: "https://x.org/a.jpg" }).success).toBe(true);
  });

  it("las etiquetas tienen que venir como slug", () => {
    expect(esquemaDocumento.safeParse({ ...base, etiquetas: ["Tradición Oral"] }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, etiquetas: ["tradicion-oral"] }).success).toBe(true);
  });

  it("una colección tiene que ser un uuid", () => {
    expect(esquemaDocumento.safeParse({ ...base, coleccion_id: "material-didactico" }).success).toBe(false);
  });
});

describe("esquemaRevision", () => {
  const doc = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

  it("aprobar no exige comentario", () => {
    const r = esquemaRevision.safeParse({ documento_id: doc, decision: "aprobado" });
    expect(r.success).toBe(true);
  });

  // Mismo criterio que el constraint `revisiones_negativa_con_motivo` de la
  // migración 001: sin motivo, quien subió el documento no sabe qué corregir.
  it("rechazar o pedir cambios SIN motivo no pasa", () => {
    for (const decision of ["rechazado", "cambios_solicitados"] as const) {
      const r = esquemaRevision.safeParse({ documento_id: doc, decision });
      expect(r.success).toBe(false);
      if (!r.success) expect(erroresPorCampo(r.error)).toHaveProperty("comentario");
    }
  });

  it("un motivo demasiado corto tampoco pasa", () => {
    const r = esquemaRevision.safeParse({ documento_id: doc, decision: "rechazado", comentario: "no sirve" });
    expect(r.success).toBe(false);
  });

  it("con motivo suficiente sí pasa", () => {
    const r = esquemaRevision.safeParse({
      documento_id: doc,
      decision: "cambios_solicitados",
      comentario: "Faltan las páginas 4 y 5 del escaneo.",
      crit_calidad: 2,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.crit_calidad).toBe(2);
  });

  it("las calificaciones van de 1 a 5", () => {
    const conNota = (n: number) =>
      esquemaRevision.safeParse({ documento_id: doc, decision: "aprobado", crit_pertinencia: n });
    expect(conNota(0).success).toBe(false);
    expect(conNota(6).success).toBe(false);
    expect(conNota(5).success).toBe(true);
  });
});

describe("erroresPorCampo", () => {
  it("deja un solo mensaje por campo, el primero", () => {
    const r = esquemaDocumento.safeParse({ titulo: "a", tipo: "x", idioma: "es", licencia: "cc_by" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errores = erroresPorCampo(r.error);
      expect(Object.keys(errores)).toEqual(expect.arrayContaining(["titulo", "tipo"]));
      expect(typeof errores.titulo).toBe("string");
    }
  });
});
