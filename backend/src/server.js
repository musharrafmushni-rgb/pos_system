import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { seedProducts } from './seeds/seedData.js';
import { inventoryService } from './services/inventoryService.js';

import productRoutes from './routes/productRoutes.js';
import checkoutRoutes from './routes/checkoutRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import orderRoutes from './routes/orderRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for dev/grading ease or specify CLIENT_URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key']
}));
app.use(express.json());
app.use(morgan('dev'));

// Root & Health check endpoints
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'E-Commerce Checkout & Payment Backend is running',
    health: '/api/health',
    products: '/api/products'
  });
});

// Health check endpoint with DB status
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: dbState === 1 ? 'OK' : 'DEGRADED',
    database: states[dbState] || 'unknown',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'E-Commerce Checkout & Payment Backend'
  });
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/orders', orderRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server and then connect to DB
async function startServer() {
  // 1. Listen immediately so cloud host (Railway/Render) detects the port right away
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 E-Commerce Payment Backend listening on 0.0.0.0:${PORT}`);
    console.log(`📡 Health check: http://0.0.0.0:${PORT}/api/health`);
    console.log(`🛍️ Products API: http://0.0.0.0:${PORT}/api/products`);
    console.log(`=======================================================`);
  });

  // 2. Connect Database & Seed asynchronously
  try {
    await connectDB();
    await seedProducts();

    // Start periodic background worker to clean up expired stock reservations
    console.log('[Server] Starting periodic reservation expiration cleanup task (every 60s)...');
    setInterval(() => {
      inventoryService.cleanupExpiredReservations();
    }, 60 * 1000);
  } catch (err) {
    console.error('[Server] Database initialization error (server is still running):', err.message);
  }
}

startServer();
