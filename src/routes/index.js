const express = require('express');
const productRoutes = require('./productRoutes');
const cartRoutes = require('./cartRoutes');
const orderRoutes = require('./orderRoutes');

const router = express.Router();

router.use('/products', productRoutes);
router.use('/carts', cartRoutes);
router.use('/orders', orderRoutes);

router.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'POS Order & Inventory API',
    endpoints: {
      products: {
        list: 'GET /api/products',
        create: 'POST /api/products',
        get: 'GET /api/products/:id',
        update: 'PUT /api/products/:id',
        delete: 'DELETE /api/products/:id',
        availableStock: 'GET /api/products/:id/available-stock'
      },
      carts: {
        get: 'GET /api/carts/:userId',
        addItem: 'POST /api/carts/:userId/items',
        updateItem: 'PUT /api/carts/:userId/items/:productId',
        removeItem: 'DELETE /api/carts/:userId/items/:productId',
        clear: 'DELETE /api/carts/:userId'
      },
      orders: {
        checkout: 'POST /api/orders/checkout',
        pay: 'POST /api/orders/:id/payment',
        cancel: 'POST /api/orders/:id/cancel',
        list: 'GET /api/orders',
        get: 'GET /api/orders/:id'
      }
    }
  });
});

module.exports = router;
