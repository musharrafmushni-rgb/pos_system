const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [1, 'Product name cannot be empty'],
      maxlength: [200, 'Product name is too long']
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative']
    },
    /**
     * Physical units on hand. This is the source of truth for owned inventory.
     * It is only decremented after a successful payment (or incremented on
     * paid-order cancellation / restock).
     */
    stockCount: {
      type: Number,
      required: [true, 'stockCount is required'],
      min: [0, 'stockCount cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'stockCount must be an integer'
      },
      default: 0
    },
    /**
     * Units currently held by Pending checkouts. Available stock is always
     * stockCount - reservedStock. Never accept this field from API clients.
     */
    reservedStock: {
      type: Number,
      required: true,
      min: [0, 'reservedStock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'reservedStock must be an integer'
      },
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

productSchema.virtual('availableStock').get(function availableStock() {
  return this.stockCount - this.reservedStock;
});

productSchema.index({ name: 1 });

module.exports = mongoose.model('Product', productSchema);
