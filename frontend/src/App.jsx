import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import GatewaySimulatorBar from './components/GatewaySimulatorBar';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';

import ProductListingPage from './pages/ProductListingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import OrderHistoryPage from './pages/OrderHistoryPage';

export default function App() {
  return (
    <Router>
      <CartProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-brand-500 selection:text-white">
          {/* Top Mock Payment Gateway Test Controller */}
          <GatewaySimulatorBar />

          {/* Sticky Navigation Bar */}
          <Navbar />

          {/* Global Cart Slideover Drawer */}
          <CartDrawer />

          {/* Main Application Routes */}
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<ProductListingPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-confirmation/:id" element={<OrderConfirmationPage />} />
              <Route path="/orders" element={<OrderHistoryPage />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 mt-20 py-8 text-slate-500 text-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm tracking-tight">NovaPay.</span>
                <span>• E-Commerce Checkout &amp; Stock Reservation Demonstration</span>
              </div>
              <div className="flex items-center gap-4 text-slate-400">
                <span>Node.js + Express</span>
                <span>MongoDB + Mongoose</span>
                <span>React + Tailwind CSS</span>
              </div>
            </div>
          </footer>
        </div>
      </CartProvider>
    </Router>
  );
}
