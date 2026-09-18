import React from 'react';
import { Search, RotateCcw, Check, DollarSign, Filter } from 'lucide-react';

export default function FilterSidebar({
  categories = [],
  selectedCategory,
  onSelectCategory,
  searchTerm,
  onSearchChange,
  minPrice,
  maxPrice,
  onPriceChange,
  inStockOnly,
  onToggleInStock,
  onReset
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-600" />
          Filters & Search
        </h2>
        <button
          onClick={onReset}
          className="text-xs font-semibold text-slate-400 hover:text-brand-600 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* Search Input */}
      <div>
        <label htmlFor="filter-search-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Search Products
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="filter-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or keyword..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Category
        </label>
        <div className="space-y-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                selectedCategory === cat
                  ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>{cat}</span>
              {selectedCategory === cat && <Check className="w-3.5 h-3.5 text-brand-600" />}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Price Range ($)
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              min="0"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => onPriceChange('min', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <span className="text-slate-400 text-xs font-bold">-</span>
          <div className="relative flex-1">
            <input
              type="number"
              min="0"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => onPriceChange('max', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Availability Filter */}
      <div className="pt-2 border-t border-slate-100">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => onToggleInStock(e.target.checked)}
            className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 transition-all cursor-pointer"
          />
          <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 select-none">
            In Stock Only (Available &gt; 0)
          </span>
        </label>
      </div>
    </div>
  );
}
