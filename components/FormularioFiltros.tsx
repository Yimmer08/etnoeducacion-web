"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  ETIQUETA_ORDEN,
  ORDENES,
  type Filtros,
} from "@/lib/documentos/busqueda";
import {
  ETIQUETA_NIVEL,
  ETIQUETA_TIPO,
  IDIOMAS,
  NIVELES_EDUCATIVOS,
  TIPOS_DOCUMENTO,
} from "@/lib/documentos/tipos";
import type { Coleccion, Etiqueta } from "@/lib/documentos/tipos";

/**
 * Es un `<form method="get">` de toda la vida, no un formulario controlado por
 * React. Dos consecuencias que valen el diseño:
 *
 *   · Funciona sin JavaScript. Un docente con conexión mala en el Chocó puede
 *     buscar aunque el bundle no haya cargado.
 *   · El resultado es una URL compartible, y el listado se renderiza en el
 *     servidor a partir de ella (ver leerFiltros en lib/documentos/busqueda.ts).
 *
 * Lo único que aporta el cliente es enviar el formulario solo al cambiar un
 * `<select>`, para ahorrarse el clic en «Filtrar». Sin JS, ese botón sigue ahí.
 */
export default function FormularioFiltros({
  filtros,
  colecciones,
  etiquetas,
  total,
}: {
  filtros: Filtros;
  colecciones: Coleccion[];
  etiquetas: Etiqueta[];
  total: number;
}) {
  const formulario = useRef<HTMLFormElement>(null);

  const enviar = () => formulario.current?.requestSubmit();

  const claseCampo =
    "w-full rounded-md border border-borde bg-white px-3 py-2 text-sm focus:border-anil";

  return (
    <form ref={formulario} action="/documentos" method="get" className="space-y-5">
      {/* Al cambiar cualquier filtro se vuelve a la página 1: quedarse en la 7
          de un listado que ahora tiene 2 páginas muestra un vacío que parece
          un error. No se pinta ningún input de `pagina`, y su ausencia hace
          que leerFiltros caiga en 1. */}

      <div>
        <label htmlFor="q" className="mb-1.5 block text-sm font-medium">
          Buscar
        </label>
        <div className="flex gap-2">
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filtros.q}
            placeholder="Título, autor, comunidad…"
            className={claseCampo}
          />
          <button
            type="submit"
            className="shrink-0 rounded-md bg-anil px-4 py-2 text-sm text-crema transition-colors hover:bg-anil-lt"
          >
            Buscar
          </button>
        </div>
        <p className="mt-1.5 text-xs text-carbon-suave">
          Se puede usar <code>&quot;frase exacta&quot;</code> entre comillas y <code>-palabra</code> para excluir.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div>
          <label htmlFor="tipo" className="mb-1.5 block text-sm font-medium">
            Tipo de documento
          </label>
          <select id="tipo" name="tipo" defaultValue={filtros.tipo ?? ""} onChange={enviar} className={claseCampo}>
            <option value="">Todos</option>
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t} value={t}>{ETIQUETA_TIPO[t]}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="coleccion" className="mb-1.5 block text-sm font-medium">
            Colección
          </label>
          <select
            id="coleccion"
            name="coleccion"
            defaultValue={filtros.coleccion ?? ""}
            onChange={enviar}
            className={claseCampo}
          >
            <option value="">Todas</option>
            {colecciones.map((c) => (
              <option key={c.id} value={c.slug}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="etiqueta" className="mb-1.5 block text-sm font-medium">
            Etiqueta
          </label>
          <select
            id="etiqueta"
            name="etiqueta"
            defaultValue={filtros.etiqueta ?? ""}
            onChange={enviar}
            className={claseCampo}
          >
            <option value="">Todas</option>
            {etiquetas.map((e) => (
              <option key={e.id} value={e.slug}>{e.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="nivel" className="mb-1.5 block text-sm font-medium">
            Nivel educativo
          </label>
          <select id="nivel" name="nivel" defaultValue={filtros.nivel ?? ""} onChange={enviar} className={claseCampo}>
            <option value="">Todos</option>
            {NIVELES_EDUCATIVOS.map((n) => (
              <option key={n} value={n}>{ETIQUETA_NIVEL[n]}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="idioma" className="mb-1.5 block text-sm font-medium">
            Idioma
          </label>
          <select id="idioma" name="idioma" defaultValue={filtros.idioma ?? ""} onChange={enviar} className={claseCampo}>
            <option value="">Todos</option>
            {IDIOMAS.map((i) => (
              <option key={i.codigo} value={i.codigo}>{i.nombre}</option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Año de publicación</legend>
          <div className="flex items-center gap-2">
            <input
              name="desde"
              type="number"
              inputMode="numeric"
              min={1500}
              max={2200}
              defaultValue={filtros.anioDesde ?? ""}
              aria-label="Desde el año"
              placeholder="Desde"
              className={claseCampo}
            />
            <span aria-hidden className="text-carbon-suave">–</span>
            <input
              name="hasta"
              type="number"
              inputMode="numeric"
              min={1500}
              max={2200}
              defaultValue={filtros.anioHasta ?? ""}
              aria-label="Hasta el año"
              placeholder="Hasta"
              className={claseCampo}
            />
          </div>
        </fieldset>

        <div>
          <label htmlFor="orden" className="mb-1.5 block text-sm font-medium">
            Ordenar por
          </label>
          <select id="orden" name="orden" defaultValue={filtros.orden} onChange={enviar} className={claseCampo}>
            {ORDENES.map((o) => (
              <option key={o} value={o}>{ETIQUETA_ORDEN[o]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-borde pt-4">
        <p className="text-sm text-carbon-suave" aria-live="polite">
          {total === 1 ? "1 documento" : `${total} documentos`}
        </p>
        <div className="flex gap-2">
          {/* Enlace y no botón: limpiar es navegar a /documentos pelado. */}
          <Link href="/documentos" className="rounded-md px-3 py-2 text-sm text-anil hover:underline">
            Limpiar
          </Link>
          <button
            type="submit"
            className="rounded-md border border-borde px-3.5 py-2 text-sm transition-colors hover:bg-crema-dk"
          >
            Filtrar
          </button>
        </div>
      </div>
    </form>
  );
}
