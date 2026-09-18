const express = require('express');
const productController = require('../controllers/productController');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.post('/', productController.createProduct);
router.get('/', productController.listProducts);
router.get('/:id/available-stock', validateObjectId(), productController.getAvailableStock);
router.get('/:id', validateObjectId(), productController.getProduct);
router.put('/:id', validateObjectId(), productController.updateProduct);
router.delete('/:id', validateObjectId(), productController.deleteProduct);

module.exports = router;
