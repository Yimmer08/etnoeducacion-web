import Link from "next/link";
import { exigirAdmin } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { formatearNumero } from "@/lib/documentos/citacion";

export const metadata = { title: "Estadísticas" };

interface FilaDocumento {
  id: string;
  slug: string;
  titulo: string;
  vistas: number;
  descargas: number;
}

interface FilaActividad {
  dia: string;
  tipo: "vista" | "descarga";
  total: number;
}

export default async function Estadisticas() {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const [{ data: masUsados }, { data: actividad }] = await Promise.all([
    supabase
      .from("documentos")
      .select("id, slug, titulo, vistas, descargas")
      .eq("estado", "publicado")
      .order("descargas", { ascending: false })
      .limit(15),
    supabase.from("actividad_por_dia").select("*").order("dia", { ascending: false }),
  ]);

  const documentos = (masUsados ?? []) as FilaDocumento[];
  const dias = (actividad ?? []) as FilaActividad[];

  const totalVistas = dias.filter((d) => d.tipo === "vista").reduce((s, d) => s + d.total, 0);
  const totalDescargas = dias.filter((d) => d.tipo === "descarga").reduce((s, d) => s + d.total, 0);

  // Máximo de la serie, para escalar las barras. `|| 1` evita dividir por cero
  // cuando todavía no hay ningún evento.
  const maximoDia = Math.max(1, ...dias.map((d) => d.total));

  // Los últimos 30 días con actividad, del más viejo al más nuevo.
  const serie = [...dias].sort((a, b) => a.dia.localeCompare(b.dia)).slice(-60);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-2xl">Estadísticas</h2>
        <p className="mt-2 text-sm text-carbon-suave">
          Consultas y descargas de los últimos 90 días. No se identifica a nadie: solo se
          cuenta, y un mismo visitante no suma dos veces el mismo documento en 30 minutos.
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-borde bg-white p-4">
            <dt className="text-sm text-carbon-suave">Consultas (90 días)</dt>
            <dd className="font-display text-2xl">{formatearNumero(totalVistas)}</dd>
          </div>
          <div className="rounded-lg border border-borde bg-white p-4">
            <dt className="text-sm text-carbon-suave">Descargas (90 días)</dt>
            <dd className="font-display text-2xl">{formatearNumero(totalDescargas)}</dd>
          </div>
          <div className="rounded-lg border border-borde bg-white p-4">
            <dt className="text-sm text-carbon-suave">Documentos publicados</dt>
            <dd className="font-display text-2xl">{formatearNumero(documentos.length)}</dd>
          </div>
        </dl>
      </section>

      {serie.length > 0 && (
        <section>
          <h3 className="font-display text-lg">Actividad por día</h3>
          {/* Barras en CSS puro: una librería de gráficos son ~100 KB para
              dibujar rectángulos de altura proporcional. */}
          <ul className="mt-4 flex h-40 items-end gap-1 overflow-x-auto rounded-lg border border-borde bg-white p-4">
            {serie.map((d) => (
              <li
                key={`${d.dia}-${d.tipo}`}
                title={`${d.dia}: ${d.total} ${d.tipo === "vista" ? "consultas" : "descargas"}`}
                style={{ height: `${(d.total / maximoDia) * 100}%` }}
                className={`w-3 shrink-0 rounded-t ${d.tipo === "vista" ? "bg-anil/40" : "bg-anil"}`}
              >
                <span className="sr-only">
                  {d.dia}: {d.total} {d.tipo === "vista" ? "consultas" : "descargas"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex gap-4 text-xs text-carbon-suave">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-3 w-3 rounded-sm bg-anil/40" /> Consultas
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-3 w-3 rounded-sm bg-anil" /> Descargas
            </span>
          </p>
        </section>
      )}

      <section>
        <h3 className="font-display text-lg">Documentos más usados</h3>
        {documentos.length === 0 ? (
          <p className="mt-3 text-sm text-carbon-suave">Todavía no hay documentos publicados.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-borde bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-borde bg-crema-dk text-left">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Documento</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Consultas</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Descargas</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((doc) => (
                  <tr key={doc.id} className="border-b border-borde last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/documentos/${doc.slug}`} className="text-anil hover:underline">
                        {doc.titulo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">{formatearNumero(doc.vistas)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatearNumero(doc.descargas)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
