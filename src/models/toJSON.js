/** Opções de serialização comuns: expõe `id` e oculta `_id`/`__v`. */
module.exports = {
  versionKey: false,
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
};
