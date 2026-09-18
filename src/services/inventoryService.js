const mongoose = require('mongoose');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');

function assertPositiveInteger(quantity, label = 'quantity') {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new AppError(`${label} must be a positive integer`, 400);
  }
}

/**
 * Available stock is never stored; it is always derived.
 */
function toAvailable(product) {
  return product.stockCount - product.reservedStock;
}

/**
 * Atomically reserve `quantity` units.
 *
 * The availability predicate ($expr) and the $inc run in a single write, so
 * two concurrent checkouts cannot both reserve the last unit. A plain
 * read-then-write would race.
 *
 * @returns {Promise<import('mongoose').Document>} updated product
 */
async function reserveStock(productId, quantity, session) {
  assertPositiveInteger(quantity);

  const product = await Product.findOneAndUpdate(
    {
      _id: productId,
      $expr: {
        $gte: [{ $subtract: ['$stockCount', '$reservedStock'] }, quantity]
      }
    },
    { $inc: { reservedStock: quantity } },
    { new: true, session }
  );

  if (!product) {
    const current = await Product.findById(productId).session(session);
    if (!current) {
      throw new AppError(`Product ${productId} not found`, 404);
    }
    throw new AppError(
      `Insufficient available stock for product "${current.name}"`,
      409,
      {
        productId: String(productId),
        requested: quantity,
        available: toAvailable(current)
      }
    );
  }

  return product;
}

/**
 * Release a Pending reservation back to available inventory.
 * stockCount is unchanged; only reservedStock decreases.
 */
async function releaseReservation(productId, quantity, session) {
  assertPositiveInteger(quantity);

  const product = await Product.findOneAndUpdate(
    {
      _id: productId,
      reservedStock: { $gte: quantity }
    },
    { $inc: { reservedStock: -quantity } },
    { new: true, session }
  );

  if (!product) {
    throw new AppError(
      `Unable to release reservation for product ${productId}`,
      409,
      { productId: String(productId), quantity }
    );
  }

  return product;
}

/**
 * Payment success: convert a reservation into a permanent sale.
 * Both stockCount and reservedStock decrease in one atomic write.
 */
async function commitReservation(productId, quantity, session) {
  assertPositiveInteger(quantity);

  const product = await Product.findOneAndUpdate(
    {
      _id: productId,
      reservedStock: { $gte: quantity },
      stockCount: { $gte: quantity }
    },
    { $inc: { stockCount: -quantity, reservedStock: -quantity } },
    { new: true, session }
  );

  if (!product) {
    throw new AppError(
      `Unable to commit reservation for product ${productId}`,
      409,
      { productId: String(productId), quantity }
    );
  }

  return product;
}

/**
 * Paid-order cancellation / restock: return sold units to on-hand inventory.
 */
async function restock(productId, quantity, session) {
  assertPositiveInteger(quantity);

  const product = await Product.findOneAndUpdate(
    { _id: productId },
    { $inc: { stockCount: quantity } },
    { new: true, session }
  );

  if (!product) {
    throw new AppError(`Product ${productId} not found`, 404);
  }

  return product;
}

async function reserveMany(items, session) {
  const updated = [];
  for (const item of items) {
    updated.push(await reserveStock(item.product, item.quantity, session));
  }
  return updated;
}

async function releaseMany(items, session) {
  const updated = [];
  for (const item of items) {
    updated.push(await releaseReservation(item.product, item.quantity, session));
  }
  return updated;
}

async function commitMany(items, session) {
  const updated = [];
  for (const item of items) {
    updated.push(await commitReservation(item.product, item.quantity, session));
  }
  return updated;
}

async function restockMany(items, session) {
  const updated = [];
  for (const item of items) {
    updated.push(await restock(item.product, item.quantity, session));
  }
  return updated;
}

async function getAvailableStock(productId) {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  return {
    productId: product.id,
    name: product.name,
    stockCount: product.stockCount,
    reservedStock: product.reservedStock,
    availableStock: toAvailable(product)
  };
}

/**
 * Runs `work(session)` inside a MongoDB multi-document transaction.
 * If any step throws, every stock mutation and order write is rolled back.
 */
async function withTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    const message = err && err.message ? err.message : '';
    if (
      message.includes('Transaction numbers are only allowed') ||
      message.includes('replica set')
    ) {
      throw new AppError(
        'MongoDB replica set required for transactions. Start `docker compose up -d` or use Atlas.',
        503
      );
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  toAvailable,
  reserveStock,
  releaseReservation,
  commitReservation,
  restock,
  reserveMany,
  releaseMany,
  commitMany,
  restockMany,
  getAvailableStock,
  withTransaction
};
