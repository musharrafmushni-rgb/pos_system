const Product = require('../models/Product');
const SAMPLE_PRODUCTS = require('../data/sampleProducts');

async function seedIfEmpty() {
  const count = await Product.countDocuments();
  if (count > 0) {
    return { inserted: 0, skipped: true };
  }

  const created = await Product.insertMany(
    SAMPLE_PRODUCTS.map((product) => ({ ...product, reservedStock: 0 }))
  );

  console.log(`[seed] Loaded ${created.length} sample products`);
  return { inserted: created.length, skipped: false };
}

module.exports = { seedIfEmpty };
