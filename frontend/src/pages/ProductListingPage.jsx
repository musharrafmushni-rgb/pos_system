import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';
import { ShoppingBag, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

export default function ProductListingPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortOption, setSortOption] = useState('newest');

  // Load Categories once
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.getCategories();
        if (res.success) {
          setCategories(res.categories);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    fetchCategories();
  }, []);

  // Fetch Products with active filters
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getProducts({
        search: searchTerm,
        category: selectedCategory,
        minPrice,
        maxPrice,
        inStock: inStockOnly,
        sort: sortOption
      });
      if (res.success) {
        setProducts(res.products);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch catalog products');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, minPrice, maxPrice, inStockOnly, sortOption]);

  useEffect(() => {
    // Debounce search slightly
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const handlePriceChange = (type, val) => {
    if (type === 'min') setMinPrice(val);
    if (type === 'max') setMaxPrice(val);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setSortOption('newest');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-10 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> High-Performance E-Commerce Simulation
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Checkout & Stock Reservation Engine
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Discover premium gadgets. When you initiate checkout, the system automatically{' '}
            <strong className="text-white">reserves your items</strong>. If the simulated payment succeeds,
            inventory is permanently deducted; if it fails or times out, stock is instantly released!
          </p>
        </div>
      </div>

      {/* Main Grid: Sidebar Filters + Products Listing */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Filter Sidebar (1 col) */}
        <aside className="lg:col-span-1 sticky top-24">
          <FilterSidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onPriceChange={handlePriceChange}
            inStockOnly={inStockOnly}
            onToggleInStock={setInStockOnly}
            onReset={handleResetFilters}
          />
        </aside>

        {/* Products Column (3 cols) */}
        <main className="lg:col-span-3 space-y-6">
          {/* Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">
                {products.length} Products Found
              </span>
              {selectedCategory !== 'All' && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 font-semibold border border-brand-200">
                  {selectedCategory}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="sort-select" className="text-xs font-semibold text-slate-500">Sort By:</label>
              <select
                id="sort-select"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="newest">Featured & Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
              </select>

              <button
                onClick={fetchProducts}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh product list"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Loading Skeletons */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 animate-pulse">
                  <div className="w-full aspect-[4/3] bg-slate-200 rounded-xl" />
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                  <div className="h-8 bg-slate-200 rounded w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <h3 className="font-bold text-rose-800 text-base">Error Loading Catalog</h3>
              <p className="text-xs text-rose-600 max-w-md mx-auto">{error}</p>
              <button
                onClick={fetchProducts}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-base">No Products Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No items match your selected filters. Try clearing your search keyword or adjusting price constraints.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
