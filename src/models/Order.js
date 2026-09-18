const mongoose = require('mongoose');
const { ORDER_STATUS } = require('../constants/orderStatus');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'quantity must be an integer'
      }
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'userId is required'],
      trim: true,
      index: true
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'An order must contain at least one item'
      }
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index: true
    },
    /**
     * After this instant a Pending order is treated as expired, even if the
     * background job has not run yet. Payment and cancel flows honour this.
     */
    reservationExpiresAt: {
      type: Date,
      required: true
    },
    payment: {
      reference: { type: String },
      outcome: { type: String, enum: ['success', 'failure'] },
      attemptedAt: { type: Date }
    },
    paidAt: { type: Date },
    cancelledAt: { type: Date },
    expiredAt: { type: Date },
    failureReason: { type: String }
  },
  { timestamps: true }
);

// Background expiry job looks up Pending orders whose reservation has lapsed.
orderSchema.index({ status: 1, reservationExpiresAt: 1 });

module.exports = mongoose.model('Order', orderSchema);
