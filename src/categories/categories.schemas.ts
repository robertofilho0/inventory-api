import { z } from 'zod';

const base = {
  name: z.string().trim().min(2, 'name deve ter ao menos 2 caracteres').max(60),
  description: z.string().trim().max(300).optional(),
};

export const createCategorySchema = z.object(base).strict();
export const updateCategorySchema = z
  .object(base)
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Informe ao menos um campo',
  });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
