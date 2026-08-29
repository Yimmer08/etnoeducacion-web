// ─────────────────────────────────────────────────────────────────────────────
// scripts/cargar-documentos.test.mjs — La parte pura del cargador masivo
//
// El script habla con Supabase, pero todo lo que puede equivocarse —reconocer
// una carpeta, sacar un título de un nombre de archivo, decidir el MIME— es
// puro y se comprueba acá. Mismo criterio que `lib/` en la aplicación.
//
// Además hay dos tests de PARIDAD contra `lib/documentos/archivos.ts`: el
// script duplica `generarSlug` y la tabla de MIMEs porque corre con `node`
// pelado y no puede importar TypeScript. Duplicar es aceptable; divergir no, y
// eso es lo que estos tests impiden.
// ─────────────────────────────────────────────────────────────────────────────

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatearBytes as formatearBytesLib,
  generarSlug as generarSlugLib,
  MIMES_PERMITIDOS,
  slugUnico as slugUnicoLib,
} from "@/lib/documentos/archivos";
import {
  archivosDe,
  coleccionDeCarpeta,
  esCarpetaDeSistema,
  formatearBytes,
  generarSlug,
  mimeDeExtension,
  MIMES_POR_EXTENSION,
  normalizar,
  parsearOpciones,
  slugUnico,
  tituloDesdeNombre,
} from "./cargar-documentos.mjs";

describe("normalizar", () => {
  it("quita tildes, signos y espacios de más", () => {
    expect(normalizar("  Etnoeducación   Afro  ")).toBe("ETNOEDUCACION AFRO");
    expect(normalizar("SAN_BASILIO-DE.PALENQUE")).toBe("SAN BASILIO DE PALENQUE");
  });
});

describe("coleccionDeCarpeta", () => {
  it("reconoce el nombre exacto de la carpeta", () => {
    expect(coleccionDeCarpeta("POEMAS")?.slug).toBe("poemas");
    expect(coleccionDeCarpeta("DIASPORA AFRICANA")?.slug).toBe("diaspora-africana");
  });

  it("no se pierde por las tildes ni por la capitalización", () => {
    expect(coleccionDeCarpeta("ETNOEDUCACIÓN")?.slug).toBe("etnoeducacion");
    expect(coleccionDeCarpeta("Maleta Didáctica")?.slug).toBe("maleta-didactica");
  });

  it("acepta la grafía que usa la fundación aunque no sea la canónica", () => {
    // La carpeta dice «BACILIO»; la colección se llama «San Basilio».
    expect(coleccionDeCarpeta("SAN BACILIO DE PALENQUE")?.slug).toBe("san-basilio-de-palenque");
    expect(coleccionDeCarpeta("CARTILLAS LENGUA PALENQUERA")?.slug).toBe("cartillas-lengua-palenkera");
  });

  it("reconoce la carpeta aunque tenga cola de más", () => {
    // El caso real: el nombre completo de la carpeta no cabía en la pantalla.
    expect(coleccionDeCarpeta("CARTILLAA LA AVENTURA ANCESTRAL DE LOS ABUELOS")?.slug).toBe(
      "cartilla-la-aventura-ancestral"
    );
    expect(coleccionDeCarpeta("CUENTOS AFRO DEL PACIFICO COLOMBIANO 2024")?.slug).toBe(
      "cuentos-afro-del-pacifico-colombiano"
    );
  });

  it("devuelve null para lo que no es acervo", () => {
    expect(coleccionDeCarpeta("Imagenes Iphone")).toBeNull();
    expect(coleccionDeCarpeta("Descargas")).toBeNull();
    expect(coleccionDeCarpeta("")).toBeNull();
  });

  it("no casa por un prefijo corto de casualidad", () => {
    // «CARTILLAS DE COCINA» empieza como «CARTILLAS LENGUA…» pero no es eso.
    expect(coleccionDeCarpeta("CARTILLAS DE COCINA")).toBeNull();
  });
});

describe("esCarpetaDeSistema", () => {
  it("reconoce la basura que dejan Android, Windows y macOS", () => {
    expect(esCarpetaDeSistema("LOST.DIR")).toBe(true);
    expect(esCarpetaDeSistema("System Volume Information")).toBe(true);
    expect(esCarpetaDeSistema("$RECYCLE.BIN")).toBe(true);
    expect(esCarpetaDeSistema(".Trashes")).toBe(true);
  });

  it("deja pasar una carpeta de verdad", () => {
    expect(esCarpetaDeSistema("POEMAS")).toBe(false);
    expect(esCarpetaDeSistema("MALETA DIDACTICA")).toBe(false);
  });
});

describe("mimeDeExtension", () => {
  it("saca el MIME de la extensión, sin importar la caja", () => {
    expect(mimeDeExtension("cartilla.pdf")).toBe("application/pdf");
    expect(mimeDeExtension("CARTILLA.PDF")).toBe("application/pdf");
    expect(mimeDeExtension("audio.mp3")).toBe("audio/mpeg");
  });

  it("devuelve null para lo que el bucket no acepta", () => {
    expect(mimeDeExtension("instalador.exe")).toBeNull();
    expect(mimeDeExtension("comprimido.zip")).toBeNull();
    expect(mimeDeExtension("sin-extension")).toBeNull();
  });

  it("coincide con la lista de la aplicación", () => {
    // Si `MIMES_PERMITIDOS` gana un formato, esta tabla tiene que ganarlo
    // también: si no, el script se salta archivos que el panel sí acepta.
    for (const [mime, extensiones] of Object.entries(MIMES_PERMITIDOS)) {
      for (const extension of extensiones) {
        expect(MIMES_POR_EXTENSION[extension], `falta .${extension}`).toBe(mime);
      }
    }
    expect(Object.keys(MIMES_POR_EXTENSION).length).toBe(
      Object.values(MIMES_PERMITIDOS).flat().length
    );
  });
});

describe("tituloDesdeNombre", () => {
  it("pasa un nombre en mayúsculas a capitalización de título", () => {
    expect(tituloDesdeNombre("CUENTOS DEL PACIFICO.pdf")).toBe("Cuentos del Pacifico");
    expect(tituloDesdeNombre("LA AVENTURA ANCESTRAL.PDF")).toBe("La Aventura Ancestral");
  });

  it("respeta el nombre que ya viene escrito con minúsculas", () => {
    expect(tituloDesdeNombre("Ley 70 de 1993.pdf")).toBe("Ley 70 de 1993");
  });

  it("quita la numeración de orden y los guiones bajos", () => {
    expect(tituloDesdeNombre("01 - CARTILLA UNO.pdf")).toBe("Cartilla Uno");
    expect(tituloDesdeNombre("3. POEMAS DE PALENQUE.pdf")).toBe("Poemas de Palenque");
    expect(tituloDesdeNombre("MALETA_DIDACTICA_MODULO_2.pdf")).toBe("Maleta Didactica Modulo 2");
  });

  it("no deja un título vacío", () => {
    expect(tituloDesdeNombre("___.pdf")).toBe("Documento sin título");
    expect(tituloDesdeNombre("   .pdf")).toBe("Documento sin título");
  });
});

describe("parsearOpciones", () => {
  it("separa banderas, valores y argumentos sueltos", () => {
    const { opciones, sueltos } = parsearOpciones([
      "D:/ACERVO",
      "--dry-run",
      "--estado=publicado",
      "--limite=3",
    ]);

    expect(sueltos).toEqual(["D:/ACERVO"]);
    expect(opciones["dry-run"]).toBe(true);
    expect(opciones.estado).toBe("publicado");
    expect(opciones.limite).toBe("3");
  });

  it("no parte un valor que tenga signos igual", () => {
    const { opciones } = parsearOpciones(["--perfil=a=b"]);
    expect(opciones.perfil).toBe("a=b");
  });
});

describe("archivosDe", () => {
  /** Un acervo de mentira en disco, con las trampas del acervo de verdad. */
  async function acervoDePrueba() {
    const raiz = await mkdtemp(join(tmpdir(), "acervo-"));

    await mkdir(join(raiz, "modulo 2"), { recursive: true });
    await mkdir(join(raiz, "LOST.DIR"), { recursive: true });
    await mkdir(join(raiz, ".oculta"), { recursive: true });

    await writeFile(join(raiz, "cartilla.pdf"), "x");
    await writeFile(join(raiz, "anexo.pdf"), "x");
    await writeFile(join(raiz, ".DS_Store"), "x");
    await writeFile(join(raiz, "modulo 2", "guia.pdf"), "x");
    await writeFile(join(raiz, "LOST.DIR", "FILE0001.CHK"), "x");
    await writeFile(join(raiz, ".oculta", "no-va.pdf"), "x");

    return raiz;
  }

  it("baja a las subcarpetas y deja fuera lo que no es acervo", async () => {
    const raiz = await acervoDePrueba();
    const encontrados = (await archivosDe(raiz)).map((r) => r.slice(raiz.length + 1));

    // El de «modulo 2» va incluido: una subcarpeta no es otra colección.
    // Fuera quedan la carpeta que dejó Android, la oculta y el .DS_Store.
    expect(encontrados.sort()).toEqual(
      ["anexo.pdf", "cartilla.pdf", join("modulo 2", "guia.pdf")].sort()
    );
  });
});

describe("paridad con lib/documentos/archivos.ts", () => {
  const casos = [
    "Cuentos del Pacífico colombiano",
    "LA AVENTURA ANCESTRAL",
    "Ley 70 de 1993 — comunidades negras",
    "  ¿Qué es la etnoeducación?  ",
    "ñandú Ñ",
    "a".repeat(120),
    "Cartilla de lengua palenkera para primero de primaria y para el trabajo comunitario",
    "...",
  ];

  it("genera exactamente el mismo slug que la aplicación", () => {
    for (const caso of casos) {
      expect(generarSlug(caso), `slug de «${caso}»`).toBe(generarSlugLib(caso));
    }
  });

  it("desempata los slugs repetidos igual que la aplicación", () => {
    const ocupados = ["poemas", "poemas-2", "poemas-3"];
    expect(slugUnico("poemas", ocupados)).toBe(slugUnicoLib("poemas", ocupados));
    expect(slugUnico("otro", ocupados)).toBe(slugUnicoLib("otro", ocupados));
  });

  it("formatea los bytes igual que la aplicación", () => {
    for (const bytes of [0, 512, 1024, 1_500_000, 52_428_800, 3_000_000_000]) {
      expect(formatearBytes(bytes), `${bytes} bytes`).toBe(formatearBytesLib(bytes));
    }
  });
});
