const { z, atLeastOne } = require('./common');

const base = {
  name: z.string().trim().min(2, 'name deve ter ao menos 2 caracteres').max(60),
  description: z.string().trim().max(300).optional(),
};

module.exports = {
  createBody: z.object(base).strict(),
  updateBody: atLeastOne(z.object(base).partial().strict()),
};
