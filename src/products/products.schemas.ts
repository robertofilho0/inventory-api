import { z } from 'zod';
import { pagination, uuidSchema } from '../common/schemas.js';

const base = {
  name: z.string().trim().min(2).max(120),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,30}$/, 'sku deve ter 3 a 30 letras, números ou hífen'),
  description: z.string().trim().max(1000).optional(),
  price: z
    .number()
    .nonnegative('price não pode ser negativo')
    .multipleOf(0.01, 'price deve ter no máximo 2 casas decimais'),
  quantity: z.number().int().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
  categoryId: uuidSchema,
  active: z.boolean().optional(),
};

export const createProductSchema = z.object(base).strict();

// O saldo só muda via movimentações, para manter o histórico consistente
export const updateProductSchema = z
  .object(base)
  .omit({ quantity: true })
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Informe ao menos um campo',
  });

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

export const listProductsSchema = z
  .object({
    categoryId: uuidSchema.optional(),
    search: z.string().trim().min(1).max(100).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    lowStock: bool.optional(),
    active: bool.optional(),
    sortBy: z
      .enum(['name', 'priceCents', 'quantity', 'createdAt'])
      .default('name'),
    order: z.enum(['asc', 'desc']).default('asc'),
    ...pagination,
  })
  .refine(
    (q) =>
      q.minPrice === undefined ||
      q.maxPrice === undefined ||
      q.minPrice <= q.maxPrice,
    {
      message: 'minPrice não pode ser maior que maxPrice',
      path: ['minPrice'],
    },
  );

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsSchema>;
