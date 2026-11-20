const Category = require('../models/Category');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');

async function findOrFail(id) {
  const category = await Category.findById(id);
  if (!category) throw AppError.notFound('Categoria não encontrada');
  return category;
}

exports.list = async (_req, res) => {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ name: 1 }),
    Product.aggregate([{ $group: { _id: '$category', total: { $sum: 1 } } }]),
  ]);
  const byCategory = new Map(counts.map((c) => [String(c._id), c.total]));
  res.json(
    categories.map((c) => ({ ...c.toJSON(), productCount: byCategory.get(String(c._id)) || 0 })),
  );
};

exports.getById = async (req, res) => {
  res.json(await findOrFail(req.params.id));
};

exports.create = async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json(category);
};

exports.update = async (req, res) => {
  const category = await findOrFail(req.params.id);
  category.set(req.body);
  await category.save();
  res.json(category);
};

exports.remove = async (req, res) => {
  const category = await findOrFail(req.params.id);
  const inUse = await Product.exists({ category: category._id });
  if (inUse) throw AppError.conflict('Não é possível remover uma categoria que possui produtos');
  await category.deleteOne();
  res.status(204).end();
};
