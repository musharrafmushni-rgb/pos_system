const asyncHandler = require('../utils/asyncHandler');
const cartService = require('../services/cartService');

exports.getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getOrCreateCart(req.params.userId);
  res.json({ success: true, data: cartService.serializeCart(cart) });
});

exports.addItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const cart = await cartService.addItem(req.params.userId, productId, quantity);
  res.status(201).json({ success: true, data: cart });
});

exports.updateItem = asyncHandler(async (req, res) => {
  const quantity = req.body.quantity;
  const cart = await cartService.updateItem(
    req.params.userId,
    req.params.productId,
    quantity
  );
  res.json({ success: true, data: cart });
});

exports.removeItem = asyncHandler(async (req, res) => {
  const cart = await cartService.removeItem(req.params.userId, req.params.productId);
  res.json({ success: true, data: cart });
});

exports.clearCart = asyncHandler(async (req, res) => {
  await cartService.clearCart(req.params.userId);
  const cart = await cartService.getOrCreateCart(req.params.userId);
  res.json({ success: true, data: cartService.serializeCart(cart) });
});
