const express = require('express');
const cartController = require('../controllers/cartController');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.get('/:userId', cartController.getCart);
router.post('/:userId/items', cartController.addItem);
router.put('/:userId/items/:productId', validateObjectId('productId'), cartController.updateItem);
router.delete('/:userId/items/:productId', validateObjectId('productId'), cartController.removeItem);
router.delete('/:userId', cartController.clearCart);

module.exports = router;
