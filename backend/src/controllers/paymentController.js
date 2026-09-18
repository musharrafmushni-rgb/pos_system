import { paymentService } from '../services/paymentService.js';
import PaymentLog from '../models/PaymentLog.js';

/**
 * Payment Controller
 * 
 * Exposes endpoints for:
 * 1. Simulating payment processing (Success, Failure, 10-second Timeout)
 * 2. Duplicate payment enforcement (blocks second attempts on paid/processing orders)
 * 3. Inspecting transaction audit logs
 */
export const paymentController = {
  /**
   * Process payment for a reserved order.
   * POST /api/payment/process
   * 
   * Body:
   * {
   *   orderId: string,
   *   idempotencyKey?: string,
   *   forceOutcome?: 'SUCCESS' | 'FAILURE' | 'TIMEOUT' (optional simulation override)
   * }
   */
  async processPayment(req, res) {
    try {
      const { orderId, idempotencyKey, forceOutcome } = req.body;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'orderId is required to process payment'
        });
      }

      console.log(`[PaymentController] Processing payment for order: ${orderId} (Force outcome: ${forceOutcome || 'random'})...`);

      const result = await paymentService.processPayment(orderId, idempotencyKey, forceOutcome);

      // Return HTTP 200 for SUCCESS, or HTTP 402 / 408 / 400 for simulation failure
      if (result.outcome === 'SUCCESS') {
        return res.status(200).json(result);
      } else if (result.outcome === 'TIMEOUT') {
        // Return 408 Request Timeout / 504 Gateway Timeout simulation
        return res.status(408).json(result);
      } else {
        // Payment declined / failure
        return res.status(402).json(result);
      }
    } catch (error) {
      console.error('[PaymentController] Payment processing caught error:', error.message);

      const status = error.statusCode || 500;
      return res.status(status).json({
        success: false,
        code: error.code || 'PAYMENT_ERROR',
        message: error.message || 'An unexpected error occurred during payment processing.'
      });
    }
  },

  /**
   * Retrieve transaction logs for an order
   * GET /api/payment/logs/:orderId
   */
  async getPaymentLogs(req, res) {
    try {
      const { orderId } = req.params;
      const logs = await PaymentLog.find({ order_id: orderId }).sort({ createdAt: -1 });

      res.json({
        success: true,
        count: logs.length,
        logs
      });
    } catch (error) {
      console.error('[PaymentController] Error fetching payment logs:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve payment logs' });
    }
  }
};
