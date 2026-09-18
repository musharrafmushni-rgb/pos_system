require('dotenv').config();

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toPositiveInt(process.env.PORT, 3000),
  mongoUri:
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/pos_system?replicaSet=rs0',
  useInMemoryMongo: String(process.env.USE_IN_MEMORY_MONGO || '').toLowerCase() === 'true',
  reservationTtlMs: toPositiveInt(process.env.RESERVATION_TTL_MS, 5 * 60 * 1000),
  expiryJobIntervalMs: toPositiveInt(process.env.EXPIRY_JOB_INTERVAL_MS, 10 * 1000)
};

module.exports = env;
