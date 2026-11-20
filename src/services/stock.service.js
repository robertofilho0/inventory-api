const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const AppError = require('../utils/AppError');

/**
 * Registra uma movimentação de estoque de forma atômica.
 * - in: soma `quantity`
 * - out: subtrai `quantity` (falha se não houver saldo suficiente)
 * - adjustment: define o saldo como `quantity` (inventário/contagem)
 */
async function move(productId, { type, quantity, reason }) {
  const current = await Product.findById(productId);
  if (!current) throw AppError.notFound('Produto não encontrado');

  let update;
  let condition = { _id: productId };

  if (type === 'in') {
    update = { $inc: { quantity } };
  } else if (type === 'out') {
    update = { $inc: { quantity: -quantity } };
    condition = { ...condition, quantity: { $gte: quantity } }; // evita estoque negativo
  } else {
    update = { $set: { quantity } };
  }

  const before = await Product.findOneAndUpdate(condition, update, { returnDocument: 'before' });
  if (!before) {
    throw AppError.conflict(
      `Estoque insuficiente: disponível ${current.quantity}, solicitado ${quantity}`,
    );
  }

  const newQuantity =
    type === 'in'
      ? before.quantity + quantity
      : type === 'out'
        ? before.quantity - quantity
        : quantity;

  const movement = await StockMovement.create({
    product: productId,
    type,
    quantity,
    previousQuantity: before.quantity,
    newQuantity,
    reason,
  });

  const product = await Product.findById(productId).populate('category', 'name');
  return { product, movement };
}

module.exports = { move };
