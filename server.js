const createApp = require('./src/app');
const env = require('./src/config/env');
const { connectDatabase, disconnectDatabase } = require('./src/config/db');
const { seedIfEmpty } = require('./src/services/seedService');
const {
  startReservationExpiryJob,
  stopReservationExpiryJob
} = require('./src/jobs/reservationExpiryJob');

async function start() {
  await connectDatabase();
  await seedIfEmpty();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[server] POS inventory API listening on port ${env.port}`);
  });

  startReservationExpiryJob();

  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received, shutting down`);
    stopReservationExpiryJob();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
