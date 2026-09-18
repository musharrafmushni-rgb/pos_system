import express from 'express';
import { orderController } from '../controllers/orderController.js';

const router = express.Router();

// GET /api/orders - Get user order history (with status filter)
router.get('/', orderController.getOrderHistory);

// GET /api/orders/:id - Get single order with payment logs
router.get('/:id', orderController.getOrderById);

// POST /api/orders/:id/cancel - Cancel order and simulate refund
router.post('/:id/cancel', orderController.cancelOrder);

// POST /api/orders/:id/retry - Re-reserve stock & reactivate order for payment retry
router.post('/:id/retry', orderController.retryPayment);

export default router;
