import mongoose from 'mongoose';

/**
 * PaymentLog Schema
 * 
 * Immutable audit log of every payment transaction, attempt, failure, timeout,
 * duplicate rejection, or refund.
 */
const paymentLogSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    status: {
      type: String,
      required: true,
      enum: [
        'INITIATED',
        'PROCESSING',
        'SUCCESS',
        'FAILED',
        'TIMEOUT',
        'DUPLICATE_REJECTED',
        'REFUNDED'
      ],
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    idempotency_key: {
      type: String,
      required: false,
      index: true
    },
    gateway_response: {
      transaction_id: { type: String },
      outcome: { type: String },
      message: { type: String },
      latency_ms: { type: Number },
      simulated_mode: { type: String },
      raw: { type: mongoose.Schema.Types.Mixed }
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

const PaymentLog = mongoose.model('PaymentLog', paymentLogSchema);

export default PaymentLog;
