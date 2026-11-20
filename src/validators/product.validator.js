const { z, objectId, pagination, atLeastOne } = require('./common');
const { TYPES } = require('../models/StockMovement');

const base = {
  name: z.string().trim().min(2).max(120),
  sku: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{3,30}$/, 'sku deve ter 3 a 30 letras, números ou hífen'),
  description: z.string().trim().max(1000).optional(),
  price: z.number().nonnegative('price não pode ser negativo'),
  quantity: z.number().int().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
  category: objectId,
  active: z.boolean().optional(),
};

const createBody = z.object(base).strict();

// O saldo só muda via movimentações, para manter o histórico consistente
const updateBody = atLeastOne(z.object(base).omit({ quantity: true }).partial().strict());

const listQuery = z
  .object({
    category: objectId.optional(),
    search: z.string().trim().min(1).max(100).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    lowStock: z.enum(['true', 'false']).optional(),
    active: z.enum(['true', 'false']).optional(),
    sortBy: z.enum(['name', 'price', 'quantity', 'createdAt']).default('name'),
    order: z.enum(['asc', 'desc']).default('asc'),
    ...pagination,
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    message: 'minPrice não pode ser maior que maxPrice',
    path: ['minPrice'],
  });

const movementBody = z
  .object({
    type: z.enum(TYPES),
    quantity: z.number().int().nonnegative(),
    reason: z.string().trim().max(200).optional(),
  })
  .strict()
  .refine((m) => m.type === 'adjustment' || m.quantity > 0, {
    message: 'quantity deve ser maior que zero',
    path: ['quantity'],
  });

const movementQuery = z.object({ ...pagination });

module.exports = { createBody, updateBody, listQuery, movementBody, movementQuery };
