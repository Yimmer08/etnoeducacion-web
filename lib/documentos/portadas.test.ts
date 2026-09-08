import { describe, expect, it } from "vitest";
import { IMAGENES_COLECCION, imagenDeColeccion, portadaTipografica } from "./portadas";

describe("imagenDeColeccion", () => {
  it("devuelve la ilustración de una colección que la tiene", () => {
    expect(imagenDeColeccion("diaspora-africana")).toBe("/colecciones/diaspora-africana.jpg");
  });

  it("tiene ilustración para las nueve colecciones activas", () => {
    // Las nueve de 007_colecciones_de_la_fundacion.sql. Si entra una décima y
    // llega sin dibujo, este test lo dice acá y no la página con un hueco.
    const activas = [
      "cartilla-la-aventura-ancestral",
      "cartillas-lengua-palenkera",
      "catedra-estudios-afrocolombianos",
      "cuentos-afro-del-pacifico-colombiano",
      "diaspora-africana",
      "etnoeducacion",
      "maleta-didactica",
      "poemas",
      "san-basilio-de-palenque",
    ];
    for (const slug of activas) expect(imagenDeColeccion(slug), slug).not.toBeNull();
  });

  it("devuelve null para una colección sin ilustración", () => {
    // Las que 007 desactivó siguen siendo filas de la tabla y nunca tuvieron
    // dibujo: si una se reactiva, cae a la portada tipográfica en vez de pedir
    // un archivo que no existe.
    expect(imagenDeColeccion("historia-y-memoria")).toBeNull();
    expect(imagenDeColeccion("normatividad-y-politica-publica")).toBeNull();
  });

  it("devuelve null para un slug inventado, sin reventar", () => {
    expect(imagenDeColeccion("no-existe")).toBeNull();
    expect(imagenDeColeccion("")).toBeNull();
    // El mapa es un objeto: sin el `?? null`, un slug con el nombre de una
    // propiedad heredada devolvería una función en vez de una ruta.
    expect(imagenDeColeccion("constructor")).toBeNull();
    expect(imagenDeColeccion("toString")).toBeNull();
  });

  it("apunta siempre a un archivo dentro de /colecciones", () => {
    for (const [slug, ruta] of Object.entries(IMAGENES_COLECCION)) {
      expect(ruta, slug).toMatch(/^\/colecciones\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/);
      // La ruta lleva el slug: si alguien renombra una y no la otra, se ve acá
      // y no en la página, con la ilustración equivocada.
      expect(ruta, slug).toContain(slug);
    }
  });
});

describe("portadaTipografica", () => {
  it("toma la inicial en mayúscula", () => {
    expect(portadaTipografica("poemas").letra).toBe("P");
    expect(portadaTipografica("  ley 70 de 1993").letra).toBe("L");
    expect(portadaTipografica("Ñandú").letra).toBe("Ñ");
  });

  it("da el mismo color para el mismo texto, siempre", () => {
    // Si fuera al azar, cada recarga repintaría el listado sin que nada cambie.
    const a = portadaTipografica("San Basilio de Palenque");
    const b = portadaTipografica("San Basilio de Palenque");
    expect(a).toEqual(b);
  });

  it("usa solo colores de la paleta", () => {
    const paleta = ["bg-anil", "bg-tierra", "bg-palma", "bg-ocre"];
    for (const t of ["Poemas", "Diáspora", "x", "1", "ñ", "Cartilla La Aventura Ancestral"]) {
      expect(paleta, t).toContain(portadaTipografica(t).fondo);
    }
  });

  it("no se queda sin letra con un texto vacío o de solo espacios", () => {
    expect(portadaTipografica("").letra).toBe("?");
    expect(portadaTipografica("   ").letra).toBe("?");
    expect(portadaTipografica("").fondo).toBeTruthy();
  });
});
