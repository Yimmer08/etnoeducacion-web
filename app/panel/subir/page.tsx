import { exigirPerfil } from "@/lib/auth/sesion";
import { listarColecciones, listarEtiquetas } from "@/lib/documentos/consultas";
import FormularioSubida from "@/components/panel/FormularioSubida";

export const metadata = { title: "Subir documento" };

export default async function Subir() {
  const [perfil, colecciones, etiquetas] = await Promise.all([
    exigirPerfil(),
    listarColecciones(),
    listarEtiquetas(),
  ]);

  return (
    <div>
      <h2 className="font-display text-2xl">Subir un documento</h2>
      <p className="mt-2 max-w-2xl text-sm text-carbon-suave">
        Los metadatos son lo que hace que alguien encuentre este documento dentro de tres
        años. Vale la pena llenarlos con calma — sobre todo el resumen, la comunidad y el
        territorio, que es por donde busca la gente y no aparecen en ningún catálogo
        bibliográfico corriente.
      </p>

      <div className="mt-8">
        <FormularioSubida
          perfilId={perfil.id}
          colecciones={colecciones}
          etiquetas={etiquetas}
        />
      </div>
    </div>
  );
}
