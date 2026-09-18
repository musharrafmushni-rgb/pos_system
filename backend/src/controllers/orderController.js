import Order from '../models/Order.js';
import PaymentLog from '../models/PaymentLog.js';
import { paymentService } from '../services/paymentService.js';
import { inventoryService } from '../services/inventoryService.js';
import crypto from 'crypto';

/**
 * Order Controller
 * 
 * Manages post-purchase flow:
 * 1. Order history listing and status filtering
 * 2. Order details & audit log view
 * 3. Order cancellation & simulated refund processing
 * 4. Retry payment for failed orders
 */
export const orderController = {
  /**
   * Get all orders for the user (with optional status filter)
   * GET /api/orders
   */
  async getOrderHistory(req, res) {
    try {
      const { status, user_id = 'guest_user_default' } = req.query;

      const query = { user_id };
      if (status && status !== 'ALL') {
        query.status = status.toUpperCase();
      }

      const orders = await Order.find(query).sort({ createdAt: -1 });

      res.json({
        success: true,
        count: orders.length,
        orders
      });
    } catch (error) {
      console.error('[OrderController] Error fetching order history:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve order history' });
    }
  },

  /**
   * Get single order by ID with its payment audit logs
   * GET /api/orders/:id
   */
  async getOrderById(req, res) {
    try {
      const { id } = req.params;
      const order = await Order.findById(id);

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const paymentLogs = await PaymentLog.find({ order_id: order._id }).sort({ createdAt: -1 });

      res.json({
        success: true,
        order,
        paymentLogs
      });
    } catch (error) {
      console.error('[OrderController] Error fetching order:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve order' });
    }
  },

  /**
   * Cancel an order and simulate refund if already paid
   * POST /api/orders/:id/cancel
   */
  async cancelOrder(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      console.log(`[OrderController] Processing cancellation/refund for order: ${id}...`);

      const result = await paymentService.cancelAndRefundOrder(id, reason);

      res.json(result);
    } catch (error) {
      console.error('[OrderController] Error cancelling order:', error.message);
      const status = error.statusCode || 500;
      res.status(status).json({
        success: false,
        message: error.message || 'Failed to cancel and refund order'
      });
    }
  },

  /**
   * Retry payment on a previously failed or timed-out order
   * POST /api/orders/:id/retry
   */
  async retryPayment(req, res) {
    try {
      const { id } = req.params;
      const order = await Order.findById(id);

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (order.status === 'PAID') {
        return res.status(400).json({ success: false, message: 'Order is already paid.' });
      }

      // Re-reserve stock since previous failure or timeout released it
      console.log(`[OrderController] Retrying payment for order ${id}. Re-reserving stock...`);
      await inventoryService.reserveStock(order.items);

      // Reset order state to PENDING and extend reservation
      const expiryMinutes = parseInt(process.env.RESERVATION_EXPIRY_MINUTES || '10', 10);
      order.status = 'PENDING';
      order.payment_status = 'UNPAID';
      order.reservation_expires_at = new Date(Date.now() + expiryMinutes * 60 * 1000);
      order.idempotency_key = `idem_${crypto.randomUUID()}`;
      await order.save();

      res.json({
        success: true,
        message: 'Order reactivated and stock re-reserved. Ready for payment retry.',
        order,
        idempotencyKey: order.idempotency_key
      });
    } catch (error) {
      console.error('[OrderController] Error retrying payment for order:', error.message);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to retry order. Items might be out of stock.'
      });
    }
  }
};
