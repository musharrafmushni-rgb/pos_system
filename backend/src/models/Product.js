import mongoose from 'mongoose';

/**
 * Product Schema
 * 
 * Fields:
 * - name: Name of the product
 * - description: Detailed product description
 * - price: Unit price in USD
 * - category: Product category (e.g., Electronics, Wearables, Audio, Accessories)
 * - stock_quantity: Physical on-hand inventory count
 * - reserved_quantity: Number of units currently reserved during pending checkouts
 * - imageUrl: High-resolution image link
 * 
 * Stock Reservation Mechanism:
 * Available Stock is computed dynamically as:
 *   available_quantity = stock_quantity - reserved_quantity
 * 
 * When a user initiates checkout:
 *   reserved_quantity is incremented (+requested_qty). stock_quantity is NOT yet decremented.
 * When payment succeeds:
 *   both stock_quantity and reserved_quantity are decremented (-requested_qty).
 * When payment fails, times out, or expires:
 *   reserved_quantity is decremented (-requested_qty) back to 0.
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative']
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      index: true
    },
    stock_quantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock quantity cannot be negative'],
      default: 0
    },
    reserved_quantity: {
      type: Number,
      required: true,
      min: [0, 'Reserved quantity cannot be negative'],
      default: 0
    },
    imageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
    },
    rating: {
      type: Number,
      default: 4.5
    },
    ratingCount: {
      type: Number,
      default: 24
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for real-time available stock
productSchema.virtual('available_quantity').get(function () {
  return Math.max(0, this.stock_quantity - this.reserved_quantity);
});

// Check if a specific quantity is available for reservation
productSchema.methods.hasAvailableStock = function (requestedQty) {
  return (this.stock_quantity - this.reserved_quantity) >= requestedQty;
};

const Product = mongoose.model('Product', productSchema);

export default Product;
