/**
 * API Service Client
 * Handles all backend communication for Products, Cart/Checkout,
 * Payment Gateway Simulation, and Order Management.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.code = data.code;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.category && params.category !== 'All') query.set('category', params.category);
    if (params.minPrice !== undefined && params.minPrice !== '') query.set('minPrice', params.minPrice);
    if (params.maxPrice !== undefined && params.maxPrice !== '') query.set('maxPrice', params.maxPrice);
    if (params.inStock) query.set('inStock', 'true');
    if (params.sort) query.set('sort', params.sort);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/products${queryString}`);
  },

  async getProductById(id) {
    return request(`/products/${id}`);
  },

  async getCategories() {
    return request('/products/categories');
  },

  // Checkout & Stock Reservation
  async initiateCheckout(items, shippingAddress) {
    return request('/checkout/initiate', {
      method: 'POST',
      body: JSON.stringify({ items, shipping_address: shippingAddress })
    });
  },

  async releaseCheckout(orderId) {
    return request(`/checkout/${orderId}/release`, {
      method: 'POST'
    });
  },

  // Payment Gateway Simulator & Duplicate Prevention
  async processPayment({ orderId, idempotencyKey, forceOutcome }) {
    return request('/payment/process', {
      method: 'POST',
      body: JSON.stringify({ orderId, idempotencyKey, forceOutcome })
    });
  },

  async getPaymentLogs(orderId) {
    return request(`/payment/logs/${orderId}`);
  },

  // Post-Purchase & Order History
  async getOrderHistory(status = 'ALL') {
    const query = status && status !== 'ALL' ? `?status=${status}` : '';
    return request(`/orders${query}`);
  },

  async getOrderById(id) {
    return request(`/orders/${id}`);
  },

  async cancelOrder(id, reason = 'Customer requested cancellation') {
    return request(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  async retryPayment(id) {
    return request(`/orders/${id}/retry`, {
      method: 'POST'
    });
  }
};
