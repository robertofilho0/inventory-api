import { z } from 'zod';

export const uuidSchema = z.uuid('ID inválido');

export const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const paginate = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) => ({
  data,
  meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
});

/** Reais (número com até 2 casas) ↔ centavos (inteiro). */
export const toCents = (value: number) => Math.round(value * 100);
export const fromCents = (cents: number) => cents / 100;
