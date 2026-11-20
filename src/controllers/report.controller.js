const Product = require('../models/Product');

exports.summary = async (_req, res) => {
  const [totals] = await Product.aggregate([
    { $match: { active: true } },
    {
      $group: {
        _id: null,
        products: { $sum: 1 },
        units: { $sum: '$quantity' },
        inventoryValue: { $sum: { $multiply: ['$price', '$quantity'] } },
        lowStock: { $sum: { $cond: [{ $lte: ['$quantity', '$minStock'] }, 1, 0] } },
        outOfStock: { $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] } },
      },
    },
    { $project: { _id: 0 } },
  ]);

  const byCategory = await Product.aggregate([
    { $match: { active: true } },
    {
      $group: {
        _id: '$category',
        products: { $sum: 1 },
        units: { $sum: '$quantity' },
        inventoryValue: { $sum: { $multiply: ['$price', '$quantity'] } },
      },
    },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
    { $unwind: '$category' },
    { $project: { _id: 0, category: '$category.name', products: 1, units: 1, inventoryValue: 1 } },
    { $sort: { inventoryValue: -1 } },
  ]);

  res.json({
    ...(totals || { products: 0, units: 0, inventoryValue: 0, lowStock: 0, outOfStock: 0 }),
    byCategory,
  });
};

exports.lowStock = async (_req, res) => {
  const products = await Product.find({ active: true, $expr: { $lte: ['$quantity', '$minStock'] } })
    .populate('category', 'name')
    .sort({ quantity: 1 });
  res.json(products);
};
