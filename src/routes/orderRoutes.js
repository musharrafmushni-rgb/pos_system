const express = require('express');
const orderController = require('../controllers/orderController');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.post('/checkout', orderController.checkout);
router.post('/:id/payment', validateObjectId(), orderController.pay);
router.post('/:id/cancel', validateObjectId(), orderController.cancel);
router.get('/', orderController.list);
router.get('/:id', validateObjectId(), orderController.get);

module.exports = router;
