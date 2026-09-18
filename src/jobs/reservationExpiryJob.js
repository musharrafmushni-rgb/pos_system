const Order = require('../models/Order');
const { ORDER_STATUS } = require('../constants/orderStatus');
const env = require('../config/env');
const { expireOrderIfPending } = require('../services/orderService');

let timer = null;

async function sweepExpiredReservations() {
  const due = await Order.find({
    status: ORDER_STATUS.PENDING,
    reservationExpiresAt: { $lte: new Date() }
  })
    .select('_id')
    .lean();

  if (!due.length) {
    return { expired: 0 };
  }

  let expired = 0;
  for (const doc of due) {
    try {
      const result = await expireOrderIfPending(doc._id);
      if (result) {
        expired += 1;
        console.log(`[expiry-job] Released reservation for order ${doc._id}`);
      }
    } catch (err) {
      console.error(`[expiry-job] Failed to expire order ${doc._id}:`, err.message);
    }
  }

  return { expired };
}

function startReservationExpiryJob() {
  if (timer) {
    return timer;
  }

  console.log(
    `[expiry-job] Scanning every ${env.expiryJobIntervalMs}ms for reservations older than ${env.reservationTtlMs}ms`
  );

  timer = setInterval(() => {
    sweepExpiredReservations().catch((err) => {
      console.error('[expiry-job] Sweep failed:', err);
    });
  }, env.expiryJobIntervalMs);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return timer;
}

function stopReservationExpiryJob() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  startReservationExpiryJob,
  stopReservationExpiryJob,
  sweepExpiredReservations
};
