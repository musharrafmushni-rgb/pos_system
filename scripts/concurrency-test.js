/**
 * Concurrency proof: two users checkout the last unit at the same time.
 *
 * Setup:
 *   1. Start MongoDB replica set (docker compose up -d)
 *   2. Start the API (npm run dev)
 *   3. node scripts/concurrency-test.js
 *
 * Expected:
 *   - Product stockCount starts at 1
 *   - Exactly one checkout returns 201 with status Pending
 *   - The other returns 409 Insufficient available stock
 *   - reservedStock === 1, availableStock === 0
 */
const BASE_URL = process.env.API_URL || 'http://127.0.0.1:3000';

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function main() {
  console.log(`Target: ${BASE_URL}`);

  const health = await request('GET', '/health');
  if (health.status !== 200) {
    throw new Error('API is not running. Start it with npm run dev');
  }

  const productRes = await request('POST', '/api/products', {
    name: `Concurrency SKU ${Date.now()}`,
    price: 9.99,
    stockCount: 1
  });
  if (productRes.status !== 201) {
    throw new Error(`Failed to create product: ${JSON.stringify(productRes.json)}`);
  }

  const productId = productRes.json.data._id;
  console.log(`Created product ${productId} with stockCount=1`);

  const users = ['user-A', 'user-B'];
  for (const userId of users) {
    const add = await request('POST', `/api/carts/${userId}/items`, {
      productId,
      quantity: 1
    });
    if (add.status !== 201) {
      throw new Error(`Failed to add to ${userId} cart: ${JSON.stringify(add.json)}`);
    }
  }

  console.log('Firing two checkout requests in parallel...');
  const [first, second] = await Promise.all(
    users.map((userId) => request('POST', '/api/orders/checkout', { userId }))
  );

  const results = [
    { userId: users[0], ...first },
    { userId: users[1], ...second }
  ];

  results.forEach((result) => {
    const orderStatus = result.json.data && result.json.data.status;
    console.log(
      `  ${result.userId}: HTTP ${result.status}  ${result.json.message || orderStatus || ''}`
    );
  });

  const successes = results.filter((r) => r.status === 201);
  const conflicts = results.filter((r) => r.status === 409);

  const stock = await request('GET', `/api/products/${productId}/available-stock`);
  console.log('Available stock after race:', stock.json.data);

  if (successes.length !== 1 || conflicts.length !== 1) {
    throw new Error(
      `Expected exactly 1 success and 1 conflict, got successes=${successes.length} conflicts=${conflicts.length}`
    );
  }

  if (stock.json.data.reservedStock !== 1 || stock.json.data.availableStock !== 0) {
    throw new Error('Inventory invariant violated after concurrent checkout');
  }

  const winner = successes[0].json.data;
  console.log(`Winner order ${winner._id} is ${winner.status}. Completing mock payment...`);

  const paid = await request('POST', `/api/orders/${winner._id}/payment`, {
    success: true
  });
  if (paid.status !== 200 || paid.json.data.status !== 'Paid') {
    throw new Error(`Expected Paid, got ${JSON.stringify(paid.json)}`);
  }

  const afterPay = await request('GET', `/api/products/${productId}/available-stock`);
  console.log('Available stock after payment:', afterPay.json.data);

  if (
    afterPay.json.data.stockCount !== 0 ||
    afterPay.json.data.reservedStock !== 0 ||
    afterPay.json.data.availableStock !== 0
  ) {
    throw new Error('Stock was not permanently deducted after payment');
  }

  console.log('\nPASS: only one buyer got the last unit; payment committed stock atomically.');
}

main().catch((err) => {
  console.error('\nFAIL:', err.message);
  process.exit(1);
});
