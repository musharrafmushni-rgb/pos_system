const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'quantity must be an integer'
      }
    }
  },
  { _id: false }
);

/**
 * One active cart per user. Items here do NOT reserve stock; reservation
 * happens only when checkout creates a Pending order.
 */
const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'userId is required'],
      trim: true,
      unique: true,
      index: true
    },
    items: {
      type: [cartItemSchema],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', cartSchema);
