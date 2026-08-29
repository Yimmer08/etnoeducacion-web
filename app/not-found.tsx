import Link from "next/link";

export default function NoEncontrado() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
      <p className="font-display text-5xl text-anil">404</p>
      <h1 className="mt-4 font-display text-2xl">No encontramos esa página</h1>
      <p className="mt-2 text-carbon-suave">
        Puede que el documento se haya archivado o que el enlace esté mal escrito.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/documentos" className="rounded-md bg-anil px-4 py-2.5 text-crema">
          Buscar en el repositorio
        </Link>
        <Link href="/" className="rounded-md border border-borde px-4 py-2.5">
          Inicio
        </Link>
      </div>
    </div>
  );
}
