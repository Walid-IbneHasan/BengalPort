// Shared by the office routes.
import type { FastifyReply } from "fastify";
import { customerCode, dealNumber } from "../../lib/invoice-lifecycle.js";

export const invalid = (reply: FastifyReply, error: { flatten(): unknown }, message = "Please check the highlighted fields.") =>
  reply.code(400).send({ error: { code: "VALIDATION_ERROR", message, details: error.flatten() } });

export const problem = (reply: FastifyReply, status: number, code: string, message: string, extra: Record<string, unknown> = {}) =>
  reply.code(status).send({ error: { code, message, ...extra } });

export const page = (query: { page?: string; pageSize?: string }) => {
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
  const number = Math.max(1, Number(query.page) || 1);
  return { take: pageSize, skip: (number - 1) * pageSize, meta: (total: number) => ({ total, page: number, pageSize }) };
};

// The last ten digits of a phone number, to compare numbers written differently.
export const phoneKey = (phone: string | null | undefined) => String(phone ?? "").replace(/\D/g, "").slice(-10);

export const withCode = <T extends { code: number }>(customer: T) => ({ ...customer, customerCode: customerCode(customer.code) });
export const withNumber = <T extends { number: number }>(deal: T) => ({ ...deal, dealNumber: dealNumber(deal.number) });

// Decimals from the database as plain numbers.
export const num = (value: unknown) => (value === null || value === undefined ? null : Number(value));

export const csv = (rows: (string | number | null | undefined)[][]) =>
  rows
    .map((row) =>
      row
        .map((cell) => {
          // A cell that starts like a formula is kept as text by spreadsheets;
          // plain numbers, negative ones included, are left alone.
          const raw = String(cell ?? "");
          const text = /^[=+\-@\t\r]/.test(raw) && !/^-?\d+(\.\d+)?$/.test(raw) ? `'${raw}` : raw;
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(","),
    )
    .join("\r\n");
