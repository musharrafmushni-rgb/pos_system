import mongoose from 'mongoose';

/**
 * Connect to MongoDB database.
 * Connects to MONGODB_URI (e.g., local MongoDB on 127.0.0.1:27017 or MongoDB Atlas).
 * If external instance fails, falls back gracefully to MongoMemoryServer.
 */
let memoryServer = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecommerce_payment_db';

  try {
    console.log(`[DB] Connecting to MongoDB at: ${uri.replace(/\/\/.*@/, '//***:***@')}...`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[DB] MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.warn(`[DB] Primary MongoDB connection failed: ${err.message}`);
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[DB] Running in production. Check MONGODB_URI & Atlas Network Access (allow 0.0.0.0/0).`);
    }
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      const memUri = memoryServer.getUri();
      const conn = await mongoose.connect(memUri);
      console.log(`[DB] In-Memory MongoDB fallback running at: ${memUri}`);
      return conn;
    } catch (fallbackErr) {
      console.warn(`[DB] MongoMemoryServer fallback not available: ${fallbackErr.message}`);
      return null;
    }
  }
};

export const closeDB = async () => {
  await mongoose.connection.close();
  if (memoryServer) {
    await memoryServer.stop();
  }
};
