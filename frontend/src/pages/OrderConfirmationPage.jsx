import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { api } from '../services/api';
import { CheckCircle, ArrowRight, Package, ShieldCheck, Printer } from 'lucide-react';

export default function OrderConfirmationPage() {
  const { id } = useParams();
  const location = useLocation();

  const [order, setOrder] = useState(location.state?.order || null);
  const [paymentLog, setPaymentLog] = useState(location.state?.paymentLog || null);
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    if (!order) {
      async function loadOrder() {
        try {
          const res = await api.getOrderById(id);
          if (res.success) {
            setOrder(res.order);
            if (res.paymentLogs && res.paymentLogs.length > 0) {
              setPaymentLog(res.paymentLogs[0]);
            }
          }
        } catch (err) {
          console.error('Failed to load order:', err);
        } finally {
          setLoading(false);
        }
      }
      loadOrder();
    }
  }, [id, order]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-slate-500">
        Loading receipt...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center space-y-3">
        <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
          Payment Successful &amp; Order Placed!
        </h1>
        <p className="text-xs sm:text-sm text-emerald-800 max-w-md mx-auto leading-relaxed">
          Your payment was approved by the gateway simulator. Stock has been{' '}
          <strong>permanently deducted</strong> from physical warehouse inventory.
        </p>
      </div>

      {/* Receipt Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Order Reference
            </span>
            <span className="font-mono text-sm font-extrabold text-slate-900">
              {order?._id}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Payment Status
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              {order?.payment_status}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Gateway Transaction ID
            </span>
            <span className="font-mono text-xs font-semibold text-slate-600">
              {paymentLog?.gateway_response?.transaction_id || 'sim_txn_completed'}
            </span>
          </div>
        </div>

        {/* Ordered Items */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            Ordered Items
          </h3>
          <div className="divide-y divide-slate-100">
            {order?.items?.map((item, index) => (
              <div key={index} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="font-bold text-slate-900">{item.name}</span>
                    <span className="text-slate-400 block text-[11px]">Qty: {item.quantity} × ${item.price.toFixed(2)}</span>
                  </div>
                </div>
                <span className="font-extrabold text-slate-900">
                  ${(item.quantity * item.price).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Total Price Breakdown */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-900">${order?.total_amount?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Simulated Express Delivery</span>
            <span className="font-semibold text-emerald-600">FREE</span>
          </div>
          <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
            <span>Total Paid</span>
            <span className="text-brand-600 font-black">${order?.total_amount?.toFixed(2)}</span>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <Link
            to="/orders"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-brand-600 transition-colors shadow-sm"
          >
            <span>View in Order History &amp; Test Refund</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
