"use client";

import {
  ETIQUETA_NIVEL,
  ETIQUETA_TIPO,
  IDIOMAS,
  LICENCIA_INFO,
  LICENCIAS,
  NIVELES_EDUCATIVOS,
  TIPOS_DOCUMENTO,
  type Coleccion,
  type Etiqueta,
} from "@/lib/documentos/tipos";

export interface ValoresDocumento {
  titulo?: string;
  subtitulo?: string | null;
  resumen?: string | null;
  autores?: string[];
  anio?: number | null;
  paginas?: number | null;
  idioma?: string;
  tipo?: string;
  licencia?: string;
  nivel_educativo?: string | null;
  comunidad?: string | null;
  territorio?: string | null;
  fuente?: string | null;
  isbn_issn?: string | null;
  coleccion_id?: string | null;
  portada_url?: string | null;
  etiquetas?: string[];
}

const CAMPO = "w-full rounded-md border border-borde bg-white px-3 py-2 text-sm focus:border-anil";

function Error({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-tierra">
      {mensaje}
    </p>
  );
}

/**
 * Los campos de la ficha. Lo comparten el formulario de carga y el de edición
 * para que no se desincronicen: si se agrega un metadato, se agrega una vez.
 *
 * Es un formulario NO controlado (`defaultValue`, sin `useState` por campo).
 * Con 16 campos, un estado por campo son 16 re-renders del formulario entero
 * por cada tecla, y no compra nada: los valores se leen del FormData al enviar.
 */
export default function CamposDocumento({
  valores = {},
  colecciones,
  etiquetas,
  errores = {},
}: {
  valores?: ValoresDocumento;
  colecciones: Coleccion[];
  etiquetas: Etiqueta[];
  errores?: Record<string, string>;
}) {
  return (
    <div className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="font-display text-lg">Identificación</legend>

        <div>
          <label htmlFor="titulo" className="mb-1.5 block text-sm font-medium">
            Título <span className="text-tierra">*</span>
          </label>
          <input id="titulo" name="titulo" required defaultValue={valores.titulo ?? ""} className={CAMPO} />
          <Error mensaje={errores.titulo} />
        </div>

        <div>
          <label htmlFor="subtitulo" className="mb-1.5 block text-sm font-medium">Subtítulo</label>
          <input id="subtitulo" name="subtitulo" defaultValue={valores.subtitulo ?? ""} className={CAMPO} />
          <Error mensaje={errores.subtitulo} />
        </div>

        <div>
          <label htmlFor="autores" className="mb-1.5 block text-sm font-medium">Autoría</label>
          <input
            id="autores"
            name="autores"
            defaultValue={(valores.autores ?? []).join("; ")}
            placeholder="Apellido, Nombre; Otro Apellido, Nombre"
            className={CAMPO}
          />
          <p className="mt-1 text-xs text-carbon-suave">
            Separá cada autor con punto y coma. Se puede dejar vacío: mucha normativa y
            mucho material comunitario no tiene autoría individual.
          </p>
          <Error mensaje={errores.autores} />
        </div>

        <div>
          <label htmlFor="resumen" className="mb-1.5 block text-sm font-medium">Resumen</label>
          <textarea id="resumen" name="resumen" rows={5} defaultValue={valores.resumen ?? ""} className={CAMPO} />
          <p className="mt-1 text-xs text-carbon-suave">
            Es lo que más pesa en el buscador después del título. Vale la pena escribirlo.
          </p>
          <Error mensaje={errores.resumen} />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-display text-lg">Clasificación</legend>

        <div>
          <label htmlFor="tipo" className="mb-1.5 block text-sm font-medium">
            Tipo <span className="text-tierra">*</span>
          </label>
          <select id="tipo" name="tipo" defaultValue={valores.tipo ?? "cartilla"} className={CAMPO}>
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t} value={t}>{ETIQUETA_TIPO[t]}</option>
            ))}
          </select>
          <Error mensaje={errores.tipo} />
        </div>

        <div>
          <label htmlFor="idioma" className="mb-1.5 block text-sm font-medium">
            Idioma <span className="text-tierra">*</span>
          </label>
          <select id="idioma" name="idioma" defaultValue={valores.idioma ?? "es"} className={CAMPO}>
            {IDIOMAS.map((i) => (
              <option key={i.codigo} value={i.codigo}>{i.nombre}</option>
            ))}
          </select>
          <Error mensaje={errores.idioma} />
        </div>

        <div>
          <label htmlFor="coleccion_id" className="mb-1.5 block text-sm font-medium">Colección</label>
          <select id="coleccion_id" name="coleccion_id" defaultValue={valores.coleccion_id ?? ""} className={CAMPO}>
            <option value="">Sin colección</option>
            {colecciones.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <Error mensaje={errores.coleccion_id} />
        </div>

        <div>
          <label htmlFor="nivel_educativo" className="mb-1.5 block text-sm font-medium">Nivel educativo</label>
          <select id="nivel_educativo" name="nivel_educativo" defaultValue={valores.nivel_educativo ?? ""} className={CAMPO}>
            <option value="">Sin especificar</option>
            {NIVELES_EDUCATIVOS.map((n) => (
              <option key={n} value={n}>{ETIQUETA_NIVEL[n]}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="etiquetas" className="mb-1.5 block text-sm font-medium">Etiquetas</label>
          <select
            id="etiquetas"
            name="etiquetas"
            multiple
            size={6}
            defaultValue={valores.etiquetas ?? []}
            className={`${CAMPO} h-auto`}
          >
            {etiquetas.map((e) => (
              <option key={e.id} value={e.slug}>{e.nombre}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-carbon-suave">
            Ctrl (o ⌘) + clic para elegir varias. Máximo 15.
          </p>
          <Error mensaje={errores.etiquetas} />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-display text-lg">Contexto etnoeducativo</legend>

        <div>
          <label htmlFor="comunidad" className="mb-1.5 block text-sm font-medium">Comunidad u organización</label>
          <input
            id="comunidad"
            name="comunidad"
            defaultValue={valores.comunidad ?? ""}
            placeholder="Consejo Comunitario…"
            className={CAMPO}
          />
        </div>

        <div>
          <label htmlFor="territorio" className="mb-1.5 block text-sm font-medium">Territorio</label>
          <input
            id="territorio"
            name="territorio"
            defaultValue={valores.territorio ?? ""}
            placeholder="Municipio, departamento o región"
            className={CAMPO}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-display text-lg">Procedencia y derechos</legend>

        <div>
          <label htmlFor="anio" className="mb-1.5 block text-sm font-medium">Año</label>
          <input
            id="anio"
            name="anio"
            type="number"
            inputMode="numeric"
            min={1500}
            max={2200}
            defaultValue={valores.anio ?? ""}
            className={CAMPO}
          />
          <Error mensaje={errores.anio} />
        </div>

        <div>
          <label htmlFor="paginas" className="mb-1.5 block text-sm font-medium">Páginas</label>
          <input
            id="paginas"
            name="paginas"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={valores.paginas ?? ""}
            className={CAMPO}
          />
          <Error mensaje={errores.paginas} />
        </div>

        <div>
          <label htmlFor="fuente" className="mb-1.5 block text-sm font-medium">Fuente o editorial</label>
          <input id="fuente" name="fuente" defaultValue={valores.fuente ?? ""} className={CAMPO} />
        </div>

        <div>
          <label htmlFor="isbn_issn" className="mb-1.5 block text-sm font-medium">ISBN / ISSN</label>
          <input id="isbn_issn" name="isbn_issn" defaultValue={valores.isbn_issn ?? ""} className={CAMPO} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="licencia" className="mb-1.5 block text-sm font-medium">
            Licencia <span className="text-tierra">*</span>
          </label>
          <select id="licencia" name="licencia" defaultValue={valores.licencia ?? "derechos_reservados"} className={CAMPO}>
            {LICENCIAS.map((l) => (
              <option key={l} value={l}>{LICENCIA_INFO[l].nombre}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-carbon-suave">
            Decide si el repositorio ofrece la descarga del archivo o solo la consulta en
            línea. Ante la duda, «Todos los derechos reservados».
          </p>
          <Error mensaje={errores.licencia} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="portada_url" className="mb-1.5 block text-sm font-medium">
            URL de portada (opcional)
          </label>
          <input
            id="portada_url"
            name="portada_url"
            type="url"
            placeholder="https://…"
            defaultValue={valores.portada_url ?? ""}
            className={CAMPO}
          />
          <Error mensaje={errores.portada_url} />
        </div>
      </fieldset>
    </div>
  );
}

/** Lee el FormData con la misma forma que espera `esquemaDocumento`. */
export function leerFormulario(datos: FormData): Record<string, unknown> {
  const texto = (clave: string) => String(datos.get(clave) ?? "");

  return {
    titulo: texto("titulo"),
    subtitulo: texto("subtitulo"),
    resumen: texto("resumen"),
    // El campo de autores es un solo input separado por «;» — más simple de
    // llenar que una lista dinámica, y es como los transcribe cualquiera que
    // esté copiando una portada.
    autores: texto("autores").split(";").map((a) => a.trim()).filter(Boolean),
    anio: texto("anio"),
    paginas: texto("paginas"),
    idioma: texto("idioma"),
    tipo: texto("tipo"),
    licencia: texto("licencia"),
    nivel_educativo: texto("nivel_educativo") || null,
    comunidad: texto("comunidad"),
    territorio: texto("territorio"),
    fuente: texto("fuente"),
    isbn_issn: texto("isbn_issn"),
    coleccion_id: texto("coleccion_id") || null,
    portada_url: texto("portada_url"),
    etiquetas: datos.getAll("etiquetas").map(String),
  };
}
