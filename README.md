<<<<<<< HEAD
# POS Order & Inventory System

Express.js + MongoDB service that sells products without overselling. Checkout **reserves** stock for 5 minutes; payment either **commits** that reservation or **releases** it. A background job expires reservations that are never paid.

MongoDB transactions require a replica set (local Docker Compose or Atlas). Atomic `$expr` + `$inc` updates are what actually prevent two buyers from taking the last unit.

---

## Folder structure

```text
pos_system/
├── server.js                         # Process entry: DB, HTTP, expiry job, shutdown
├── docker-compose.yml                # MongoDB 7 single-node replica set (rs0)
├── package.json
├── .env.example
├── scripts/
│   ├── seed.js                       # Sample products
│   └── concurrency-test.js           # Parallel checkout of the last unit
└── src/
    ├── app.js                        # Express app (middleware + routes)
    ├── config/
    │   ├── env.js                    # Typed environment
    │   └── db.js                     # Mongoose connection
    ├── constants/orderStatus.js      # Pending | Paid | Cancelled | Expired | Failed
    ├── models/
    │   ├── Product.js                # name, price, stockCount, reservedStock
    │   ├── Cart.js                   # Per-user basket (does not reserve stock)
    │   └── Order.js                  # Lifecycle + reservationExpiresAt
    ├── services/
    │   ├── inventoryService.js       # Atomic reserve / release / commit / restock
    │   ├── cartService.js
    │   ├── paymentService.js         # Mock gateway
    │   └── orderService.js           # Checkout, pay, cancel, expire
    ├── controllers/                  # HTTP adapters
    ├── routes/                       # /api/products, /api/carts, /api/orders
    ├── jobs/reservationExpiryJob.js  # Interval sweep of expired Pending orders
    ├── middleware/
    └── utils/
```

---

## How inventory stays correct

`availableStock = stockCount - reservedStock` (virtual, never stored).

| Event | stockCount | reservedStock |
| --- | --- | --- |
| Checkout (Pending) | unchanged | `$inc` +qty if `$expr` says enough available |
| Payment success | `$inc` -qty | `$inc` -qty |
| Payment fail / cancel Pending / expire | unchanged | `$inc` -qty |
| Cancel Paid | `$inc` +qty | unchanged |

The reserve write is a **single** `findOneAndUpdate`:

```js
{ $expr: { $gte: [{ $subtract: ['$stockCount', '$reservedStock'] }, quantity] } }
{ $inc: { reservedStock: quantity } }
```

There is no read-then-write window. Multi-item checkout, payment, cancel, and expiry all run inside `session.withTransaction`, so a mid-flight failure cannot leave a partial reservation.

---

## Run locally

### 1. Prerequisites

- Node.js 18+
- Docker Desktop (for the replica set)

### 2. Start MongoDB

```bash
docker compose up -d
```

Wait until the container is healthy (replica set `rs0` is initiated on `127.0.0.1:27017`). If initiate did not run, execute once:

```bash
docker exec -it pos-mongodb mongosh --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] })"
```

### 3. Install and configure

```bash
npm install
copy .env.example .env
```

On macOS/Linux use `cp .env.example .env`. Defaults already match Docker Compose.

To use MongoDB Atlas instead, set `MONGODB_URI` to your SRV connection string (Atlas replica sets support transactions).

### 4. Start the API

```bash
npm run dev
```

Health check: `GET http://127.0.0.1:3000/health`

Optional catalog:

```bash
npm run seed
```

---

## API

Base path: `/api`

### Products

| Method | Path | Body / notes |
| --- | --- | --- |
| POST | `/products` | `{ "name", "price", "stockCount" }` |
| GET | `/products` | Includes virtual `availableStock` |
| GET | `/products/:id` | |
| PUT | `/products/:id` | Name / price / stockCount. Cannot set `stockCount` below `reservedStock`. |
| DELETE | `/products/:id` | Rejected while `reservedStock > 0` |
| GET | `/products/:id/available-stock` | `{ stockCount, reservedStock, availableStock }` |

### Cart (no reservation yet)

| Method | Path | Body |
| --- | --- | --- |
| GET | `/carts/:userId` | |
| POST | `/carts/:userId/items` | `{ "productId", "quantity" }` |
| PUT | `/carts/:userId/items/:productId` | `{ "quantity" }` (`0` removes) |
| DELETE | `/carts/:userId/items/:productId` | |
| DELETE | `/carts/:userId` | Empty the cart |

### Checkout, payment, cancel

| Method | Path | Body |
| --- | --- | --- |
| POST | `/orders/checkout` | `{ "userId" }` — reserves stock, order `Pending`, TTL 5 minutes |
| POST | `/orders/:id/payment` | `{ "success": true \| false }` — omit `success` for ~80% mock success |
| POST | `/orders/:id/cancel` | Pending releases reservation; Paid restocks `stockCount` |
| GET | `/orders` | Query `userId`, `status` |
| GET | `/orders/:id` | |

Order statuses: `Pending`, `Paid`, `Cancelled`, `Expired`, `Failed`.

---

## Manual happy path

```bash
# 1. Create a product
curl -X POST http://127.0.0.1:3000/api/products -H "Content-Type: application/json" -d "{\"name\":\"Limited Mug\",\"price\":18,\"stockCount\":1}"

# 2. Add to cart (replace PRODUCT_ID)
curl -X POST http://127.0.0.1:3000/api/carts/alice/items -H "Content-Type: application/json" -d "{\"productId\":\"PRODUCT_ID\",\"quantity\":1}"

# 3. Checkout — stock is reserved, not deducted
curl -X POST http://127.0.0.1:3000/api/orders/checkout -H "Content-Type: application/json" -d "{\"userId\":\"alice\"}"

# 4. Inspect available stock (should be 0 reserved 1)
curl http://127.0.0.1:3000/api/products/PRODUCT_ID/available-stock

# 5a. Pay successfully — stockCount becomes 0
curl -X POST http://127.0.0.1:3000/api/orders/ORDER_ID/payment -H "Content-Type: application/json" -d "{\"success\":true}"

# 5b. Or fail payment — reservedStock returns to 0, stockCount stays 1
curl -X POST http://127.0.0.1:3000/api/orders/ORDER_ID/payment -H "Content-Type: application/json" -d "{\"success\":false}"

# 5c. Or cancel a Pending order (same inventory effect as a failed payment)
curl -X POST http://127.0.0.1:3000/api/orders/ORDER_ID/cancel
```

---

## Test concurrency (oversell protection)

The script creates a product with `stockCount: 1`, puts that unit in two users' carts, and fires **both checkouts at the same time**.

```bash
npm run dev
npm run test:concurrency
```

Expected:

- HTTP 201 for exactly one user (`Pending`, `reservedStock = 1`)
- HTTP 409 for the other (`Insufficient available stock`)
- Mock payment on the winner sets `stockCount = 0` and `reservedStock = 0`

You can reproduce it by hand with two terminals after both carts are loaded:

```bash
curl -X POST http://127.0.0.1:3000/api/orders/checkout -H "Content-Type: application/json" -d "{\"userId\":\"user-A\"}"
curl -X POST http://127.0.0.1:3000/api/orders/checkout -H "Content-Type: application/json" -d "{\"userId\":\"user-B\"}"
```

Run those two curls simultaneously (two terminals, or a tool like GNU `parallel`).

---

## Test the 5-minute reservation timeout

1. Set `RESERVATION_TTL_MS=15000` and `EXPIRY_JOB_INTERVAL_MS=5000` in `.env`.
2. Restart the API, checkout an order, **do not pay**.
3. Watch the server log: `[expiry-job] Released reservation for order ...`
4. `GET /api/products/:id/available-stock` — `reservedStock` is 0 again.
5. `GET /api/orders/:id` — status `Expired`.
6. Payment against that order returns 409.

The job also uses `findOneAndUpdate` on `status: Pending`, so a payment that lands at the same moment as expiry cannot both succeed.

---

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/pos_system?replicaSet=rs0` | Must be a replica set |
| `RESERVATION_TTL_MS` | `300000` | Pending reservation lifetime (5 minutes) |
| `EXPIRY_JOB_INTERVAL_MS` | `10000` | How often the sweeper runs |
| `NODE_ENV` | `development` | `morgan` format / error verbosity |
=======
# techloom
>>>>>>> 8fe1ab10b231a690512b820f8d2e58edeadb6b9e
