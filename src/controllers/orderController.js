const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const orderService = require('../services/orderService');

exports.checkout = asyncHandler(async (req, res) => {
  const userId = req.body.userId;
  if (!userId) {
    throw new AppError('userId is required', 400);
  }
  const order = await orderService.checkout(userId);
  res.status(201).json({
    success: true,
    message: 'Stock reserved. Complete payment before the reservation expires.',
    data: order
  });
});

function parseOptionalBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return undefined;
}

exports.pay = asyncHandler(async (req, res) => {
  const successFlag = parseOptionalBoolean(req.body && req.body.success);
  const order = await orderService.payOrder(req.params.id, successFlag);
  const message =
    order.status === 'Paid'
      ? 'Payment captured and stock deducted'
      : 'Payment failed; reserved stock released';
  res.json({ success: true, message, data: order });
});

exports.cancel = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(req.params.id);
  res.json({ success: true, message: 'Order cancelled', data: order });
});

exports.list = asyncHandler(async (req, res) => {
  const orders = await orderService.listOrders({
    userId: req.query.userId,
    status: req.query.status
  });
  res.json({ success: true, data: orders });
});

exports.get = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.params.id);
  res.json({ success: true, data: order });
});
