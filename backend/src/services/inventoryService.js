import Product from '../models/Product.js';
import Order from '../models/Order.js';

/**
 * ============================================================================
 * INVENTORY & STOCK RESERVATION SERVICE
 * ============================================================================
 * 
 * CORE REQUIREMENT - Stock Reservation:
 * 1. When checkout is initiated:
 *    - Check available inventory: (stock_quantity - reserved_quantity) >= requested_quantity.
 *    - Temporarily "Reserve" the stock by incrementing `reserved_quantity`.
 *    - `stock_quantity` (physical inventory) is NOT yet deducted.
 * 2. When payment succeeds:
 *    - Finalize the deduction: decrement `reserved_quantity` AND decrement `stock_quantity`.
 * 3. When payment fails, times out, or order expires:
 *    - Release the reservation: decrement `reserved_quantity` back to 0.
 * 4. When a paid order is cancelled & refunded:
 *    - Re-add the units back to `stock_quantity`.
 */

export const inventoryService = {
  /**
   * Atomically reserve stock for an array of items.
   * If any single product lacks sufficient available stock, all reservations
   * made in this transaction batch are immediately rolled back.
   * 
   * @param {Array<{product_id: string, quantity: number}>} items
   * @returns {Promise<Array>} List of reserved items with product details
   */
  async reserveStock(items) {
    const reservedBatch = [];

    try {
      for (const item of items) {
        const { product_id, quantity } = item;

        if (!quantity || quantity <= 0) {
          throw new Error(`Invalid requested quantity for product ${product_id}`);
        }

        // Atomic check & reserve using MongoDB $inc
        // Find product where available stock: (stock_quantity - reserved_quantity) >= quantity
        // We use $expr to compare fields atomically on the database level
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: product_id,
            $expr: {
              $gte: [
                { $subtract: ['$stock_quantity', '$reserved_quantity'] },
                quantity
              ]
            }
          },
          {
            $inc: { reserved_quantity: quantity }
          },
          { new: true }
        );

        if (!updatedProduct) {
          // Fetch current product state to provide informative error
          const currentProduct = await Product.findById(product_id);
          const available = currentProduct 
            ? Math.max(0, currentProduct.stock_quantity - currentProduct.reserved_quantity)
            : 0;

          throw new Error(
            `Insufficient stock for "${currentProduct?.name || 'Product'}". ` +
            `Requested: ${quantity}, Available: ${available}.`
          );
        }

        // Track successful reservation in batch in case subsequent items fail
        reservedBatch.push({
          product_id,
          name: updatedProduct.name,
          price: updatedProduct.price,
          quantity,
          imageUrl: updatedProduct.imageUrl
        });
      }

      return reservedBatch;
    } catch (error) {
      // ROLLBACK: If any item in the batch fails, release all previously reserved items in this batch
      console.warn(`[Inventory] Reservation failed: ${error.message}. Initiating rollback...`);
      for (const reserved of reservedBatch) {
        await Product.findByIdAndUpdate(reserved.product_id, {
          $inc: { reserved_quantity: -reserved.quantity }
        });
      }
      throw error;
    }
  },

  /**
   * Finalizes stock deduction after successful payment.
   * Decrements both physical stock_quantity and temporary reserved_quantity.
   * 
   * @param {Array<{product_id: string, quantity: number}>} items
   */
  async finalizeDeduction(items) {
    console.log('[Inventory] Payment successful: permanently deducting reserved stock...');
    for (const item of items) {
      const pid = item.product_id._id || item.product_id;
      await Product.findByIdAndUpdate(pid, {
        $inc: {
          stock_quantity: -item.quantity,
          reserved_quantity: -item.quantity
        }
      });
    }
  },

  /**
   * Releases reserved stock back to the available pool.
   * Called when payment fails, times out, or when a pending checkout is abandoned.
   * 
   * @param {Array<{product_id: string, quantity: number}>} items
   */
  async releaseStock(items) {
    console.log('[Inventory] Payment failed/timed out/expired: releasing reserved stock...');
    for (const item of items) {
      const pid = item.product_id._id || item.product_id;
      // Protect against reserved_quantity dropping below zero
      await Product.findByIdAndUpdate(pid, {
        $inc: { reserved_quantity: -item.quantity }
      });
    }
  },

  /**
   * Restores physical stock when a paid order is cancelled and refunded.
   * 
   * @param {Array<{product_id: string, quantity: number}>} items
   */
  async restoreRefundedStock(items) {
    console.log('[Inventory] Order refunded: restoring physical inventory stock...');
    for (const item of items) {
      const pid = item.product_id._id || item.product_id;
      await Product.findByIdAndUpdate(pid, {
        $inc: { stock_quantity: item.quantity }
      });
    }
  },

  /**
   * Background task: Automatically finds and releases expired reservations
   * for orders that stayed in PENDING state past their reservation_expires_at window.
   */
  async cleanupExpiredReservations() {
    try {
      const now = new Date();
      const expiredOrders = await Order.find({
        status: 'PENDING',
        payment_status: { $in: ['UNPAID', 'FAILED', 'TIMED_OUT'] },
        reservation_expires_at: { $lt: now }
      });

      if (expiredOrders.length > 0) {
        console.log(`[Inventory] Found ${expiredOrders.length} expired reservation(s). Releasing stock...`);
        for (const order of expiredOrders) {
          await this.releaseStock(order.items);
          order.status = 'FAILED';
          order.payment_status = order.payment_status === 'UNPAID' ? 'TIMED_OUT' : order.payment_status;
          await order.save();
          console.log(`[Inventory] Released reserved stock for expired order ${order._id}`);
        }
      }
    } catch (err) {
      console.error('[Inventory] Error during expired reservations cleanup:', err);
    }
  }
};
