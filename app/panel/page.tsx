import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { ETIQUETA_ESTADO, type EstadoDocumento } from "@/lib/documentos/tipos";

export default async function InicioPanel() {
  const perfil = await exigirPerfil();
  const supabase = await crearClienteServidor();

  // La RLS ya limita lo que se ve: un colaborador cuenta lo suyo, un admin
  // cuenta todo. Por eso no hay ningún filtro por autor acá.
  const { data } = await supabase.from("documentos").select("estado");
  const documentos = (data ?? []) as Array<{ estado: EstadoDocumento }>;

  const porEstado = documentos.reduce<Record<string, number>>((acc, d) => {
    acc[d.estado] = (acc[d.estado] ?? 0) + 1;
    return acc;
  }, {});

  const enRevision = porEstado.en_revision ?? 0;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-xl">
          {perfil.rol === "admin" ? "Todo el repositorio" : "Tus documentos"}
        </h2>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(["borrador", "en_revision", "publicado", "rechazado", "archivado"] as const).map((estado) => (
            <div key={estado} className="rounded-lg border border-borde bg-white p-4">
              <dt className="text-sm text-carbon-suave">{ETIQUETA_ESTADO[estado]}</dt>
              <dd className="font-display text-2xl">{porEstado[estado] ?? 0}</dd>
            </div>
          ))}
        </dl>
      </section>

      {perfil.rol === "admin" && enRevision > 0 && (
        <section className="rounded-lg border border-ocre/40 bg-ocre/10 p-5">
          <h2 className="font-display text-lg">
            {enRevision === 1 ? "Hay 1 documento esperando revisión" : `Hay ${enRevision} documentos esperando revisión`}
          </h2>
          <p className="mt-1 text-sm text-carbon-suave">
            Nadie los ve hasta que se aprueben.
          </p>
          <Link
            href="/panel/revision"
            className="mt-3 inline-block rounded-md bg-anil px-4 py-2 text-sm text-crema transition-colors hover:bg-anil-lt"
          >
            Ir a la cola
          </Link>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/panel/subir"
          className="rounded-lg border border-borde bg-white p-5 transition-colors hover:border-anil"
        >
          <p className="font-display text-lg">Subir un documento</p>
          <p className="mt-1 text-sm text-carbon-suave">
            Cargá el archivo y su ficha. Queda en borrador hasta que lo mandes a revisión.
          </p>
        </Link>

        <Link
          href="/panel/documentos"
          className="rounded-lg border border-borde bg-white p-5 transition-colors hover:border-anil"
        >
          <p className="font-display text-lg">Ver documentos</p>
          <p className="mt-1 text-sm text-carbon-suave">
            {perfil.rol === "admin"
              ? "Todos los documentos del repositorio, en cualquier estado."
              : "Los que subiste vos, con el estado de cada uno."}
          </p>
        </Link>
      </section>
    </div>
  );
}
