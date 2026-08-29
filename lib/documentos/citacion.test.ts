import { describe, expect, it } from "vitest";
import {
  citaTexto,
  enlaceLicencia,
  formatearAutores,
  formatearFecha,
  formatearNumero,
  nombreDescarga,
  permiteDescargaDirecta,
} from "./citacion";

describe("formatearAutores", () => {
  it("uno, dos y tres autores", () => {
    expect(formatearAutores(["Pérez, J."])).toBe("Pérez, J.");
    expect(formatearAutores(["Pérez, J.", "Mosquera, C."])).toBe("Pérez, J. y Mosquera, C.");
    expect(formatearAutores(["A", "B", "C"])).toBe("A, B y C");
  });

  it("a partir del cuarto corta con «y otros»", () => {
    expect(formatearAutores(["A", "B", "C", "D"])).toBe("A, B, C y otros");
  });

  it("ignora entradas vacías", () => {
    expect(formatearAutores(["  ", "Pérez, J.", ""])).toBe("Pérez, J.");
  });

  // Mucha normativa y mucho material comunitario no tiene autoría individual.
  it("dice algo legible cuando no hay autoría", () => {
    expect(formatearAutores([])).toBe("Sin autoría registrada");
  });
});

describe("citaTexto", () => {
  it("arma la cita con lo que hay", () => {
    const cita = citaTexto({
      titulo: "Cátedra de Estudios Afrocolombianos",
      subtitulo: "guía para docentes",
      autores: ["Ministerio de Educación Nacional"],
      anio: 2001,
      fuente: "MEN",
      slug: "catedra-guia",
    });
    expect(cita).toBe(
      "Ministerio de Educación Nacional. (2001). Cátedra de Estudios Afrocolombianos: guía para docentes. MEN."
    );
  });

  it("omite lo que falta en vez de dejar huecos", () => {
    const cita = citaTexto({ titulo: "Alabaos del San Juan", autores: [], anio: null, slug: "alabaos" });
    expect(cita).toBe("Sin autoría registrada. (s. f.). Alabaos del San Juan.");
    expect(cita).not.toContain("undefined");
    expect(cita).not.toContain("null");
  });

  it("agrega la URL cuando se le pasa la base, sin barra doble", () => {
    const cita = citaTexto(
      { titulo: "T", autores: ["A"], anio: 2020, slug: "t" },
      "https://repo.example.org/"
    );
    expect(cita).toContain("https://repo.example.org/documentos/t");
    expect(cita).not.toContain("org//documentos");
  });
});

describe("nombreDescarga", () => {
  it("usa el slug y conserva la extensión original", () => {
    expect(nombreDescarga("ley-70-de-1993", "Ley 70 (escaneada).pdf")).toBe("ley-70-de-1993.pdf");
  });

  it("sin extensión, deja el slug pelado", () => {
    expect(nombreDescarga("documento", "archivo")).toBe("documento");
  });
});

describe("licencias", () => {
  it("las Creative Commons llevan enlace, las demás no", () => {
    expect(enlaceLicencia("cc_by_nc_sa")).toContain("creativecommons.org");
    expect(enlaceLicencia("dominio_publico")).toBeNull();
    expect(enlaceLicencia("derechos_reservados")).toBeNull();
  });

  // Es lo que decide si la ficha ofrece el botón de descarga o solo el visor.
  it("solo lo redistribuible se puede descargar directo", () => {
    expect(permiteDescargaDirecta("cc_by")).toBe(true);
    expect(permiteDescargaDirecta("dominio_publico")).toBe(true);
    expect(permiteDescargaDirecta("con_permiso")).toBe(false);
    expect(permiteDescargaDirecta("derechos_reservados")).toBe(false);
  });
});

describe("formato", () => {
  it("fecha en español de Colombia", () => {
    expect(formatearFecha("2026-08-29T15:00:00.000Z")).toBe("29 de agosto de 2026");
  });

  it("una fecha ausente o inválida no rompe la ficha", () => {
    expect(formatearFecha(null)).toBe("—");
    expect(formatearFecha("no-es-fecha")).toBe("—");
  });

  it("miles con punto, como se escribe en Colombia", () => {
    expect(formatearNumero(1234)).toBe("1.234");
  });
});
