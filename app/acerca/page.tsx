import type { Metadata } from "next";
import { FUNDACION } from "@/lib/fundacion/config";

export const metadata: Metadata = {
  title: "Acerca del repositorio",
  description: "Qué es, qué guarda y bajo qué criterios se publica el material.",
};

export default function Acerca() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl">Acerca del repositorio</h1>

      <div className="mt-6 space-y-8 leading-relaxed">
        <section>
          <p>
            Este es el archivo digital de {FUNDACION.nombre}. Reúne material para la
            enseñanza de la historia, las lenguas y los saberes del pueblo negro,
            afrocolombiano, raizal y palenquero, y lo pone a disposición de docentes,
            estudiantes, consejos comunitarios y de cualquiera que lo necesite.
          </p>
          <p className="mt-3">
            La consulta es abierta: no hace falta cuenta ni registro para buscar, leer o
            descargar.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl">Cómo entra un documento</h2>
          <p className="mt-3">
            Nada se publica solo. Todo documento pasa por cuatro pasos:
          </p>
          <ol className="mt-4 space-y-3">
            <li className="rounded-lg border border-borde bg-white p-4">
              <strong className="font-display">1. Carga.</strong> Un colaborador sube el
              archivo y llena su ficha: título, autoría, año, comunidad, territorio,
              licencia.
            </li>
            <li className="rounded-lg border border-borde bg-white p-4">
              <strong className="font-display">2. Revisión.</strong> Un administrador lo
              evalúa con tres criterios —pertinencia etnoeducativa, calidad del archivo y
              exactitud de los metadatos— y deja constancia de su decisión.
            </li>
            <li className="rounded-lg border border-borde bg-white p-4">
              <strong className="font-display">3. Publicación o devolución.</strong> Si se
              aprueba, queda visible. Si no, vuelve a quien lo subió con el motivo escrito,
              para corregirlo.
            </li>
            <li className="rounded-lg border border-borde bg-white p-4">
              <strong className="font-display">4. Consulta.</strong> El documento queda
              buscable por título, autor, comunidad, territorio, año, colección y etiqueta.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-2xl">Derechos y licencias</h2>
          <p className="mt-3">
            Cada documento conserva la licencia con la que llegó, y la ficha la muestra
            siempre. El material bajo licencias abiertas (Creative Commons o dominio
            público) se puede descargar y compartir; el que está acá con permiso de su
            autor se puede consultar en línea, pero el repositorio no lo entrega como
            archivo para redistribuir.
          </p>
          <p className="mt-3">
            Si un documento le pertenece y no debería estar acá, escribanos a{" "}
            <a href={`mailto:${FUNDACION.correo}`} className="text-anil hover:underline">
              {FUNDACION.correo}
            </a>{" "}
            y lo retiramos mientras se revisa.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl">Qué se guarda de quien consulta</h2>
          <p className="mt-3">
            Se cuentan las consultas y las descargas de cada documento, para saber qué
            material se está usando. No se guardan direcciones IP: se guarda un código
            derivado de la dirección con una clave del servidor, que solo sirve para no
            contar dos veces el mismo clic y del que no se puede volver a la dirección
            original. No hay cookies de seguimiento ni analítica de terceros.
          </p>
        </section>
      </div>
    </div>
  );
}
