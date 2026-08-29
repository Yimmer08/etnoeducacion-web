import {
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  LICENCIA_INFO,
  type EstadoDocumento,
  type Licencia,
  type TipoDocumento,
} from "@/lib/documentos/tipos";

/**
 * Colores del estado. El estado se comunica con color Y con texto: un lector
 * con daltonismo no puede depender de que «verde = publicado».
 */
const COLOR_ESTADO: Record<EstadoDocumento, string> = {
  borrador: "bg-crema-dk text-carbon-suave border-borde",
  en_revision: "bg-ocre/15 text-[#7A5713] border-ocre/40",
  publicado: "bg-palma/15 text-palma border-palma/40",
  rechazado: "bg-tierra/15 text-tierra border-tierra/40",
  archivado: "bg-carbon/10 text-carbon-suave border-carbon/20",
};

export function InsigniaEstado({ estado }: { estado: EstadoDocumento }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO[estado]}`}
    >
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

export function InsigniaTipo({ tipo }: { tipo: TipoDocumento }) {
  return (
    <span className="inline-flex items-center rounded-full bg-anil/10 px-2.5 py-0.5 text-xs font-medium text-anil">
      {ETIQUETA_TIPO[tipo]}
    </span>
  );
}

export function InsigniaLicencia({ licencia }: { licencia: Licencia }) {
  const info = LICENCIA_INFO[licencia];
  return (
    <span
      title={info.nombre}
      className="inline-flex items-center rounded-full border border-borde px-2.5 py-0.5 text-xs text-carbon-suave"
    >
      {info.corto}
    </span>
  );
}
