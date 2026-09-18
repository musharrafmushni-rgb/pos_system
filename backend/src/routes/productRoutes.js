import express from 'express';
import { productController } from '../controllers/productController.js';

const router = express.Router();

// GET /api/products - List products with search & filter
router.get('/', productController.getProducts);

// GET /api/products/categories - Distinct categories
router.get('/categories', productController.getCategories);

// GET /api/products/:id - Single product detail
router.get('/:id', productController.getProductById);

export default router;
