const api = {
  async request(method, path, body) {
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      const extra = json.details ? ` (${JSON.stringify(json.details)})` : '';
      throw new Error((json.message || `HTTP ${res.status}`) + extra);
    }
    return json;
  },

  health: () => api.request('GET', '/health'),
  products: {
    list: () => api.request('GET', '/api/products'),
    get: (id) => api.request('GET', `/api/products/${id}`),
    create: (data) => api.request('POST', '/api/products', data),
    update: (id, data) => api.request('PUT', `/api/products/${id}`, data),
    remove: (id) => api.request('DELETE', `/api/products/${id}`),
    available: (id) => api.request('GET', `/api/products/${id}/available-stock`)
  },
  carts: {
    get: (userId) => api.request('GET', `/api/carts/${encodeURIComponent(userId)}`),
    add: (userId, productId, quantity) =>
      api.request('POST', `/api/carts/${encodeURIComponent(userId)}/items`, {
        productId,
        quantity
      }),
    update: (userId, productId, quantity) =>
      api.request('PUT', `/api/carts/${encodeURIComponent(userId)}/items/${productId}`, {
        quantity
      }),
    remove: (userId, productId) =>
      api.request('DELETE', `/api/carts/${encodeURIComponent(userId)}/items/${productId}`),
    clear: (userId) => api.request('DELETE', `/api/carts/${encodeURIComponent(userId)}`)
  },
  orders: {
    checkout: (userId) => api.request('POST', '/api/orders/checkout', { userId }),
    pay: (id, success) => api.request('POST', `/api/orders/${id}/payment`, { success }),
    cancel: (id) => api.request('POST', `/api/orders/${id}/cancel`),
    list: (query = {}) => {
      const params = new URLSearchParams();
      if (query.userId) params.set('userId', query.userId);
      if (query.status) params.set('status', query.status);
      const suffix = params.toString() ? `?${params}` : '';
      return api.request('GET', `/api/orders${suffix}`);
    },
    get: (id) => api.request('GET', `/api/orders/${id}`)
  }
};
