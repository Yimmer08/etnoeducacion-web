import { describe, expect, it } from "vitest";
import {
  columnaDeOrden,
  filtrosAQuery,
  hayFiltrosActivos,
  leerFiltros,
  normalizarConsulta,
  rangoDePagina,
  totalDePaginas,
  FILTROS_VACIOS,
} from "./busqueda";

const leer = (qs: string) => leerFiltros(new URLSearchParams(qs));

describe("leerFiltros", () => {
  it("sin parámetros devuelve los valores por defecto", () => {
    expect(leer("")).toEqual(FILTROS_VACIOS);
  });

  it("lee un filtro completo", () => {
    const f = leer("q=currulao&tipo=cartilla&coleccion=material-didactico&desde=1990&hasta=2020&orden=titulo&pagina=3");
    expect(f).toMatchObject({
      q: "currulao",
      tipo: "cartilla",
      coleccion: "material-didactico",
      anioDesde: 1990,
      anioHasta: 2020,
      orden: "titulo",
      pagina: 3,
    });
  });

  // Una URL editada a mano (o un enlace viejo) tiene que dar un listado, no un 500.
  it("descarta en silencio los valores inválidos", () => {
    const f = leer("tipo=inventado&orden=aleatorio&nivel=doctorado&idioma=xx&pagina=0&desde=abc");
    expect(f.tipo).toBeNull();
    expect(f.nivel).toBeNull();
    expect(f.idioma).toBeNull();
    expect(f.orden).toBe("recientes");
    expect(f.pagina).toBe(1);
    expect(f.anioDesde).toBeNull();
  });

  it("rechaza slugs con forma rara en vez de pasarlos a la consulta", () => {
    expect(leer("coleccion=' OR 1=1--").coleccion).toBeNull();
    expect(leer("etiqueta=Mayúsculas").etiqueta).toBeNull();
    expect(leer("etiqueta=tradicion-oral").etiqueta).toBe("tradicion-oral");
  });

  it("voltea un rango de años al revés en vez de no devolver nada", () => {
    const f = leer("desde=2020&hasta=1990");
    expect(f.anioDesde).toBe(1990);
    expect(f.anioHasta).toBe(2020);
  });

  it("acepta los códigos de las lenguas criollas", () => {
    expect(leer("idioma=pln").idioma).toBe("pln");
    expect(leer("idioma=icr").idioma).toBe("icr");
  });

  it("recorta una consulta desmedida", () => {
    expect(leer(`q=${"a".repeat(500)}`).q).toHaveLength(120);
  });
});

describe("normalizarConsulta", () => {
  it("colapsa espacios y recorta", () => {
    expect(normalizarConsulta("  ley   70   ")).toBe("ley 70");
  });

  // No se escapa nada: websearch_to_tsquery trata los signos como texto y no
  // lanza excepción. Escaparlos acá rompería las comillas de frase exacta.
  it("deja pasar los signos que websearch_to_tsquery sabe manejar", () => {
    expect(normalizarConsulta('"tradición oral" -currulao')).toBe('"tradición oral" -currulao');
    expect(normalizarConsulta("a & b | c ()")).toBe("a & b | c ()");
  });
});

describe("filtrosAQuery", () => {
  it("omite todo lo que esté en su valor por defecto", () => {
    expect(filtrosAQuery(FILTROS_VACIOS)).toBe("");
    expect(filtrosAQuery({ orden: "recientes", pagina: 1 })).toBe("");
  });

  it("ida y vuelta: lo que se escribe se vuelve a leer igual", () => {
    const original = { ...FILTROS_VACIOS, q: "palenquero", tipo: "libro" as const, anioDesde: 2001, orden: "descargas" as const, pagina: 4 };
    expect(leer(filtrosAQuery(original))).toEqual(original);
  });
});

describe("hayFiltrosActivos", () => {
  it("false sin filtros, aunque cambie el orden o la página", () => {
    expect(hayFiltrosActivos(FILTROS_VACIOS)).toBe(false);
    expect(hayFiltrosActivos({ ...FILTROS_VACIOS, orden: "titulo", pagina: 5 })).toBe(false);
  });

  it("true con cualquier filtro real", () => {
    expect(hayFiltrosActivos({ ...FILTROS_VACIOS, q: "x" })).toBe(true);
    expect(hayFiltrosActivos({ ...FILTROS_VACIOS, anioHasta: 2000 })).toBe(true);
  });
});

describe("paginación", () => {
  it("rangoDePagina da el intervalo inclusivo que espera .range()", () => {
    expect(rangoDePagina(1, 12)).toEqual({ desde: 0, hasta: 11 });
    expect(rangoDePagina(3, 12)).toEqual({ desde: 24, hasta: 35 });
  });

  it("una página menor que 1 se trata como la primera", () => {
    expect(rangoDePagina(0, 12)).toEqual({ desde: 0, hasta: 11 });
  });

  it("totalDePaginas redondea hacia arriba y nunca da 0", () => {
    expect(totalDePaginas(0)).toBe(1);
    expect(totalDePaginas(12)).toBe(1);
    expect(totalDePaginas(13)).toBe(2);
  });
});

describe("columnaDeOrden", () => {
  it("cada orden mapea a una columna real de `documentos`", () => {
    expect(columnaDeOrden("recientes")).toEqual({ columna: "publicado_en", ascendente: false });
    expect(columnaDeOrden("antiguos")).toEqual({ columna: "publicado_en", ascendente: true });
    expect(columnaDeOrden("titulo")).toEqual({ columna: "titulo", ascendente: true });
    expect(columnaDeOrden("descargas")).toEqual({ columna: "descargas", ascendente: false });
  });
});
