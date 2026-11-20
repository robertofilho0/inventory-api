const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'ID inválido');
const idParams = z.object({ id: objectId });
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const atLeastOne = (schema) =>
  schema.refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

module.exports = { z, objectId, idParams, pagination, atLeastOne };
