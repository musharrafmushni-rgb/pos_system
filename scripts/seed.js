/**
 * Seed products into the database this process is connected to.
 *
 * For the in-memory Mongo used by `npm start`, restart the API instead —
 * a separate seed process gets its own empty database.
 *
 * Usage: npm run seed
 */
require('dotenv').config();

const { connectDatabase, disconnectDatabase } = require('../src/config/db');
const Product = require('../src/models/Product');
const SAMPLE_PRODUCTS = require('../src/data/sampleProducts');

async function seed() {
  await connectDatabase();
  await Product.deleteMany({});
  const created = await Product.insertMany(
    SAMPLE_PRODUCTS.map((product) => ({ ...product, reservedStock: 0 }))
  );
  console.log(`Seeded ${created.length} products:`);
  created.forEach((p) => {
    console.log(`  ${p.id}  ${p.name}  stock=${p.stockCount}`);
  });
  await disconnectDatabase();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
