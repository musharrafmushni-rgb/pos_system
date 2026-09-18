import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  History,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Package,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldAlert
} from 'lucide-react';

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active action states
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
  const [expandedLogsOrderId, setExpandedLogsOrderId] = useState(null);
  const [orderLogs, setOrderLogs] = useState({});

  const fetchOrders = async (status = statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOrderHistory(status);
      if (res.success) {
        setOrders(res.orders);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch order history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(statusFilter);
  }, [statusFilter]);

  // Cancel & Refund Flow (Core Requirement 4)
  const handleCancelAndRefund = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order? A simulated refund will be processed and items will be restored to warehouse inventory.')) {
      return;
    }

    setActionLoadingId(orderId);
    try {
      const res = await api.cancelOrder(orderId, 'Customer requested refund via Order History');
      if (res.success) {
        setSuccessToast(res.message || 'Order successfully refunded and inventory restored!');
        // Refresh orders list
        await fetchOrders(statusFilter);
        // Refresh logs if open
        if (expandedLogsOrderId === orderId) {
          loadPaymentLogs(orderId);
        }
      }
    } catch (err) {
      alert(`Refund failed: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Retry Payment on failed/timed-out order
  const handleRetryPayment = async (orderId) => {
    setActionLoadingId(orderId);
    try {
      const res = await api.retryPayment(orderId);
      if (res.success) {
        setSuccessToast('Stock re-reserved successfully! Ready to re-attempt payment.');
        await fetchOrders(statusFilter);
      }
    } catch (err) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Toggle and load PaymentLogs
  const toggleLogs = async (orderId) => {
    if (expandedLogsOrderId === orderId) {
      setExpandedLogsOrderId(null);
      return;
    }
    setExpandedLogsOrderId(orderId);
    loadPaymentLogs(orderId);
  };

  const loadPaymentLogs = async (orderId) => {
    try {
      const res = await api.getPaymentLogs(orderId);
      if (res.success) {
        setOrderLogs((prev) => ({ ...prev, [orderId]: res.logs }));
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> PAID
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> PENDING HOLD
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> FAILED
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <RotateCcw className="w-3.5 h-3.5 text-purple-600" /> REFUNDED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <XCircle className="w-3.5 h-3.5 text-slate-500" /> CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-brand-600" />
            Order History &amp; Post-Purchase Flows
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor real-time order lifecycle, audit payment logs, and test the simulated refund process.
          </p>
        </div>

        <button
          onClick={() => fetchOrders()}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-bold">{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 font-extrabold text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {['ALL', 'PAID', 'PENDING', 'FAILED', 'CANCELLED', 'REFUNDED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === st
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/4" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center text-rose-700 text-xs">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">No Orders Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {statusFilter === 'ALL'
              ? 'You have not placed any orders yet. Visit the catalog to initiate checkout.'
              : `No orders currently match status: ${statusFilter}`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((orderItem) => {
            const isLogsOpen = expandedLogsOrderId === orderItem._id;
            const currentLogs = orderLogs[orderItem._id] || [];

            return (
              <div
                key={orderItem._id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Order Top Bar */}
                <div className="p-5 sm:p-6 bg-slate-50/60 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-black text-slate-900">
                        Order #{orderItem._id.slice(-8)}
                      </span>
                      {getStatusBadge(orderItem.status)}
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      Placed on {new Date(orderItem.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                        Total Amount
                      </span>
                      <span className="text-lg font-black text-slate-900">
                        ${orderItem.total_amount.toFixed(2)}
                      </span>
                    </div>

                    {/* Cancellation & Refund Trigger */}
                    {orderItem.status === 'PAID' && (
                      <button
                        onClick={() => handleCancelAndRefund(orderItem._id)}
                        disabled={actionLoadingId === orderItem._id}
                        className="px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${actionLoadingId === orderItem._id ? 'animate-spin' : ''}`} />
                        <span>Cancel &amp; Request Refund</span>
                      </button>
                    )}

                    {/* Retry payment for failed or timed out */}
                    {(orderItem.status === 'FAILED' || orderItem.status === 'PENDING') && (
                      <button
                        onClick={() => handleRetryPayment(orderItem._id)}
                        disabled={actionLoadingId === orderItem._id}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-brand-600 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${actionLoadingId === orderItem._id ? 'animate-spin' : ''}`} />
                        <span>Re-Reserve &amp; Retry</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Items in this order */}
                <div className="p-5 sm:p-6 divide-y divide-slate-100">
                  {orderItem.items.map((it, idx) => (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={it.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'}
                          alt={it.name}
                          className="w-12 h-12 object-cover rounded-xl bg-slate-100 border border-slate-200"
                        />
                        <div>
                          <h4 className="font-bold text-slate-800">{it.name}</h4>
                          <span className="text-slate-400 text-[11px]">
                            Qty: {it.quantity} × ${it.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <span className="font-black text-slate-900">
                        ${(it.quantity * it.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Collapsible Payment Audit Logs */}
                <div className="border-t border-slate-100 bg-slate-50/40 p-4">
                  <button
                    onClick={() => toggleLogs(orderItem._id)}
                    className="flex items-center justify-between w-full text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-brand-600" />
                      Payment Gateway Audit Trail
                    </span>
                    {isLogsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isLogsOpen && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-slate-200">
                      {currentLogs.length === 0 ? (
                        <p className="text-[11px] text-slate-400">Loading audit log entries...</p>
                      ) : (
                        currentLogs.map((log) => (
                          <div
                            key={log._id}
                            className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-800 text-[11px]">
                                  {log.status}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                {log.gateway_response?.message || 'Transaction executed'}
                              </p>
                            </div>
                            {log.gateway_response?.latency_ms && (
                              <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                {log.gateway_response.latency_ms}ms latency
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
