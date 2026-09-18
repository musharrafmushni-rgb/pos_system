const Cart = require('../models/Cart');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { toAvailable } = require('./inventoryService');

async function getOrCreateCart(userId) {
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw new AppError('userId is required', 400);
  }

  const normalized = userId.trim();
  const cart = await Cart.findOneAndUpdate(
    { userId: normalized },
    { $setOnInsert: { userId: normalized, items: [] } },
    { new: true, upsert: true }
  ).populate('items.product');

  return cart;
}

function serializeCart(cart) {
  const items = (cart.items || []).map((item) => {
    const product = item.product;
    const productId = product && product._id ? product._id : item.product;
    return {
      productId: String(productId),
      name: product && product.name ? product.name : undefined,
      price: product && typeof product.price === 'number' ? product.price : undefined,
      quantity: item.quantity,
      availableStock:
        product && typeof product.stockCount === 'number'
          ? toAvailable(product)
          : undefined
    };
  });

  return {
    id: cart.id,
    userId: cart.userId,
    items
  };
}

async function addItem(userId, productId, quantity) {
  const qty = Number.parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new AppError('quantity must be a positive integer', 400);
  }
  quantity = qty;

  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find(
    (item) => String(item.product._id || item.product) === String(productId)
  );
  const nextQty = (existing ? existing.quantity : 0) + quantity;

  if (nextQty > toAvailable(product)) {
    throw new AppError(
      `Cannot add ${quantity} unit(s) of "${product.name}" to cart`,
      409,
      { available: toAvailable(product), requestedTotal: nextQty }
    );
  }

  if (existing) {
    existing.quantity = nextQty;
  } else {
    cart.items.push({ product: product._id, quantity });
  }

  await cart.save();
  await cart.populate('items.product');
  return serializeCart(cart);
}

async function updateItem(userId, productId, quantity) {
  const qty = Number.parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty < 0) {
    throw new AppError('quantity must be a non-negative integer', 400);
  }
  quantity = qty;

  if (quantity === 0) {
    return removeItem(userId, productId);
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (quantity > toAvailable(product)) {
    throw new AppError('Requested quantity exceeds available stock', 409, {
      available: toAvailable(product)
    });
  }

  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find(
    (item) => String(item.product._id || item.product) === String(productId)
  );

  if (!existing) {
    throw new AppError('Item is not in the cart', 404);
  }

  existing.quantity = quantity;
  await cart.save();
  await cart.populate('items.product');
  return serializeCart(cart);
}

async function removeItem(userId, productId) {
  const cart = await getOrCreateCart(userId);
  const before = cart.items.length;
  cart.items = cart.items.filter(
    (item) => String(item.product._id || item.product) !== String(productId)
  );

  if (cart.items.length === before) {
    throw new AppError('Item is not in the cart', 404);
  }

  await cart.save();
  await cart.populate('items.product');
  return serializeCart(cart);
}

async function clearCart(userId, session) {
  const query = Cart.findOneAndUpdate(
    { userId },
    { $set: { items: [] } },
    { new: true }
  );
  if (session) {
    query.session(session);
  }
  return query;
}

/**
 * Load the cart inside a transaction and empty it in the same round-trip.
 * A second concurrent checkout of the same cart then sees no items, so
 * the same basket cannot be converted into two orders.
 */
async function claimCartForCheckout(userId, session) {
  const cart = await Cart.findOne({ userId })
    .session(session)
    .populate('items.product');

  if (!cart || !cart.items.length) {
    throw new AppError('Cart is empty', 400);
  }

  const claimed = await Cart.findOneAndUpdate(
    { _id: cart._id, 'items.0': { $exists: true } },
    { $set: { items: [] } },
    { new: false, session }
  );

  if (!claimed) {
    throw new AppError('Cart is empty', 400);
  }

  return cart;
}

module.exports = {
  getOrCreateCart,
  serializeCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  claimCartForCheckout
};
