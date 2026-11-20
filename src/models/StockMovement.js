const mongoose = require('mongoose');
const toJSON = require('./toJSON');

const TYPES = ['in', 'out', 'adjustment'];

const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    type: { type: String, enum: TYPES, required: true },
    quantity: { type: Number, required: true },
    previousQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    reason: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON },
);

module.exports = mongoose.model('StockMovement', stockMovementSchema);
module.exports.TYPES = TYPES;
