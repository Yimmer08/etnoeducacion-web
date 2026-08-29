import { describe, expect, it } from "vitest";
import {
  extensionDe,
  formatearBytes,
  generarSlug,
  MAX_BYTES,
  rutaEnStorage,
  seVeEnLinea,
  slugUnico,
  validarArchivo,
} from "./archivos";

describe("extensionDe", () => {
  it("saca la extensión en minúsculas", () => {
    expect(extensionDe("Cartilla.PDF")).toBe("pdf");
    expect(extensionDe("catedra afro.docx")).toBe("docx");
  });

  it("usa el último punto, no el primero", () => {
    expect(extensionDe("ley.70.de.1993.pdf")).toBe("pdf");
  });

  it("vacío cuando no hay extensión de verdad", () => {
    expect(extensionDe("sin-extension")).toBe("");
    expect(extensionDe(".oculto")).toBe(""); // nombre que empieza por punto, no extensión
    expect(extensionDe("termina-en-punto.")).toBe("");
  });
});

describe("validarArchivo", () => {
  const pdfValido = { nombre: "cartilla.pdf", bytes: 1_000_000, mime: "application/pdf" };

  it("acepta un PDF normal", () => {
    expect(validarArchivo(pdfValido)).toEqual({ ok: true });
  });

  it("rechaza el archivo vacío", () => {
    const r = validarArchivo({ ...pdfValido, bytes: 0 });
    expect(r.ok).toBe(false);
  });

  it("rechaza lo que pase de 50 MB, y dice cuánto pesa", () => {
    const r = validarArchivo({ ...pdfValido, bytes: MAX_BYTES + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain("50.0 MB");
  });

  it("rechaza un formato que no está en la lista", () => {
    const r = validarArchivo({ nombre: "virus.exe", bytes: 100, mime: "application/x-msdownload" });
    expect(r.ok).toBe(false);
  });

  // El caso torpe pero real: alguien renombra un .exe a .pdf, o al revés, el
  // navegador reporta un MIME y la extensión dice otra cosa.
  it("rechaza cuando la extensión no corresponde al MIME declarado", () => {
    const r = validarArchivo({ nombre: "documento.exe", bytes: 100, mime: "application/pdf" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain(".exe");
  });

  it("acepta jpg y jpeg para image/jpeg", () => {
    expect(validarArchivo({ nombre: "foto.jpg", bytes: 500, mime: "image/jpeg" }).ok).toBe(true);
    expect(validarArchivo({ nombre: "foto.jpeg", bytes: 500, mime: "image/jpeg" }).ok).toBe(true);
  });
});

describe("rutaEnStorage", () => {
  // Si la primera carpeta deja de ser el id del perfil, la RLS de Storage
  // (005_storage.sql) empieza a devolver 403 en cada subida.
  it("la primera carpeta es SIEMPRE el id del perfil", () => {
    const ruta = rutaEnStorage("perfil-abc", "Mi Cartilla Afro.pdf", "uuid-123");
    expect(ruta).toBe("perfil-abc/uuid-123.pdf");
    expect(ruta.split("/")[0]).toBe("perfil-abc");
  });

  it("no arrastra el nombre original (espacios, tildes, nombres de personas)", () => {
    const ruta = rutaEnStorage("p1", "Informe de María Ñáñez (final).pdf", "u1");
    expect(ruta).toBe("p1/u1.pdf");
  });

  it("sin extensión, la ruta queda sin punto colgando", () => {
    expect(rutaEnStorage("p1", "archivo", "u1")).toBe("p1/u1");
  });
});

describe("formatearBytes", () => {
  it("escala de B a GB", () => {
    expect(formatearBytes(512)).toBe("512 B");
    expect(formatearBytes(2048)).toBe("2 KB");
    expect(formatearBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatearBytes(3 * 1024 * 1024 * 1024)).toBe("3.0 GB");
  });

  it("no revienta con basura", () => {
    expect(formatearBytes(-1)).toBe("—");
    expect(formatearBytes(Number.NaN)).toBe("—");
  });
});

describe("generarSlug", () => {
  it("quita tildes y eñes", () => {
    expect(generarSlug("Etnoeducación y Cátedra Afro")).toBe("etnoeducacion-y-catedra-afro");
    expect(generarSlug("Niños del Chocó")).toBe("ninos-del-choco");
  });

  it("colapsa signos y espacios en un solo guion", () => {
    expect(generarSlug("Ley 70 de 1993 — Comunidades Negras")).toBe(
      "ley-70-de-1993-comunidades-negras"
    );
  });

  it("no deja guiones sueltos en los bordes", () => {
    expect(generarSlug("  ¡Currulao!  ")).toBe("currulao");
  });

  it("cae a «documento» si no queda nada usable", () => {
    expect(generarSlug("¿¿¿???")).toBe("documento");
    expect(generarSlug("")).toBe("documento");
  });

  it("corta largo, pero en un guion — nunca a mitad de palabra", () => {
    const slug = generarSlug(
      "Cartilla de etnoeducacion afrocolombiana para docentes de basica primaria del pacifico"
    );
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug).toBe(
      "cartilla-de-etnoeducacion-afrocolombiana-para-docentes-de-basica-primaria-del"
    );
  });

  it("el resultado siempre pasa el CHECK de la migración 001", () => {
    const patronDeLaMigracion = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    for (const entrada of ["Ñ", "  ---  ", "Ley 70", "ÁÉÍÓÚ", "a".repeat(200), "2 + 2"]) {
      expect(generarSlug(entrada)).toMatch(patronDeLaMigracion);
    }
  });
});

describe("slugUnico", () => {
  it("devuelve la base si está libre", () => {
    expect(slugUnico("currulao", ["otro"])).toBe("currulao");
  });

  it("numera desde 2 y salta los ocupados", () => {
    expect(slugUnico("currulao", ["currulao"])).toBe("currulao-2");
    expect(slugUnico("currulao", ["currulao", "currulao-2", "currulao-3"])).toBe("currulao-4");
  });
});

describe("seVeEnLinea", () => {
  it("PDF, imagen, audio y mp4 sí; Word no", () => {
    expect(seVeEnLinea("application/pdf")).toBe(true);
    expect(seVeEnLinea("image/png")).toBe(true);
    expect(seVeEnLinea("audio/mpeg")).toBe(true);
    expect(seVeEnLinea("video/mp4")).toBe(true);
    expect(
      seVeEnLinea("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    ).toBe(false);
  });
});
