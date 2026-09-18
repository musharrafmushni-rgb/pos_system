const Order = require('../models/Order');
const Product = require('../models/Product');
const env = require('../config/env');
const { ORDER_STATUS } = require('../constants/orderStatus');
const AppError = require('../utils/AppError');
const inventoryService = require('./inventoryService');
const { processMockPayment } = require('./paymentService');
const cartService = require('./cartService');

function lineItemsFromCart(cart) {
  return cart.items.map((item) => {
    const product = item.product;
    if (!product || !product._id) {
      throw new AppError('Cart contains a product that no longer exists', 409);
    }
    return {
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity
    };
  });
}

function computeTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function toLineItems(order) {
  return order.items.map((item) => ({
    product: item.product,
    quantity: item.quantity
  }));
}

/**
 * Convert a user's cart into a Pending order and atomically reserve stock.
 * If any line item cannot be reserved, the transaction aborts and no
 * reservedStock is left behind.
 */
async function checkout(userId) {
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw new AppError('userId is required', 400);
  }

  return inventoryService.withTransaction(async (session) => {
    const cart = await cartService.claimCartForCheckout(userId.trim(), session);
    const items = lineItemsFromCart(cart);
    const totalAmount = computeTotal(items);
    const reservationExpiresAt = new Date(Date.now() + env.reservationTtlMs);

    await inventoryService.reserveMany(
      items.map((item) => ({ product: item.product, quantity: item.quantity })),
      session
    );

    const [created] = await Order.create(
      [
        {
          userId: cart.userId,
          items,
          totalAmount,
          status: ORDER_STATUS.PENDING,
          reservationExpiresAt
        }
      ],
      { session }
    );

    return created;
  });
}

/**
 * Expire a Pending order whose reservation window has elapsed.
 * Returning a value (instead of throwing) lets the surrounding transaction commit.
 */
async function expirePendingOrder(order, session, reason) {
  await inventoryService.releaseMany(toLineItems(order), session);
  order.status = ORDER_STATUS.EXPIRED;
  order.expiredAt = new Date();
  order.failureReason = reason || 'Reservation expired';
  await order.save({ session });
  return order;
}

/**
 * Mock payment against a Pending order.
 * Success: permanently deduct reserved units and mark Paid.
 * Failure: release reserved units immediately and mark Failed.
 *
 * If the reservation already timed out, stock is released here (and the
 * result is committed) before the 409 is raised to the caller.
 */
async function payOrder(orderId, successFlag) {
  const payment = processMockPayment({ success: successFlag });

  const result = await inventoryService.withTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status !== ORDER_STATUS.PENDING) {
      throw new AppError(`Order is ${order.status} and cannot be paid`, 409, {
        status: order.status
      });
    }

    if (order.reservationExpiresAt <= new Date()) {
      const expired = await expirePendingOrder(
        order,
        session,
        'Reservation window elapsed'
      );
      return { kind: 'expired', order: expired };
    }

    order.payment = {
      reference: payment.reference,
      outcome: payment.outcome,
      attemptedAt: payment.attemptedAt
    };

    if (payment.success) {
      await inventoryService.commitMany(toLineItems(order), session);
      order.status = ORDER_STATUS.PAID;
      order.paidAt = new Date();
    } else {
      await inventoryService.releaseMany(toLineItems(order), session);
      order.status = ORDER_STATUS.FAILED;
      order.failureReason = 'Mock payment declined';
    }

    await order.save({ session });
    return { kind: 'settled', order };
  });

  if (result.kind === 'expired') {
    throw new AppError('Reservation has expired', 409, {
      status: ORDER_STATUS.EXPIRED,
      orderId: String(result.order._id)
    });
  }

  return result.order;
}

/**
 * Cancel:
 *  - Pending -> release reservation, mark Cancelled
 *  - Paid    -> restock stockCount, mark Cancelled
 */
async function cancelOrder(orderId) {
  const result = await inventoryService.withTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status === ORDER_STATUS.CANCELLED) {
      return { kind: 'cancelled', order };
    }

    if (order.status === ORDER_STATUS.PENDING) {
      if (order.reservationExpiresAt <= new Date()) {
        const expired = await expirePendingOrder(
          order,
          session,
          'Reservation window elapsed'
        );
        return { kind: 'expired', order: expired };
      }

      const claimed = await Order.findOneAndUpdate(
        { _id: orderId, status: ORDER_STATUS.PENDING },
        {
          $set: {
            status: ORDER_STATUS.CANCELLED,
            cancelledAt: new Date()
          }
        },
        { new: true, session }
      );

      if (!claimed) {
        throw new AppError('Order is no longer pending', 409);
      }

      await inventoryService.releaseMany(toLineItems(claimed), session);
      return { kind: 'cancelled', order: claimed };
    }

    if (order.status === ORDER_STATUS.PAID) {
      const claimed = await Order.findOneAndUpdate(
        { _id: orderId, status: ORDER_STATUS.PAID },
        {
          $set: {
            status: ORDER_STATUS.CANCELLED,
            cancelledAt: new Date()
          }
        },
        { new: true, session }
      );

      if (!claimed) {
        throw new AppError('Order is no longer paid', 409);
      }

      await inventoryService.restockMany(toLineItems(claimed), session);
      return { kind: 'cancelled', order: claimed };
    }

    throw new AppError(`Cannot cancel an order in ${order.status} status`, 409, {
      status: order.status
    });
  });

  if (result.kind === 'expired') {
    throw new AppError('Reservation has expired', 409, {
      status: ORDER_STATUS.EXPIRED,
      orderId: String(result.order._id)
    });
  }

  return result.order;
}

/**
 * Background-job helper: expire a single overdue Pending order.
 * Returns null when another worker already claimed it.
 */
async function expireOrderIfPending(orderId) {
  return inventoryService.withTransaction(async (session) => {
    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        status: ORDER_STATUS.PENDING,
        reservationExpiresAt: { $lte: new Date() }
      },
      {
        $set: {
          status: ORDER_STATUS.EXPIRED,
          expiredAt: new Date(),
          failureReason: 'Reservation expired'
        }
      },
      { new: false, session }
    );

    if (!order) {
      return null;
    }

    await inventoryService.releaseMany(toLineItems(order), session);
    return Order.findById(orderId).session(session);
  });
}

async function listOrders(filter = {}) {
  const query = {};
  if (filter.userId) {
    query.userId = filter.userId;
  }
  if (filter.status) {
    query.status = filter.status;
  }
  return Order.find(query).sort({ createdAt: -1 });
}

async function getOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }
  return order;
}

async function createProduct({ name, price, stockCount }) {
  return Product.create({
    name,
    price,
    stockCount,
    reservedStock: 0
  });
}

async function updateProduct(productId, updates) {
  const allowed = {};
  if (updates.name !== undefined) allowed.name = updates.name;
  if (updates.price !== undefined) allowed.price = updates.price;
  if (updates.price !== undefined) {
    const price = Number(updates.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new AppError('price must be a non-negative number', 400);
    }
    allowed.price = price;
  }
  if (updates.stockCount !== undefined) {
    const stockCount = Number(updates.stockCount);
    if (!Number.isInteger(stockCount) || stockCount < 0) {
      throw new AppError('stockCount must be a non-negative integer', 400);
    }
    allowed.stockCount = stockCount;
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const nextStock =
    allowed.stockCount !== undefined ? allowed.stockCount : product.stockCount;
  if (nextStock < product.reservedStock) {
    throw new AppError(
      'stockCount cannot be lower than currently reserved stock',
      409,
      { reservedStock: product.reservedStock, requestedStockCount: nextStock }
    );
  }

  Object.assign(product, allowed);
  await product.save();
  return product;
}

async function deleteProduct(productId) {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }
  if (product.reservedStock > 0) {
    throw new AppError('Cannot delete a product with active reservations', 409, {
      reservedStock: product.reservedStock
    });
  }
  await product.deleteOne();
  return product;
}

module.exports = {
  checkout,
  payOrder,
  cancelOrder,
  expireOrderIfPending,
  listOrders,
  getOrder,
  createProduct,
  updateProduct,
  deleteProduct
};
