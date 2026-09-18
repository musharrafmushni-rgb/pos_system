import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import {
  CreditCard,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Lock,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, subtotal, clearCart, simulatedGatewayMode } = useCart();

  // Shipping Form State
  const [shippingAddress, setShippingAddress] = useState({
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    street: '123 Market Street',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    country: 'USA'
  });

  // Mock Card State
  const [cardInfo, setCardInfo] = useState({
    cardNumber: '4242 •••• •••• 4242',
    expDate: '12/28',
    cvv: '123',
    cardHolder: 'Jane Doe'
  });

  // Active Checkout & Reservation State
  const [order, setOrder] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(null);

  // Status & Flags
  const [reservingStock, setReservingStock] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [timeoutCountdown, setTimeoutCountdown] = useState(10);
  const [errorBanner, setErrorBanner] = useState(null);
  const [duplicateBlockedNotice, setDuplicateBlockedNotice] = useState(null);

  // If user navigates with empty cart and no active reservation
  if (cartItems.length === 0 && !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-extrabold text-slate-900">Your Cart is Empty</h2>
        <p className="text-slate-500 text-sm">
          Please add items to your cart before proceeding to checkout.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Browse Catalog
        </Link>
      </div>
    );
  }

  // Reservation Countdown Timer
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.floor((target - now) / 1000));

      setSecondsRemaining(diff);

      if (diff <= 0) {
        clearInterval(interval);
        setErrorBanner('Your 10-minute stock reservation has expired. Stock has been automatically released back to the inventory.');
        setOrder(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Step 1: Reserve Stock & Initiate Order
  const handleInitiateReservation = async () => {
    setReservingStock(true);
    setErrorBanner(null);
    setDuplicateBlockedNotice(null);

    try {
      const payloadItems = cartItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity
      }));

      const res = await api.initiateCheckout(payloadItems, shippingAddress);

      if (res.success) {
        setOrder(res.order);
        setIdempotencyKey(res.idempotencyKey);
        setExpiresAt(res.expiresAt);
      }
    } catch (err) {
      setErrorBanner(err.message || 'Failed to reserve stock for checkout');
    } finally {
      setReservingStock(false);
    }
  };

  // Step 2: Submit Payment to Mock Gateway
  const handleProcessPayment = async (overrideOutcome = null) => {
    if (!order) return;

    setProcessingPayment(true);
    setErrorBanner(null);
    setDuplicateBlockedNotice(null);

    const outcomeToUse = overrideOutcome || (simulatedGatewayMode === 'RANDOM' ? null : simulatedGatewayMode);

    // Timeout countdown ticker for UX feedback if TIMEOUT is expected
    let timer = null;
    if (outcomeToUse === 'TIMEOUT' || simulatedGatewayMode === 'TIMEOUT') {
      setTimeoutCountdown(10);
      timer = setInterval(() => {
        setTimeoutCountdown((prev) => Math.max(1, prev - 1));
      }, 1000);
    }

    try {
      const res = await api.processPayment({
        orderId: order._id,
        idempotencyKey: idempotencyKey,
        forceOutcome: outcomeToUse
      });

      if (timer) clearInterval(timer);

      if (res.success && res.outcome === 'SUCCESS') {
        clearCart();
        navigate(`/order-confirmation/${order._id}`, {
          state: {
            order: res.order,
            paymentLog: res.paymentLog,
            message: res.message
          }
        });
      }
    } catch (err) {
      if (timer) clearInterval(timer);

      // Check if duplicate prevention was triggered
      if (err.code === 'ALREADY_PAID' || err.code === 'PAYMENT_IN_PROGRESS' || err.code === 'IDEMPOTENT_TRANSACTION_EXISTS') {
        setDuplicateBlockedNotice(err.message);
      } else if (err.status === 408 || err.data?.outcome === 'TIMEOUT') {
        setErrorBanner(
          'Simulated Gateway Timeout: The payment gateway failed to respond within 10 seconds. Reserved inventory has been safely restored.'
        );
        // Order is now failed on backend, stock released
        setOrder((prev) => (prev ? { ...prev, status: 'FAILED', payment_status: 'TIMED_OUT' } : null));
      } else if (err.status === 402 || err.data?.outcome === 'FAILURE') {
        setErrorBanner(
          'Simulated Card Decline: Payment failed. Stock reservation has been automatically released back to the store.'
        );
        setOrder((prev) => (prev ? { ...prev, status: 'FAILED', payment_status: 'FAILED' } : null));
      } else {
        setErrorBanner(err.message || 'Payment processing failed');
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  // Test Rapid Double Submission to verify duplicate prevention
  const handleTestDuplicateSubmission = async () => {
    if (!order) return;
    setDuplicateBlockedNotice('Simulating simultaneous duplicate payment requests...');

    // Fire 2 concurrent requests with identical order & idempotency key
    try {
      const [res1, res2] = await Promise.allSettled([
        api.processPayment({ orderId: order._id, idempotencyKey, forceOutcome: 'SUCCESS' }),
        api.processPayment({ orderId: order._id, idempotencyKey, forceOutcome: 'SUCCESS' })
      ]);

      if (res2.status === 'rejected') {
        setDuplicateBlockedNotice(`✅ Duplicate Blocked by Backend: ${res2.reason.message}`);
      } else if (res1.status === 'rejected') {
        setDuplicateBlockedNotice(`✅ Duplicate Blocked by Backend: ${res1.reason.message}`);
      }
    } catch (e) {
      setDuplicateBlockedNotice(`Duplicate error caught: ${e.message}`);
    }
  };

  const formatTimer = (totalSeconds) => {
    if (totalSeconds === null || totalSeconds === undefined) return '--:--';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Shopping
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Secure Checkout & Stock Reservation
          </h1>
        </div>

        {/* Live Reservation Timer Badge */}
        {order && secondsRemaining !== null && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 animate-soft-pulse shadow-sm">
            <Clock className="w-4 h-4 text-amber-600 animate-spin" />
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold block text-amber-700">
                Stock Reserved For:
              </span>
              <span className="text-base font-black font-mono text-amber-900">
                {formatTimer(secondsRemaining)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error / Alert Banner */}
      {errorBanner && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-sm mb-0.5">Transaction Notice</h4>
            <p className="leading-relaxed">{errorBanner}</p>
          </div>
        </div>
      )}

      {/* Duplicate Prevention Notice */}
      {duplicateBlockedNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 shadow-xs">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-sm mb-0.5">Duplicate Prevention Shield Active</h4>
            <p className="leading-relaxed">{duplicateBlockedNotice}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Forms & Payment (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Reservation Status Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  order ? 'bg-emerald-500 text-white' : 'bg-brand-600 text-white'
                }`}>
                  1
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Inventory Stock Reservation
                </h3>
              </div>
              {order ? (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Stock Locked
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Pending Hold
                </span>
              )}
            </div>

            {order ? (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">
                    Order Reference: <code className="bg-white px-2 py-0.5 rounded border border-emerald-300">{order._id}</code>
                  </span>
                  <span className="text-xs font-bold text-emerald-700">Status: {order.status}</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  ✅ Stock has been atomically held in the database. No other shopper can purchase these items while your session is active.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Before entering payment credentials, click below to test the atomic stock reservation engine.
                  This moves the items to <code>reserved_quantity</code> without permanently deducting physical inventory.
                </p>

                <button
                  onClick={handleInitiateReservation}
                  disabled={reservingStock}
                  className="w-full py-3.5 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
                >
                  {reservingStock ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Reserving Stock in Database...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Lock & Reserve Stock for Checkout</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Shipping Details */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                2
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Shipping Destination (Simulation)
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={shippingAddress.fullName}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={shippingAddress.email}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={shippingAddress.street}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={shippingAddress.zipCode}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, zipCode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Mock Payment Gateway Submission */}
          <div className={`bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 transition-opacity ${
            !order ? 'opacity-60 pointer-events-none' : 'opacity-100'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Mock Payment Processing
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-600" /> Idempotency Guard Active
              </span>
            </div>

            {/* Mock Credit Card UI */}
            <div className="p-5 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white shadow-lg space-y-4 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <CreditCard className="w-6 h-6 text-brand-400" />
                <span className="text-xs font-mono tracking-widest text-slate-400">SIMULATED VISA</span>
              </div>
              <div className="text-base sm:text-lg font-mono tracking-widest text-slate-200">
                {cardInfo.cardNumber}
              </div>
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500">CARDHOLDER</span>
                  <span className="text-white font-bold">{cardInfo.cardHolder}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500">EXPIRES</span>
                  <span className="text-white font-bold">{cardInfo.expDate}</span>
                </div>
              </div>
            </div>

            {/* Processing Overlay for Timeout or Spinner */}
            {processingPayment && (
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 space-y-2 text-center">
                <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
                <p className="font-extrabold text-xs">Simulating Gateway Transaction...</p>
                {simulatedGatewayMode === 'TIMEOUT' && (
                  <p className="text-xs text-amber-700 font-mono font-bold">
                    ⏳ Simulating 10-second timeout delay: {timeoutCountdown}s remaining
                  </p>
                )}
                <p className="text-[11px] text-slate-500">
                  Duplicate submissions are locked with <code>payment_status = 'PROCESSING'</code>.
                </p>
              </div>
            )}

            {/* Payment Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() => handleProcessPayment()}
                disabled={processingPayment || !order}
                className="w-full py-4 px-6 rounded-2xl bg-slate-900 hover:bg-brand-600 text-white font-bold text-sm uppercase tracking-wider transition-all shadow-lg active:scale-98 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>
                  Authorize & Pay ${order ? order.total_amount.toFixed(2) : subtotal.toFixed(2)}
                </span>
              </button>

              {/* Developer Test Tools for Concurrency and Idempotency */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-400">Tester Controls:</span>
                <button
                  type="button"
                  onClick={handleTestDuplicateSubmission}
                  disabled={processingPayment || !order}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  ⚡ Fire Rapid Double Payment (Test Duplicate Blocker)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 sticky top-24">
          <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
            Order Review ({cartItems.length} items)
          </h3>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {cartItems.map((item) => (
              <div key={item.product_id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-12 h-12 object-cover rounded-xl bg-slate-100 border border-slate-200"
                />
                <div className="flex-1 min-w-0 text-xs">
                  <h4 className="font-bold text-slate-800 truncate">{item.name}</h4>
                  <span className="text-slate-400 text-[11px]">Qty: {item.quantity}</span>
                </div>
                <span className="font-extrabold text-slate-900 text-xs">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-xs pt-4 border-t border-slate-200">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Simulated Express Shipping</span>
              <span className="font-semibold text-emerald-600">FREE</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Estimated Taxes</span>
              <span className="font-semibold text-slate-800">$0.00</span>
            </div>
            <div className="flex justify-between text-slate-900 font-extrabold text-base pt-3 border-t border-slate-200">
              <span>Total Amount</span>
              <span className="text-brand-600 font-black">${subtotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Explanatory Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              <span>Stock Reservation Guarantee</span>
            </div>
            <p className="leading-relaxed">
              When you click &ldquo;Lock &amp; Reserve Stock&rdquo;, the backend runs an atomic query reserving the requested units.
              If the transaction times out or is declined, the reservation is released back to the store.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
