// ─────────────────────────────────────────────────────────────────────────────
// lib/documentos/portadas.ts — Qué se ve en la banda de una tarjeta
//
// Dos casos: hay una ilustración para eso, o no la hay y se cae a una portada
// tipográfica. Las dos decisiones son puras y se comprueban en el test; el
// componente solo dibuja lo que acá se decide.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * La ilustración de cada colección, por slug.
 *
 * Es un mapa explícito y no una ruta armada al vuelo (`/colecciones/${slug}.jpg`)
 * a propósito: así una colección sin ilustración devuelve `null` y cae a la
 * portada tipográfica, en vez de pedir un archivo que no existe y dejar el
 * hueco de una imagen rota. Hoy las nueve activas tienen la suya; la décima que
 * entre por el panel cae a la tipográfica hasta que se agregue acá su renglón.
 *
 * Las imágenes vienen con el título y la descripción DIBUJADOS encima —arriba
 * en un cartel, abajo en una placa, o al costado en tipografía grande— y ese
 * texto se recorta antes de guardarlas. No es capricho: un texto dentro de un
 * mapa de bits no lo encuentra el buscador, no lo lee un lector de pantalla, se
 * ve borroso al escalar, y queda mintiendo el día que la colección se renombre.
 * El texto de la tarjeta ya dice lo mismo, y bien.
 *
 * Lo que sí se queda es el texto que forma parte del dibujo —el lomo de un
 * libro, un letrero de madera, la página abierta—: eso es la escena, no el
 * rótulo de la colección, y quitarlo sería recortar la ilustración.
 */
export const IMAGENES_COLECCION: Readonly<Record<string, string>> = {
  "cartilla-la-aventura-ancestral": "/colecciones/cartilla-la-aventura-ancestral.jpg",
  "cartillas-lengua-palenkera": "/colecciones/cartillas-lengua-palenkera.jpg",
  "catedra-estudios-afrocolombianos": "/colecciones/catedra-estudios-afrocolombianos.jpg",
  "cuentos-afro-del-pacifico-colombiano": "/colecciones/cuentos-afro-del-pacifico-colombiano.jpg",
  "diaspora-africana": "/colecciones/diaspora-africana.jpg",
  "etnoeducacion": "/colecciones/etnoeducacion.jpg",
  "maleta-didactica": "/colecciones/maleta-didactica.jpg",
  "poemas": "/colecciones/poemas.jpg",
  "san-basilio-de-palenque": "/colecciones/san-basilio-de-palenque.jpg",
};

/**
 * La ruta de la ilustración de una colección, o null si todavía no tiene.
 *
 * Se consulta con `Object.hasOwn` y no con `?? null`: `IMAGENES_COLECCION` es
 * un objeto, y un slug como `constructor` —que el CHECK de la tabla acepta sin
 * problema— devolvería la propiedad heredada de `Object.prototype`, o sea una
 * función, que terminaría de `src` en un `<Image>`.
 */
export function imagenDeColeccion(slug: string): string | null {
  return Object.hasOwn(IMAGENES_COLECCION, slug) ? IMAGENES_COLECCION[slug] : null;
}

/**
 * Portada tipográfica: la inicial sobre un color derivado del propio texto.
 *
 * Se hace así, y no con miniaturas generadas, porque una miniatura obliga a un
 * segundo bucket público (el de documentos es privado, ver 005_storage.sql) y
 * ese bucket filtraría las portadas de los borradores. Una letra grande cuesta
 * cero y no expone nada.
 *
 * El color sale del texto, así que el mismo documento siempre cae en el mismo:
 * si fuera al azar, cada recarga cambiaría la portada y el listado parpadearía
 * de colores distintos sin que nada haya cambiado.
 */
export function portadaTipografica(texto: string): { fondo: string; letra: string } {
  const fondos = ["bg-anil", "bg-tierra", "bg-palma", "bg-ocre"];
  let suma = 0;
  for (const c of texto) suma = (suma + c.codePointAt(0)!) % 997;
  return { fondo: fondos[suma % fondos.length], letra: texto.trim().charAt(0).toUpperCase() || "?" };
}
