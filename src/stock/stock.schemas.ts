import { z } from 'zod';
import { pagination } from '../common/schemas.js';

export const movementSchema = z
  .object({
    type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
    quantity: z.number().int().nonnegative(),
    reason: z.string().trim().max(200).optional(),
  })
  .strict()
  .refine((m) => m.type === 'ADJUSTMENT' || m.quantity > 0, {
    message: 'quantity deve ser maior que zero',
    path: ['quantity'],
  });

export const movementsQuerySchema = z.object({ ...pagination });

export type MovementInput = z.infer<typeof movementSchema>;
export type MovementsQuery = z.infer<typeof movementsQuerySchema>;
