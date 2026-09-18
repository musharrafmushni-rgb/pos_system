import crypto from 'crypto';
import Order from '../models/Order.js';
import { inventoryService } from '../services/inventoryService.js';

/**
 * Checkout Controller
 * 
 * Manages the transition from Shopping Cart to Checkout:
 * 1. Validates cart items.
 * 2. Invokes the Stock Reservation engine to atomically reserve inventory.
 * 3. Creates the Order record in 'PENDING' status with an expiration timestamp.
 * 4. Generates an idempotency key for safe payment submission.
 */
export const checkoutController = {
  /**
   * Initiate Checkout & Reserve Stock
   * POST /api/checkout/initiate
   * 
   * Body:
   * {
   *   items: [{ product_id: string, quantity: number }],
   *   shipping_address?: { fullName, email, street, city, state, zipCode, country },
   *   user_id?: string
   * }
   */
  async initiateCheckout(req, res) {
    try {
      const { items, shipping_address, user_id = 'guest_user_default' } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Checkout requires at least one item in the cart.'
        });
      }

      // Step 1: Stock Reservation (Atomic)
      // If any requested item cannot be reserved due to low inventory,
      // an error is thrown and all partial reservations are rolled back.
      console.log(`[Checkout] Initiating stock reservation for ${items.length} item(s)...`);
      const reservedItems = await inventoryService.reserveStock(items);

      // Step 2: Compute total order price
      const totalAmount = reservedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Step 3: Set reservation expiration (default 10 minutes)
      const expiryMinutes = parseInt(process.env.RESERVATION_EXPIRY_MINUTES || '10', 10);
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      // Generate a fresh idempotency key for this checkout session
      const idempotencyKey = `idem_${crypto.randomUUID()}`;

      // Step 4: Persist Order in PENDING status
      const order = await Order.create({
        user_id,
        items: reservedItems,
        total_amount: Math.round(totalAmount * 100) / 100,
        status: 'PENDING',
        payment_status: 'UNPAID',
        idempotency_key: idempotencyKey,
        reservation_expires_at: expiresAt,
        shipping_address: shipping_address || {
          fullName: 'Jane Doe',
          email: 'jane.doe@example.com',
          street: '123 Market Street',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
          country: 'USA'
        }
      });

      console.log(`[Checkout] Stock reserved successfully. Created Order ${order._id}. Reservation valid until ${expiresAt.toISOString()}`);

      res.status(201).json({
        success: true,
        message: 'Stock reserved successfully for checkout.',
        orderId: order._id,
        order,
        idempotencyKey,
        expiresAt
      });
    } catch (error) {
      console.error('[CheckoutController] Stock reservation or checkout failed:', error.message);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to initiate checkout and reserve stock'
      });
    }
  },

  /**
   * Cancel/Release a pending checkout
   * POST /api/checkout/:orderId/release
   */
  async releaseCheckout(req, res) {
    try {
      const { orderId } = req.params;
      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (order.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: `Cannot release checkout for order with status: ${order.status}`
        });
      }

      // Release reserved items
      await inventoryService.releaseStock(order.items);
      order.status = 'CANCELLED';
      order.payment_status = 'FAILED';
      await order.save();

      res.json({
        success: true,
        message: 'Checkout cancelled and reserved stock returned to inventory.',
        order
      });
    } catch (error) {
      console.error('[CheckoutController] Error releasing checkout:', error);
      res.status(500).json({ success: false, message: 'Failed to release checkout' });
    }
  }
};
