import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartDrawer() {
  const { isCartOpen, closeCart, cartItems, updateQuantity, removeFromCart, subtotal, totalItemsCount } = useCart();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const handleProceedToCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-600" />
              <h2 className="text-base font-extrabold text-slate-900">Your Cart</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700">
                {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
              </span>
            </div>
            <button
              onClick={closeCart}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <ShoppingBag className="w-16 h-16 text-slate-200 mb-3 stroke-1" />
                <p className="font-bold text-slate-700 text-base">Your cart is empty</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Browse our catalog and add products to test stock reservation and payment flows.
                </p>
                <button
                  onClick={closeCart}
                  className="mt-5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-colors"
                >
                  Explore Catalog
                </button>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.product_id}
                  className="flex gap-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl items-center"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-xl bg-white border border-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-xs truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs font-extrabold text-brand-600 mt-0.5">
                      ${item.price.toFixed(2)}
                    </p>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="p-1 hover:bg-slate-100 text-slate-500 rounded-l-lg transition-colors"
                          title="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-slate-800 select-none">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="p-1 hover:bg-slate-100 text-slate-500 rounded-r-lg transition-colors"
                          title="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors ml-auto"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer */}
          {cartItems.length > 0 && (
            <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Simulated Shipping</span>
                  <span className="font-semibold text-emerald-600">FREE</span>
                </div>
                <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span className="text-brand-600 font-black">${subtotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-brand-50 border border-brand-100 rounded-xl text-[11px] text-brand-900">
                <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Stock is temporarily reserved when you proceed to checkout.</span>
              </div>

              <button
                onClick={handleProceedToCheckout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md transition-all active:scale-98 text-sm"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
