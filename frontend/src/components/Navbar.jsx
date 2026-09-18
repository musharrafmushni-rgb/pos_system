import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ShoppingCart, History, Zap } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { totalItemsCount, openCart } = useCart();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              NovaPay<span className="text-brand-600">.</span>
            </span>
            <span className="block text-[10px] text-slate-400 font-medium tracking-wider uppercase -mt-1">
              Checkout & Payment Simulation
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              isActive('/')
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Catalog</span>
          </Link>

          <Link
            to="/orders"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              isActive('/orders')
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Order History & Refunds</span>
          </Link>

          {/* Cart Trigger Button */}
          <button
            onClick={openCart}
            className="relative ml-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow-sm hover:bg-brand-600 transition-all active:scale-95"
            aria-label="View Shopping Cart"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Cart</span>
            {totalItemsCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-brand-500 text-white rounded-full animate-soft-pulse">
                {totalItemsCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
