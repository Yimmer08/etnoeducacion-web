import Image from "next/image";

/**
 * El fondo de arena con el mapa, detrás de las colecciones.
 *
 * Vive en un componente y no suelto en cada página porque se usa en dos
 * lugares —la portada y /colecciones— y tienen que verse como la misma cosa.
 * Duplicar el marcado es como empiezan a separarse.
 *
 * Se monta DENTRO de un contenedor que ya sea `relative isolate` y tenga
 * `bg-arena`: el color se queda debajo, es lo que se ve mientras la imagen
 * carga o si falta, y es el mismo del borde de la imagen para que no se note
 * dónde termina.
 *
 * Es el reverso del hero. Allá el texto es crema sobre oscuro; acá es carbón
 * sobre claro, así que la imagen tiene que ser clara. De ahí sale la regla de
 * composición: el mapa a la derecha, el texto a la izquierda. El texto
 * secundario del sitio (`carbon-suave`) sobre la parte más oscura del mapa da
 * 3.8:1, por debajo del 4.5:1 de la norma; sobre la arena plana da 5.3:1 y
 * pasa. Separándolos, el problema no llega a existir.
 */
export default function FondoColecciones() {
  return (
    <>
      <Image
        src="/fondo-colecciones.jpeg"
        // Decorativa: no dice nada que el encabezado de la sección no diga.
        alt=""
        fill
        sizes="100vw"
      // `contain` de tablet para arriba, por lo mismo que en la portada: estas
      // franjas son mucho más anchas que altas y recortar para llenarlas
      // agranda la imagen hasta comerse medio continente. Entera, apoyada a la
      // derecha, funciona como marca de agua y deja el flanco izquierdo limpio
      // para el texto.
      //
        // En pantalla angosta sigue `cover`: ahí la columna es estrecha y alta,
        // y mostrarla entera dejaría el mapa como una franjita perdida en el
        // medio.
        className="-z-10 object-cover object-right sm:object-contain"
      />

      {/* Velo, SOLO en móvil.
          Ahí el texto ocupa todo el ancho y no se lo puede correr al flanco
          limpio: en la ficha de una colección la cabecera cae justo sobre la
          parte oscura del mapa y `carbon-suave` baja a 3.9:1, por debajo del
          4.5:1 de la norma. Con el velo sube a 4.8:1.

          De `sm` para arriba no va: la imagen se muestra entera y apoyada a la
          derecha, el texto queda sobre la arena plana, y ahí `carbon-suave` da
          5.3:1 por sí solo. Poner velo también arriba solo serviría para
          desteñir el mapa sin ganar nada. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-arena/60 sm:hidden" />
    </>
  );
}
