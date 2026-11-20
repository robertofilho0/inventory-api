const mongoose = require('mongoose');
const toJSON = require('./toJSON');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 0, min: 0 },
    minStock: { type: Number, default: 0, min: 0 },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON },
);

productSchema.virtual('lowStock').get(function () {
  return this.quantity <= this.minStock;
});

module.exports = mongoose.model('Product', productSchema);
