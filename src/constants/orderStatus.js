/**
 * Canonical order lifecycle states.
 * Keep these values in sync with the Order schema enum.
 */
const ORDER_STATUS = Object.freeze({
  PENDING: 'Pending',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  FAILED: 'Failed'
});

const TERMINAL_STATUSES = Object.freeze([
  ORDER_STATUS.PAID,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.EXPIRED,
  ORDER_STATUS.FAILED
]);

module.exports = {
  ORDER_STATUS,
  TERMINAL_STATUSES
};
