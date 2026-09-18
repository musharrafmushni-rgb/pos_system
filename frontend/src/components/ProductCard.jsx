import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Star, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import StockBadge from './StockBadge';

export default function ProductCard({ product }) {
  const { addToCart, cartItems } = useCart();

  // Check how many of this item is already in user's cart
  const cartItem = cartItems.find((i) => i.product_id === product._id);
  const qtyInCart = cartItem ? cartItem.quantity : 0;

  const isAvailable = product.available_quantity > 0;
  const canAddMore = product.available_quantity > qtyInCart;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (canAddMore) {
      addToCart(product, 1);
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
      {/* Image Banner */}
      <Link to={`/products/${product._id}`} className="relative block overflow-hidden bg-slate-100 aspect-[4/3]">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-lg text-[11px] font-bold tracking-wide uppercase text-slate-700 shadow-sm">
            {product.category}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md text-amber-400 px-2 py-1 rounded-lg text-xs font-semibold">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-white">{product.rating || 4.8}</span>
          </div>
        </div>
      </Link>

      {/* Content Body */}
      <div className="p-5 flex flex-col flex-1">
        <div className="mb-2">
          <StockBadge
            stockQuantity={product.stock_quantity}
            reservedQuantity={product.reserved_quantity}
          />
        </div>

        <Link to={`/products/${product._id}`} className="group-hover:text-brand-600 transition-colors">
          <h3 className="font-bold text-slate-900 text-base line-clamp-1 leading-snug">
            {product.name}
          </h3>
        </Link>

        <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed flex-1">
          {product.description}
        </p>

        {/* Pricing & Add to Cart Footer */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Price</span>
            <span className="text-lg font-extrabold text-slate-900">
              ${product.price.toFixed(2)}
            </span>
          </div>

          {isAvailable ? (
            <button
              onClick={handleAddToCart}
              disabled={!canAddMore}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                canAddMore
                  ? 'bg-slate-900 text-white hover:bg-brand-600'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              {qtyInCart > 0 ? `In Cart (${qtyInCart})` : 'Add to Cart'}
            </button>
          ) : (
            <span className="text-xs font-semibold text-rose-500 bg-rose-50 px-2.5 py-1.5 rounded-lg">
              Out of Stock
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
