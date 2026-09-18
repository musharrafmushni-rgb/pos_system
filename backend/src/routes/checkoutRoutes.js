import express from 'express';
import { checkoutController } from '../controllers/checkoutController.js';

const router = express.Router();

// POST /api/checkout/initiate - Reserve stock and initiate order
router.post('/initiate', checkoutController.initiateCheckout);

// POST /api/checkout/:orderId/release - Release reservation if cancelled in modal
router.post('/:orderId/release', checkoutController.releaseCheckout);

export default router;
