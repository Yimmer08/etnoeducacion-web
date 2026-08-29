// ─────────────────────────────────────────────────────────────────────────────
// lib/documentos/validacion.ts — Esquemas Zod del formulario de carga
//
// Se validan en el SERVIDOR, dentro de la server action, no solo en el
// navegador. La validación del formulario en el cliente es comodidad para
// quien escribe; la de acá es la que decide si el dato entra a la base.
//
// Los mensajes están en español y dicen qué hacer, no qué falló: quien sube un
// documento es un docente o un miembro de la fundación, no un programador.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";
import {
  DECISIONES_REVISION,
  IDIOMAS,
  LICENCIAS,
  NIVELES_EDUCATIVOS,
  TIPOS_DOCUMENTO,
} from "./tipos";

const CODIGOS_IDIOMA = IDIOMAS.map((i) => i.codigo) as [string, ...string[]];

/**
 * Un texto opcional: la cadena vacía del formulario se convierte en `null`.
 * Sin esto, un campo que la persona dejó en blanco entra como `''` y después
 * la ficha muestra un renglón vacío en vez de omitir el dato.
 */
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null);

const enteroOpcional = (min: number, max: number, mensaje: string) =>
  z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" && v.trim() === "" ? null : v))
    .nullable()
    .refine(
      (v) => v === null || (Number.isInteger(Number(v)) && Number(v) >= min && Number(v) <= max),
      mensaje
    )
    .transform((v) => (v === null ? null : Number(v)))
    // `.default(null)` va de último y es lo que hace que un campo numérico
    // AUSENTE (no vacío: ausente) no reviente contra la unión number|string.
    // Es el caso normal de un formulario donde nadie tocó ese input.
    .default(null);

export const esquemaDocumento = z.object({
  titulo: z
    .string()
    .trim()
    .min(3, "El título necesita al menos 3 caracteres.")
    .max(300, "El título no puede pasar de 300 caracteres."),

  subtitulo: textoOpcional(300),
  resumen: textoOpcional(5000),

  // Se permite vacío a propósito: mucha normativa y mucho material comunitario
  // no tiene autoría individual. La ficha muestra «Sin autoría registrada» y
  // el revisor lo evalúa con el criterio de metadatos.
  autores: z
    .array(z.string().trim().min(1).max(200))
    .max(20, "Máximo 20 autores.")
    .default([]),

  anio: enteroOpcional(1500, 2200, "El año debe estar entre 1500 y 2200."),
  paginas: enteroOpcional(1, 100000, "El número de páginas debe ser mayor que cero."),

  idioma: z.enum(CODIGOS_IDIOMA),
  tipo: z.enum(TIPOS_DOCUMENTO),
  licencia: z.enum(LICENCIAS),

  nivel_educativo: z.enum(NIVELES_EDUCATIVOS).nullable().default(null),

  comunidad: textoOpcional(200),
  territorio: textoOpcional(200),
  fuente: textoOpcional(300),
  isbn_issn: textoOpcional(40),

  coleccion_id: z.uuid("Colección inválida.").nullable().default(null),

  portada_url: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null)
    .refine(
      (v) => v === null || /^https:\/\/.+/.test(v),
      "La portada debe ser una URL que empiece por https://"
    ),

  etiquetas: z
    .array(z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Etiqueta inválida."))
    .max(15, "Máximo 15 etiquetas.")
    .default([]),
});

export type DatosDocumento = z.infer<typeof esquemaDocumento>;

/**
 * El formulario de evaluación. El `superRefine` repite en TypeScript el
 * constraint `revisiones_negativa_con_motivo` de 001: rechazar o pedir cambios
 * sin explicar por qué deja a quien subió el documento sin nada que corregir.
 * La base lo rechazaría igual, pero acá el mensaje se ve junto al campo en vez
 * de llegar como un error de Postgres.
 */
export const esquemaRevision = z
  .object({
    documento_id: z.uuid(),
    decision: z.enum(DECISIONES_REVISION),
    comentario: z
      .string()
      .trim()
      .max(2000, "El comentario no puede pasar de 2000 caracteres.")
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .default(null),
    crit_pertinencia: enteroOpcional(1, 5, "La calificación va de 1 a 5."),
    crit_calidad: enteroOpcional(1, 5, "La calificación va de 1 a 5."),
    crit_metadatos: enteroOpcional(1, 5, "La calificación va de 1 a 5."),
  })
  .superRefine((datos, ctx) => {
    if (datos.decision === "aprobado") return;

    if (!datos.comentario || datos.comentario.length < 10) {
      ctx.addIssue({
        code: "custom",
        path: ["comentario"],
        message:
          "Explicá en al menos 10 caracteres qué hay que corregir. Quien subió el documento solo va a ver esto.",
      });
    }
  });

export type DatosRevision = z.infer<typeof esquemaRevision>;

export const esquemaColeccion = z.object({
  nombre: z.string().trim().min(3, "El nombre necesita al menos 3 caracteres.").max(120),
  descripcion: textoOpcional(600),
  orden: enteroOpcional(0, 1000, "El orden debe estar entre 0 y 1000"),
  activa: z.boolean().default(true),
});

/**
 * Convierte los errores de Zod en un mapa `campo → primer mensaje`, que es lo
 * que el formulario necesita para pintar el error debajo de cada input.
 */
export function erroresPorCampo(error: z.ZodError): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const problema of error.issues) {
    const campo = problema.path.join(".") || "_";
    if (!(campo in salida)) salida[campo] = problema.message;
  }
  return salida;
}
