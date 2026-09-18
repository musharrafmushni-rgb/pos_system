const state = {
  products: [],
  cart: { items: [] },
  orders: [],
  view: 'register',
  editingId: null,
  search: '',
  cardQty: {}
};

const $ = (id) => document.getElementById(id);

function money(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function filteredProducts() {
  const query = (state.search || '').trim().toLowerCase();
  if (!query) return state.products;
  return state.products.filter((product) =>
    String(product.name || '').toLowerCase().includes(query)
  );
}

function cardQty(productId) {
  const value = Number.parseInt(state.cardQty[productId], 10);
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function clampQty(product, qty) {
  const max = Math.max(Number(product && product.availableStock) || 0, 0);
  if (max < 1) return 1;
  return Math.min(Math.max(qty, 1), max);
}

function userId() {
  return ($('user-id').value || 'alice').trim();
}

function toast(message, kind = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = message;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

async function withError(fn) {
  try {
    return await fn();
  } catch (err) {
    toast(err.message || 'Request failed', 'bad');
    throw err;
  }
}

function setView(name) {
  state.view = name;
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('is-visible', view.id === `view-${name}`);
  });
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.view === name);
  });
  const titles = { register: 'Register', inventory: 'Inventory', orders: 'Orders' };
  $('view-title').textContent = titles[name];
  if (name === 'orders') loadOrders();
  if (name === 'inventory' || name === 'register') loadProducts();
}

function renderProducts() {
  const grid = $('product-grid');
  const products = filteredProducts();
  if (!state.products.length) {
    grid.innerHTML = '<p class="empty">No products yet. Add some in Inventory.</p>';
    return;
  }
  if (!products.length) {
    grid.innerHTML = '<p class="empty">No products match that search.</p>';
    return;
  }
  grid.innerHTML = products
    .map((product) => {
      const qty = clampQty(product, cardQty(product._id));
      state.cardQty[product._id] = qty;
      const soldOut = product.availableStock < 1;
      return `
      <article class="card">
        <h3>${escapeHtml(product.name)}</h3>
        <div class="price">${money(product.price)}</div>
        <div class="stock">Available ${product.availableStock} · Reserved ${product.reservedStock}</div>
        <div class="card-actions">
          <div class="card-qty">
            <button data-card-qty="${product._id}" data-delta="-1" type="button" ${soldOut ? 'disabled' : ''}>−</button>
            <input data-card-qty-input="${product._id}" type="number" min="1" max="${Math.max(product.availableStock, 1)}" value="${qty}" ${soldOut ? 'disabled' : ''} />
            <button data-card-qty="${product._id}" data-delta="1" type="button" ${soldOut ? 'disabled' : ''}>+</button>
          </div>
          <button class="btn primary add-btn" data-add="${product._id}" ${soldOut ? 'disabled' : ''} type="button">Add</button>
        </div>
      </article>`;
    })
    .join('');
}

function renderInventory() {
  $('inventory-body').innerHTML = state.products
    .map(
      (product) => `
      <tr>
        <td>${escapeHtml(product.name)}</td>
        <td>${money(product.price)}</td>
        <td>${product.stockCount}</td>
        <td>${product.reservedStock}</td>
        <td>${product.availableStock}</td>
        <td>
          <button class="btn tiny ghost" data-available="${product._id}" type="button">Stock</button>
          <button class="btn tiny ghost" data-edit="${product._id}" type="button">Edit</button>
          <button class="btn tiny bad" data-delete="${product._id}" type="button">Delete</button>
        </td>
      </tr>`
    )
    .join('');
}

function renderCart() {
  const items = state.cart.items || [];
  const list = $('cart-items');
  if (!items.length) {
    list.innerHTML = '<li class="empty">Ticket is empty</li>';
    $('cart-total').textContent = money(0);
    return;
  }
  list.innerHTML = items
    .map((item) => {
      const line = (item.price || 0) * item.quantity;
      return `
        <li>
          <div>
            <strong>${escapeHtml(item.name || 'Item')}</strong>
            <div class="stock">${money(item.price)} each</div>
          </div>
          <div>
            <div class="qty">
              <button data-qty="${item.productId}" data-delta="-1" type="button">−</button>
              <span>${item.quantity}</span>
              <button data-qty="${item.productId}" data-delta="1" type="button">+</button>
              <button class="btn tiny bad" data-remove="${item.productId}" type="button">x</button>
            </div>
            <div>${money(line)}</div>
          </div>
        </li>`;
    })
    .join('');
  const total = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  $('cart-total').textContent = money(total);
}

function remainingLabel(iso) {
  if (!iso) return '—';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

function renderOrders() {
  $('orders-body').innerHTML = (state.orders || [])
    .map((order) => {
      const pending = order.status === 'Pending';
      return `
        <tr>
          <td>${order._id.slice(-8)}</td>
          <td>${escapeHtml(order.userId)}</td>
          <td><span class="badge ${order.status}">${order.status}</span></td>
          <td>${money(order.totalAmount)}</td>
          <td>${pending ? remainingLabel(order.reservationExpiresAt) : '—'}</td>
          <td>
            <button class="btn tiny ghost" data-open-order="${order._id}" type="button">Open</button>
            ${
              pending
                ? `<button class="btn tiny ok" data-pay="${order._id}" type="button">Pay</button>
                   <button class="btn tiny bad" data-fail="${order._id}" type="button">Decline</button>
                   <button class="btn tiny ghost" data-cancel="${order._id}" type="button">Cancel</button>`
                : order.status === 'Paid'
                  ? `<button class="btn tiny ghost" data-cancel="${order._id}" type="button">Refund / cancel</button>`
                  : ''
            }
          </td>
        </tr>`;
    })
    .join('');
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function loadProducts() {
  const res = await withError(() => api.products.list());
  state.products = res.data || [];
  renderProducts();
  renderInventory();
}

async function loadCart() {
  const res = await withError(() => api.carts.get(userId()));
  state.cart = res.data || { items: [] };
  renderCart();
}

async function loadOrders() {
  const query = {};
  const status = $('order-status').value;
  if (status) query.status = status;
  if ($('orders-mine').checked) query.userId = userId();
  const res = await withError(() => api.orders.list(query));
  state.orders = res.data || [];
  renderOrders();
}

async function ping() {
  try {
    await api.health();
    $('api-dot').className = 'status-dot ok';
    $('api-status').textContent = 'API connected';
  } catch (err) {
    $('api-dot').className = 'status-dot bad';
    $('api-status').textContent = 'API offline';
  }
}

function closeModal() {
  $('modal').hidden = true;
}

function openOrderModal(order, message) {
  $('modal-title').textContent = `Order ${order.status}`;
  const items = (order.items || [])
    .map(
      (item) =>
        `<div class="line"><span>${escapeHtml(item.name)} × ${item.quantity}</span><span>${money(
          item.price * item.quantity
        )}</span></div>`
    )
    .join('');
  $('modal-body').innerHTML = `
    ${message ? `<p>${escapeHtml(message)}</p>` : ''}
    <div class="line"><span>User</span><span>${escapeHtml(order.userId)}</span></div>
    <div class="line"><span>Status</span><span>${order.status}</span></div>
    <div class="line"><span>Total</span><span>${money(order.totalAmount)}</span></div>
    <div class="line"><span>Reservation</span><span>${
      order.reservationExpiresAt ? remainingLabel(order.reservationExpiresAt) : '—'
    }</span></div>
    ${items}
  `;
  const actions = [];
  if (order.status === 'Pending') {
    actions.push(`<button class="btn ok" data-pay="${order._id}" type="button">Mock pay success</button>`);
    actions.push(`<button class="btn bad" data-fail="${order._id}" type="button">Mock pay fail</button>`);
    actions.push(`<button class="btn ghost" data-cancel="${order._id}" type="button">Cancel order</button>`);
  } else if (order.status === 'Paid') {
    actions.push(`<button class="btn ghost" data-cancel="${order._id}" type="button">Cancel paid order</button>`);
  }
  actions.push('<button class="btn ghost" id="modal-close" type="button">Close</button>');
  $('modal-actions').innerHTML = actions.join('');
  $('modal').hidden = false;
}

async function payOrder(id, success) {
  const res = await withError(() => api.orders.pay(id, success));
  toast(res.message || 'Payment updated');
  closeModal();
  await Promise.all([loadProducts(), loadCart(), loadOrders()]);
  openOrderModal(res.data, res.message);
}

async function cancelOrder(id) {
  const res = await withError(() => api.orders.cancel(id));
  toast(res.message || 'Order cancelled');
  closeModal();
  await Promise.all([loadProducts(), loadCart(), loadOrders()]);
}

function fillProductForm(product) {
  state.editingId = product ? product._id : null;
  $('product-form-title').textContent = product ? 'Edit product' : 'New product';
  $('product-id').value = product ? product._id : '';
  $('product-name').value = product ? product.name : '';
  $('product-price').value = product ? product.price : '';
  $('product-stock').value = product ? product.stockCount : '';
}

document.querySelector('.nav').addEventListener('click', (event) => {
  const btn = event.target.closest('[data-view]');
  if (btn) setView(btn.dataset.view);
});

$('product-search').addEventListener('input', (event) => {
  state.search = event.target.value;
  renderProducts();
});

$('product-grid').addEventListener('click', async (event) => {
  const qtyBtn = event.target.closest('[data-card-qty]');
  if (qtyBtn) {
    const id = qtyBtn.dataset.cardQty;
    const product = state.products.find((row) => row._id === id);
    if (!product) return;
    const next = clampQty(product, cardQty(id) + Number(qtyBtn.dataset.delta));
    state.cardQty[id] = next;
    const input = qtyBtn.parentElement.querySelector('[data-card-qty-input]');
    if (input) input.value = next;
    return;
  }

  const addBtn = event.target.closest('[data-add]');
  if (!addBtn || addBtn.disabled) return;
  const id = addBtn.dataset.add;
  const product = state.products.find((row) => row._id === id);
  const qty = clampQty(product, cardQty(id));
  await withError(() => api.carts.add(userId(), id, qty));
  toast(`Added ${qty} to ticket`);
  state.cardQty[id] = 1;
  await Promise.all([loadCart(), loadProducts()]);
});

$('product-grid').addEventListener('change', (event) => {
  const input = event.target.closest('[data-card-qty-input]');
  if (!input) return;
  const id = input.dataset.cardQtyInput;
  const product = state.products.find((row) => row._id === id);
  const parsed = Number.parseInt(input.value, 10);
  const next = clampQty(product, Number.isInteger(parsed) ? parsed : 1);
  state.cardQty[id] = next;
  input.value = next;
});

$('cart-items').addEventListener('click', async (event) => {
  const removeId = event.target.dataset.remove;
  const qtyId = event.target.dataset.qty;
  if (removeId) {
    await withError(() => api.carts.remove(userId(), removeId));
    await loadCart();
    return;
  }
  if (qtyId) {
    const item = state.cart.items.find((row) => row.productId === qtyId);
    const next = (item ? item.quantity : 1) + Number(event.target.dataset.delta);
    await withError(() => api.carts.update(userId(), qtyId, Math.max(next, 0)));
    await Promise.all([loadCart(), loadProducts()]);
  }
});

$('clear-cart').addEventListener('click', async () => {
  await withError(() => api.carts.clear(userId()));
  await loadCart();
});

$('checkout-btn').addEventListener('click', async () => {
  const res = await withError(() => api.orders.checkout(userId()));
  toast(res.message || 'Stock reserved');
  await Promise.all([loadCart(), loadProducts(), loadOrders()]);
  openOrderModal(res.data, res.message);
});

$('product-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    name: $('product-name').value,
    price: Number($('product-price').value),
    stockCount: Number($('product-stock').value)
  };
  if (state.editingId) {
    await withError(() => api.products.update(state.editingId, payload));
    toast('Product updated');
  } else {
    await withError(() => api.products.create(payload));
    toast('Product created');
  }
  fillProductForm(null);
  await loadProducts();
});

$('product-cancel').addEventListener('click', () => fillProductForm(null));

$('inventory-body').addEventListener('click', async (event) => {
  const { edit, delete: del, available } = event.target.dataset;
  if (edit) {
    const product = state.products.find((row) => row._id === edit);
    fillProductForm(product);
    return;
  }
  if (del) {
    if (!window.confirm('Delete this product?')) return;
    await withError(() => api.products.remove(del));
    toast('Product deleted');
    await loadProducts();
    return;
  }
  if (available) {
    const res = await withError(() => api.products.available(available));
    toast(
      `${res.data.name}: available ${res.data.availableStock} (on hand ${res.data.stockCount}, reserved ${res.data.reservedStock})`
    );
  }
});

$('refresh-products').addEventListener('click', loadProducts);
$('refresh-orders').addEventListener('click', loadOrders);
$('order-status').addEventListener('change', loadOrders);
$('orders-mine').addEventListener('change', loadOrders);
$('user-id').addEventListener('change', loadCart);

$('orders-body').addEventListener('click', async (event) => {
  const { openOrder, pay, fail, cancel } = event.target.dataset;
  if (openOrder) {
    const res = await withError(() => api.orders.get(openOrder));
    openOrderModal(res.data);
  } else if (pay) {
    await payOrder(pay, true);
  } else if (fail) {
    await payOrder(fail, false);
  } else if (cancel) {
    await cancelOrder(cancel);
  }
});

$('modal').addEventListener('click', async (event) => {
  if (event.target.id === 'modal' || event.target.id === 'modal-close') {
    closeModal();
    return;
  }
  const { pay, fail, cancel } = event.target.dataset;
  if (pay) await payOrder(pay, true);
  if (fail) await payOrder(fail, false);
  if (cancel) await cancelOrder(cancel);
});

setInterval(() => {
  if (state.view === 'orders') renderOrders();
}, 1000);

ping();
loadProducts()
  .then(loadCart)
  .then(loadOrders)
  .catch(() => {});
setInterval(ping, 15000);
