const crypto = require('crypto');

/**
 * Mock payment gateway. Tests pass `success` explicitly.
 * If omitted, the mock fails ~20% of the time to simulate real-world decline.
 */
function processMockPayment({ success } = {}) {
  const resolved =
    typeof success === 'boolean' ? success : Math.random() >= 0.2;

  return {
    success: resolved,
    outcome: resolved ? 'success' : 'failure',
    reference: `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    attemptedAt: new Date()
  };
}

module.exports = {
  processMockPayment
};
