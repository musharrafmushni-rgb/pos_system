import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';
import StockBadge from '../components/StockBadge';
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Plus,
  Minus,
  ShoppingCart,
  Zap,
  Info
} from 'lucide-react';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartItems } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getProductById(id);
        if (res.success) {
          setProduct(res.product);
        }
      } catch (err) {
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-square bg-slate-200 rounded-3xl" />
          <div className="space-y-6">
            <div className="h-6 bg-slate-200 rounded w-1/4" />
            <div className="h-10 bg-slate-200 rounded w-3/4" />
            <div className="h-8 bg-slate-200 rounded w-1/3" />
            <div className="h-24 bg-slate-200 rounded" />
            <div className="h-12 bg-slate-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Product Not Found</h2>
        <p className="text-slate-500 text-sm">{error || 'The requested product does not exist.'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>
      </div>
    );
  }

  const available = product.available_quantity;
  const isAvailable = available > 0;

  // Cart item comparison
  const existingInCart = cartItems.find((item) => item.product_id === product._id);
  const qtyInCart = existingInCart ? existingInCart.quantity : 0;
  const maxAddable = Math.max(0, available - qtyInCart);

  const handleAddToCart = () => {
    if (quantity > 0 && quantity <= maxAddable) {
      addToCart(product, quantity);
    }
  };

  const handleInstantCheckout = () => {
    if (quantity > 0 && quantity <= maxAddable) {
      addToCart(product, quantity);
      navigate('/checkout');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Catalog
      </Link>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Gallery / Image */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm overflow-hidden sticky top-24">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover object-center"
            />
            <span className="absolute top-4 left-4 px-3 py-1 bg-white/95 backdrop-blur-md rounded-xl text-xs font-bold uppercase tracking-wider text-slate-800 shadow-sm">
              {product.category}
            </span>
          </div>

          {/* Real-time Inventory Transparency Panel */}
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-brand-600" /> Real-time Warehouse Inventory
              </span>
              <StockBadge
                stockQuantity={product.stock_quantity}
                reservedQuantity={product.reserved_quantity}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block font-medium">Physical Stock</span>
                <span className="font-extrabold text-slate-900 text-sm">{product.stock_quantity}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block font-medium">Reserved in Cart</span>
                <span className="font-extrabold text-amber-600 text-sm">{product.reserved_quantity}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block font-medium">Available to Buy</span>
                <span className="font-extrabold text-emerald-600 text-sm">{available}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal">
              When an order checkout is initiated, stock moves from <em>Available</em> to <em>Reserved</em>.
              If payment is completed, it permanently deducts from <em>Physical Stock</em>.
            </p>
          </div>
        </div>

        {/* Product Details & Actions */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1 text-amber-400 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-slate-800">{product.rating}</span>
                <span className="text-slate-400 font-normal">({product.ratingCount} reviews)</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {product.name}
            </h1>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-black text-slate-900">
                ${product.price.toFixed(2)}
              </span>
              <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                Free Express Delivery
              </span>
            </div>
          </div>

          <div className="prose prose-slate text-slate-600 text-sm leading-relaxed border-t border-b border-slate-200 py-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Product Overview
            </h4>
            <p>{product.description}</p>
          </div>

          {/* Purchasing Form */}
          {isAvailable ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Quantity:
                </span>
                <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 text-sm font-bold text-slate-900 select-none">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(maxAddable, quantity + 1))}
                    disabled={quantity >= maxAddable}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-slate-400">
                  (Max {maxAddable} additional allowed)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleAddToCart}
                  disabled={maxAddable <= 0}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add to Cart</span>
                </button>

                <button
                  onClick={handleInstantCheckout}
                  disabled={maxAddable <= 0}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Instant Checkout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-1">
              <p className="font-bold text-sm">Currently Out of Available Stock</p>
              <p className="text-xs text-rose-600">
                All units are either ordered or currently reserved by active shoppers in checkout. Check back shortly if uncompleted checkouts expire!
              </p>
            </div>
          )}

          {/* Guarantees & Perks */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200 text-slate-600 text-xs">
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Truck className="w-5 h-5 text-brand-600 mb-1" />
              <span className="font-bold text-slate-800">Fast Shipping</span>
              <span className="text-[10px] text-slate-400">2-3 business days</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
              <ShieldCheck className="w-5 h-5 text-brand-600 mb-1" />
              <span className="font-bold text-slate-800">Mock Guarantee</span>
              <span className="text-[10px] text-slate-400">100% Safe Sandbox</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
              <RotateCcw className="w-5 h-5 text-brand-600 mb-1" />
              <span className="font-bold text-slate-800">Simulated Refund</span>
              <span className="text-[10px] text-slate-400">Instant stock return</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
