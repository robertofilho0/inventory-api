const Product = require('../models/Product');
const Category = require('../models/Category');
const StockMovement = require('../models/StockMovement');
const AppError = require('../utils/AppError');
const stockService = require('../services/stock.service');

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function findOrFail(id) {
  const product = await Product.findById(id).populate('category', 'name');
  if (!product) throw AppError.notFound('Produto não encontrado');
  return product;
}

async function ensureCategory(id) {
  if (id && !(await Category.exists({ _id: id }))) {
    throw AppError.badRequest('Categoria informada não existe');
  }
}

exports.list = async (req, res) => {
  const q = req.validated.query;
  const filter = {};

  if (q.category) filter.category = q.category;
  if (q.active) filter.active = q.active === 'true';
  if (q.search) {
    const regex = { $regex: escapeRegex(q.search), $options: 'i' };
    filter.$or = [{ name: regex }, { sku: regex }];
  }
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    filter.price = {};
    if (q.minPrice !== undefined) filter.price.$gte = q.minPrice;
    if (q.maxPrice !== undefined) filter.price.$lte = q.maxPrice;
  }
  if (q.lowStock) {
    filter.$expr = { [q.lowStock === 'true' ? '$lte' : '$gt']: ['$quantity', '$minStock'] };
  }

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .populate('category', 'name')
      .sort({ [q.sortBy]: q.order === 'asc' ? 1 : -1, _id: 1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
  ]);

  res.json({
    data: products,
    meta: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) || 1 },
  });
};

exports.getById = async (req, res) => {
  res.json(await findOrFail(req.params.id));
};

exports.create = async (req, res) => {
  await ensureCategory(req.body.category);
  const { quantity = 0, ...data } = req.body;

  const product = await Product.create({ ...data, quantity });
  if (quantity > 0) {
    await StockMovement.create({
      product: product._id,
      type: 'in',
      quantity,
      previousQuantity: 0,
      newQuantity: quantity,
      reason: 'Estoque inicial',
    });
  }

  res.status(201).json(await findOrFail(product._id));
};

exports.update = async (req, res) => {
  await ensureCategory(req.body.category);
  const product = await Product.findById(req.params.id);
  if (!product) throw AppError.notFound('Produto não encontrado');
  product.set(req.body);
  await product.save();
  res.json(await findOrFail(product._id));
};

exports.remove = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw AppError.notFound('Produto não encontrado');
  await Promise.all([product.deleteOne(), StockMovement.deleteMany({ product: product._id })]);
  res.status(204).end();
};

exports.addMovement = async (req, res) => {
  const result = await stockService.move(req.params.id, req.body);
  res.status(201).json(result);
};

exports.listMovements = async (req, res) => {
  await findOrFail(req.params.id);
  const { page, limit } = req.validated.query;
  const filter = { product: req.params.id };

  const [total, movements] = await Promise.all([
    StockMovement.countDocuments(filter),
    StockMovement.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  res.json({
    data: movements,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
  });
};
