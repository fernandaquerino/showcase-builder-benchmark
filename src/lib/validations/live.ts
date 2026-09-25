import { z } from "zod";

import { isSafeHttpUrl } from "@/lib/url";

function isValidCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const optionalUrl = (message: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (!value || value === "" ? null : value))
    .refine((value) => value === null || isSafeHttpUrl(value), message);

const titleSchema = z
  .string()
  .trim()
  .min(3, "O título deve ter pelo menos 3 caracteres.")
  .max(120, "O título deve ter no máximo 120 caracteres.");

const liveDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
  .refine(isValidCalendarDate, "Informe uma data válida.");

const liveTimeSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
    "Informe um horário válido (HH:mm).",
  )
  .transform((value) => (value === "" ? null : value));

export const liveInputSchema = z.object({
  title: titleSchema,
  liveDate: liveDateSchema,
  liveTime: liveTimeSchema,
  coverImageUrl: optionalUrl("Cole um link de imagem válido (http/https)."),
});

export const liveIdSchema = z.uuid("Identificador inválido.");

/** Status filter of the lives list (`/admin?status=...`). */
export const LIVE_STATUS_FILTERS = ["todas", "publicadas", "rascunhos"] as const;
export type LiveStatusFilter = (typeof LIVE_STATUS_FILTERS)[number];
export const liveStatusFilterSchema = z.enum(LIVE_STATUS_FILTERS).catch("todas");

/** Raw string fields the form binds to (schema input). */
export type LiveFormValues = z.input<typeof liveInputSchema>;
/** Normalized values the schema produces (optional fields become `null`). */
export type LiveFormData = z.output<typeof liveInputSchema>;
