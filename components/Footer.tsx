import Link from "next/link";
import { FUNDACION } from "@/lib/fundacion/config";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-borde bg-crema-dk">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-display text-lg">{FUNDACION.nombre}</p>
          <p className="mt-2 max-w-xs text-sm text-carbon-suave">{FUNDACION.descripcion}</p>
        </div>

        <nav aria-label="Pie de página">
          <p className="text-sm font-semibold">Repositorio</p>
          <ul className="mt-3 space-y-2 text-sm text-carbon-suave">
            <li><Link href="/documentos" className="hover:text-anil">Buscar documentos</Link></li>
            <li><Link href="/colecciones" className="hover:text-anil">Colecciones</Link></li>
            <li><Link href="/acerca" className="hover:text-anil">Acerca del repositorio</Link></li>
          </ul>
        </nav>

        <div>
          <p className="text-sm font-semibold">Contacto</p>
          <ul className="mt-3 space-y-2 text-sm text-carbon-suave">
            <li>
              <a href={`mailto:${FUNDACION.correo}`} className="hover:text-anil">
                {FUNDACION.correo}
              </a>
            </li>
            <li>{FUNDACION.ciudad}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-borde px-4 py-4 text-center text-xs text-carbon-suave sm:px-6">
        <p>
          Los documentos conservan la licencia y la autoría de origen. Cada ficha indica
          bajo qué condiciones se puede usar y compartir el material.
        </p>
        <p className="mt-1">
          © {new Date().getFullYear()} {FUNDACION.nombre}
        </p>
      </div>
    </footer>
  );
}
