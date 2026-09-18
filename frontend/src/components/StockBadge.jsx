import React from 'react';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function StockBadge({ stockQuantity = 0, reservedQuantity = 0, size = 'sm' }) {
  const available = Math.max(0, stockQuantity - reservedQuantity);

  const padding = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';

  if (available === 0 && stockQuantity > 0) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200 ${padding}`}>
        <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
        <span>All Reserved ({reservedQuantity} in checkout)</span>
      </div>
    );
  }

  if (available === 0) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-rose-50 text-rose-700 border border-rose-200 ${padding}`}>
        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
        <span>Out of Stock</span>
      </div>
    );
  }

  if (available <= 3) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-orange-50 text-orange-800 border border-orange-200 ${padding}`}>
        <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
        <span>Low Stock: Only {available} left!</span>
        {reservedQuantity > 0 && (
          <span className="text-orange-600/80 font-normal">({reservedQuantity} reserved)</span>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${padding}`}>
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
      <span>In Stock: {available} available</span>
      {reservedQuantity > 0 && (
        <span className="text-emerald-600/80 font-normal">({reservedQuantity} in checkout)</span>
      )}
    </div>
  );
}
