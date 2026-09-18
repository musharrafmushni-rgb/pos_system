import Product from '../models/Product.js';
import Order from '../models/Order.js';
import PaymentLog from '../models/PaymentLog.js';

export const sampleProducts = [
  {
    name: 'Sony WH-1000XM5 Wireless Headphones',
    description: 'Industry-leading noise canceling headphones with dual processors and 8 microphones for exceptional call quality and immersion.',
    price: 399.99,
    category: 'Audio',
    stock_quantity: 8,
    reserved_quantity: 0,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    rating: 4.8,
    ratingCount: 142
  },
  {
    name: 'Apple Watch Ultra 2 GPS + Cellular',
    description: 'The most rugged and capable Apple Watch. 49mm titanium case, precision dual-frequency GPS, and up to 36 hours of battery life.',
    price: 799.00,
    category: 'Wearables',
    stock_quantity: 5,
    reserved_quantity: 0,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    ratingCount: 88
  },
  {
    name: 'Logitech MX Master 3S Wireless Mouse',
    description: 'Performance wireless ergonomic mouse with Quiet Clicks, 8K DPI tracking on glass, and MagSpeed electromagnetic scrolling.',
    price: 99.99,
    category: 'Accessories',
    stock_quantity: 15,
    reserved_quantity: 0,
    imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80',
    rating: 4.7,
    ratingCount: 310
  },
  {
    name: 'Keychron Q1 Pro Custom Mechanical Keyboard',
    description: 'Full aluminum CNC machined body, hot-swappable switches, wireless Bluetooth 5.1 & Type-C wired, with south-facing RGB.',
    price: 199.00,
    category: 'Accessories',
    stock_quantity: 4,
    reserved_quantity: 0,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
    rating: 4.8,
    ratingCount: 64
  },
  {
    name: 'Fujifilm X-T5 Mirrorless Camera Body',
    description: '40.2MP non-stacked X-Trans 5 HR sensor, 5-axis in-body image stabilization up to 7.0 stops, and classic dial-based operation.',
    price: 1699.00,
    category: 'Electronics',
    stock_quantity: 3,
    reserved_quantity: 0,
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    ratingCount: 52
  },
  {
    name: 'Bose SoundLink Revolve+ II Bluetooth Speaker',
    description: 'Deep, loud and immersive 360-degree sound. Durable, water- and dust-resistant design (IP55) with up to 17 hours per charge.',
    price: 329.00,
    category: 'Audio',
    stock_quantity: 10,
    reserved_quantity: 0,
    imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80',
    rating: 4.6,
    ratingCount: 95
  },
  {
    name: 'iPad Air 11-inch M2 Chip 256GB',
    description: 'Supercharged by the Apple M2 chip. Stunning Liquid Retina display, landscape 12MP front camera, and ultra-fast Wi-Fi 6E.',
    price: 699.00,
    category: 'Electronics',
    stock_quantity: 6,
    reserved_quantity: 0,
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80',
    rating: 4.8,
    ratingCount: 118
  },
  {
    name: 'Anker Prime 20,000mAh Power Bank (200W)',
    description: 'Multi-device fast charging with two USB-C ports and one USB-A port. Smart digital display shows real-time output and remaining battery.',
    price: 129.99,
    category: 'Accessories',
    stock_quantity: 2, // Low stock test item!
    reserved_quantity: 0,
    imageUrl: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&auto=format&fit=crop&q=80',
    rating: 4.7,
    ratingCount: 42
  }
];

export async function seedProducts() {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log('[Seed] Database empty. Seeding initial product catalog...');
      await Product.insertMany(sampleProducts);
      console.log(`[Seed] Successfully seeded ${sampleProducts.length} products.`);
    } else {
      console.log(`[Seed] Products already exist in database (${count} items). Skipping initial seed.`);
    }
  } catch (error) {
    console.error('[Seed] Error during product seeding:', error);
  }
}
