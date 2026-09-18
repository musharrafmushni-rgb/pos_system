import mongoose from 'mongoose';

/**
 * Order Item Sub-schema
 */
const orderItemSchema = new mongoose.Schema(
  {
    product_id: {
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
      min: 1
    },
    imageUrl: {
      type: String
    }
  },
  { _id: false }
);

/**
 * Order Schema
 * 
 * Tracks order status, payment status, inventory reservation window,
 * and idempotency key for preventing duplicate payments.
 */
const orderSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      default: 'guest_user_default',
      index: true
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'An order must contain at least one item'
      }
    },
    total_amount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'],
      default: 'PENDING',
      index: true
    },
    payment_status: {
      type: String,
      required: true,
      enum: ['UNPAID', 'PROCESSING', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'REFUNDED'],
      default: 'UNPAID',
      index: true
    },
    // Idempotency key generated per payment attempt to prevent double charging
    idempotency_key: {
      type: String,
      sparse: true,
      index: true
    },
    // Tracks when the stock reservation expires (e.g., 10 mins from creation)
    reservation_expires_at: {
      type: Date,
      required: true
    },
    // Customer details for shipping
    shipping_address: {
      fullName: { type: String, default: 'Jane Doe' },
      email: { type: String, default: 'jane.doe@example.com' },
      street: { type: String, default: '123 Market Street' },
      city: { type: String, default: 'San Francisco' },
      state: { type: String, default: 'CA' },
      zipCode: { type: String, default: '94105' },
      country: { type: String, default: 'USA' }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual to check if stock reservation has expired
orderSchema.virtual('is_expired').get(function () {
  if (this.status !== 'PENDING') return false;
  return new Date() > new Date(this.reservation_expires_at);
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
