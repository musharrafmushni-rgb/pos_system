const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const orderService = require('../services/orderService');
const inventoryService = require('../services/inventoryService');

function parseCreateBody(body) {
  const { name } = body;
  const price = Number(body.price);
  const stockCount = Number(body.stockCount);
  if (!name || typeof name !== 'string') {
    throw new AppError('name is required', 400);
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new AppError('price must be a non-negative number', 400);
  }
  if (!Number.isInteger(stockCount) || stockCount < 0) {
    throw new AppError('stockCount must be a non-negative integer', 400);
  }
  return { name: name.trim(), price, stockCount };
}

exports.createProduct = asyncHandler(async (req, res) => {
  const product = await orderService.createProduct(parseCreateBody(req.body));
  res.status(201).json({ success: true, data: product });
});

exports.listProducts = asyncHandler(async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json({ success: true, data: products });
});

exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new AppError('Product not found', 404);
  }
  res.json({ success: true, data: product });
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await orderService.updateProduct(req.params.id, req.body);
  res.json({ success: true, data: product });
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  await orderService.deleteProduct(req.params.id);
  res.json({ success: true, message: 'Product deleted' });
});

exports.getAvailableStock = asyncHandler(async (req, res) => {
  const data = await inventoryService.getAvailableStock(req.params.id);
  res.json({ success: true, data });
});
