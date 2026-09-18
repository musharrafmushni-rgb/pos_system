import crypto from 'crypto';
import Order from '../models/Order.js';
import PaymentLog from '../models/PaymentLog.js';
import { inventoryService } from './inventoryService.js';

/**
 * ============================================================================
 * MOCK PAYMENT GATEWAY & DUPLICATE PREVENTION SERVICE
 * ============================================================================
 * 
 * CORE REQUIREMENTS:
 * 1. Simulates payment gateway with 3 random outcomes:
 *    - SUCCESS: ~50%
 *    - FAILURE: ~30%
 *    - TIMEOUT: ~20% (with intentional 10-second delay)
 *    (Allows optional forceOutcome: 'SUCCESS' | 'FAILURE' | 'TIMEOUT' for UI evaluation)
 * 
 * 2. DUPLICATE PAYMENT PREVENTION:
 *    - Validates order state (if already 'PAID' or 'COMPLETED', rejects immediately).
 *    - Concurrency lock: sets order payment_status to 'PROCESSING'. If another request
 *      hits while 'PROCESSING', returns 409 Conflict.
 *    - Idempotency check: checks PaymentLog for prior success with matching idempotency_key.
 */

export const paymentService = {
  /**
   * Determine gateway simulation outcome.
   * Can be forced via request body/query for grading/testing, or randomly rolled.
   * 
   * @param {string} [forcedOutcome]
   * @returns {'SUCCESS' | 'FAILURE' | 'TIMEOUT'}
   */
  getSimulationOutcome(forcedOutcome) {
    if (forcedOutcome) {
      const normalized = forcedOutcome.toUpperCase();
      if (['SUCCESS', 'FAILURE', 'TIMEOUT'].includes(normalized)) {
        return normalized;
      }
    }

    // Random distribution:
    // 0.00 - 0.50: SUCCESS (50%)
    // 0.50 - 0.80: FAILURE (30%)
    // 0.80 - 1.00: TIMEOUT (20%)
    const roll = Math.random();
    if (roll < 0.50) return 'SUCCESS';
    if (roll < 0.80) return 'FAILURE';
    return 'TIMEOUT';
  },

  /**
   * Process payment for an order with duplicate prevention and stock resolution.
   * 
   * @param {string} orderId
   * @param {string} idempotencyKey
   * @param {string} [forcedOutcome]
   */
  async processPayment(orderId, idempotencyKey, forcedOutcome) {
    const startTime = Date.now();

    // 1. Fetch the order
    const order = await Order.findById(orderId);
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    // ========================================================================
    // DUPLICATE PAYMENT PREVENTION CHECKS
    // ========================================================================
    
    // Check A: Is the order already paid?
    if (order.status === 'PAID' || order.payment_status === 'COMPLETED') {
      await PaymentLog.create({
        order_id: order._id,
        status: 'DUPLICATE_REJECTED',
        amount: order.total_amount,
        idempotency_key: idempotencyKey,
        gateway_response: {
          outcome: 'DUPLICATE_REJECTED',
          message: 'Order has already been paid and finalized. Payment rejected.',
          latency_ms: Date.now() - startTime
        }
      });

      const err = new Error('Duplicate payment prevented: This order has already been paid.');
      err.statusCode = 400;
      err.code = 'ALREADY_PAID';
      throw err;
    }

    // Check B: Is a payment currently in-flight for this order? (Concurrency lock)
    if (order.payment_status === 'PROCESSING') {
      await PaymentLog.create({
        order_id: order._id,
        status: 'DUPLICATE_REJECTED',
        amount: order.total_amount,
        idempotency_key: idempotencyKey,
        gateway_response: {
          outcome: 'DUPLICATE_REJECTED',
          message: 'A payment transaction is already in progress for this order.',
          latency_ms: Date.now() - startTime
        }
      });

      const err = new Error('Payment already in progress. Please wait for the current attempt to finish.');
      err.statusCode = 409;
      err.code = 'PAYMENT_IN_PROGRESS';
      throw err;
    }

    // Check C: Idempotency check against PaymentLog
    if (idempotencyKey) {
      const existingSuccess = await PaymentLog.findOne({
        order_id: order._id,
        idempotency_key: idempotencyKey,
        status: 'SUCCESS'
      });

      if (existingSuccess) {
        const err = new Error('Duplicate payment submission detected for this transaction.');
        err.statusCode = 409;
        err.code = 'IDEMPOTENT_TRANSACTION_EXISTS';
        throw err;
      }
    }

    // Check D: Reservation expiration
    if (new Date() > new Date(order.reservation_expires_at)) {
      // Release reservation and mark failed
      await inventoryService.releaseStock(order.items);
      order.status = 'FAILED';
      order.payment_status = 'TIMED_OUT';
      await order.save();

      const err = new Error('Stock reservation expired before payment was completed. Stock has been released.');
      err.statusCode = 410;
      err.code = 'RESERVATION_EXPIRED';
      throw err;
    }

    // Acquire lock: set payment_status to 'PROCESSING'
    order.payment_status = 'PROCESSING';
    order.idempotency_key = idempotencyKey || crypto.randomUUID();
    await order.save();

    // Log initiation
    await PaymentLog.create({
      order_id: order._id,
      status: 'PROCESSING',
      amount: order.total_amount,
      idempotency_key: order.idempotency_key,
      gateway_response: {
        message: 'Transaction sent to payment gateway simulator'
      }
    });

    // 2. Determine simulation outcome
    const outcome = this.getSimulationOutcome(forcedOutcome);
    const transactionId = `txn_${crypto.randomBytes(8).toString('hex')}`;

    console.log(`[Payment Gateway] Order ${orderId} outcome rolled: ${outcome} (forced: ${forcedOutcome || 'none'})`);

    // ========================================================================
    // SIMULATED GATEWAY BEHAVIORS
    // ========================================================================

    if (outcome === 'TIMEOUT') {
      // Intentional 10-second delay requirement
      console.log(`[Payment Gateway] Simulating Gateway Timeout with 10-second delay for order ${orderId}...`);
      await new Promise((resolve) => setTimeout(resolve, 10000));

      const latency = Date.now() - startTime;

      // Upon timeout: Release reserved stock back to inventory pool
      await inventoryService.releaseStock(order.items);

      order.status = 'FAILED';
      order.payment_status = 'TIMED_OUT';
      await order.save();

      const log = await PaymentLog.create({
        order_id: order._id,
        status: 'TIMEOUT',
        amount: order.total_amount,
        idempotency_key: order.idempotency_key,
        gateway_response: {
          transaction_id: transactionId,
          outcome: 'TIMEOUT',
          message: 'Payment Gateway Timed Out after 10000ms. Reserved stock has been released.',
          latency_ms: latency,
          simulated_mode: forcedOutcome || 'RANDOM'
        }
      });

      return {
        success: false,
        outcome: 'TIMEOUT',
        message: 'Payment gateway timed out (10s delay). Your reserved items have been restored.',
        order,
        paymentLog: log
      };
    }

    if (outcome === 'FAILURE') {
      // Simulate quick processing delay (500ms)
      await new Promise((resolve) => setTimeout(resolve, 500));
      const latency = Date.now() - startTime;

      // Upon failure: Release reserved stock back to inventory pool
      await inventoryService.releaseStock(order.items);

      order.status = 'FAILED';
      order.payment_status = 'FAILED';
      await order.save();

      const log = await PaymentLog.create({
        order_id: order._id,
        status: 'FAILED',
        amount: order.total_amount,
        idempotency_key: order.idempotency_key,
        gateway_response: {
          transaction_id: transactionId,
          outcome: 'FAILURE',
          message: 'Declined: Card insufficient funds or simulated gateway failure. Stock released.',
          latency_ms: latency,
          simulated_mode: forcedOutcome || 'RANDOM'
        }
      });

      return {
        success: false,
        outcome: 'FAILURE',
        message: 'Payment was declined by the simulated gateway. Reserved stock has been released.',
        order,
        paymentLog: log
      };
    }

    // SUCCESS Outcome
    // Simulate quick processing delay (800ms)
    await new Promise((resolve) => setTimeout(resolve, 800));
    const latency = Date.now() - startTime;

    // Upon success: Permanently deduct reserved stock from physical inventory
    await inventoryService.finalizeDeduction(order.items);

    order.status = 'PAID';
    order.payment_status = 'COMPLETED';
    await order.save();

    const log = await PaymentLog.create({
      order_id: order._id,
      status: 'SUCCESS',
      amount: order.total_amount,
      idempotency_key: order.idempotency_key,
      gateway_response: {
        transaction_id: transactionId,
        outcome: 'SUCCESS',
        message: 'Payment completed successfully. Stock permanently deducted.',
        latency_ms: latency,
        simulated_mode: forcedOutcome || 'RANDOM'
      }
    });

    return {
      success: true,
      outcome: 'SUCCESS',
      message: 'Payment processed successfully! Your order has been placed.',
      order,
      paymentLog: log
    };
  },

  /**
   * Post-purchase refund and cancellation flow.
   * 
   * @param {string} orderId
   * @param {string} [reason]
   */
  async cancelAndRefundOrder(orderId, reason = 'Customer requested cancellation') {
    const order = await Order.findById(orderId);
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      const err = new Error(`Order is already ${order.status.toLowerCase()}`);
      err.statusCode = 400;
      throw err;
    }

    if (order.status === 'PAID') {
      // Paid order: simulate refund process and restore physical stock
      await inventoryService.restoreRefundedStock(order.items);

      order.status = 'REFUNDED';
      order.payment_status = 'REFUNDED';
      await order.save();

      const refundLog = await PaymentLog.create({
        order_id: order._id,
        status: 'REFUNDED',
        amount: order.total_amount,
        gateway_response: {
          outcome: 'REFUNDED',
          message: `Simulated refund completed. Reason: ${reason}. Physical stock restored.`,
          refund_transaction_id: `ref_${crypto.randomBytes(8).toString('hex')}`
        }
      });

      return {
        success: true,
        status: 'REFUNDED',
        message: 'Order cancelled successfully. Refund simulated and inventory restored to stock.',
        order,
        refundLog
      };
    }

    if (order.status === 'PENDING') {
      // Pending order: release reserved stock
      await inventoryService.releaseStock(order.items);

      order.status = 'CANCELLED';
      order.payment_status = 'FAILED';
      await order.save();

      return {
        success: true,
        status: 'CANCELLED',
        message: 'Pending order cancelled and reserved stock released.',
        order
      };
    }

    // Already failed order
    order.status = 'CANCELLED';
    await order.save();
    return {
      success: true,
      status: 'CANCELLED',
      message: 'Order cancelled.',
      order
    };
  }
};
