import express from 'express';
import { paymentController } from '../controllers/paymentController.js';

const router = express.Router();

// POST /api/payment/process - Mock payment gateway endpoint with duplicate prevention
router.post('/process', paymentController.processPayment);

// GET /api/payment/logs/:orderId - Audit logs for an order
router.get('/logs/:orderId', paymentController.getPaymentLogs);

export default router;
