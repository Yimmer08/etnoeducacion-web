import Image from "next/image";
import { imagenDeColeccion, portadaTipografica } from "@/lib/documentos/portadas";

/**
 * La banda de arriba de una tarjeta de colección: su ilustración, o una
 * portada tipográfica si todavía no tiene.
 *
 * Es el mismo patrón que la tarjeta de un documento —imagen arriba, texto
 * debajo sobre blanco— y esa es la razón de que la ilustración vaya acá y no
 * de fondo detrás del texto: así el título y la descripción se leen sobre
 * blanco, sin depender de qué haya quedado debajo.
 *
 * Va dentro de un contenedor con `group` para que el acercamiento del hover se
 * dispare al pasar por la tarjeta entera y no solo por la imagen.
 */
export default function PortadaColeccion({
  slug,
  nombre,
}: {
  slug: string;
  nombre: string;
}) {
  const imagen = imagenDeColeccion(slug);
  const tipografica = portadaTipografica(nombre);

  return (
    <div className="relative aspect-[3/2] overflow-hidden bg-crema-dk">
      {imagen ? (
        <Image
          src={imagen}
          // Decorativa: el nombre de la colección está justo debajo, como
          // texto. Describir el dibujo acá haría que un lector de pantalla
          // anunciara dos veces la misma tarjeta.
          alt=""
          fill
          // Tres columnas en escritorio, dos en tablet, una en móvil.
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div
          aria-hidden
          className={`grid h-full w-full place-items-center ${tipografica.fondo}`}
        >
          <span className="font-display text-5xl text-crema/90">{tipografica.letra}</span>
        </div>
      )}
    </div>
  );
}
