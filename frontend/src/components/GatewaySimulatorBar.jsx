import React from 'react';
import { useCart } from '../context/CartContext';
import { Sliders, ShieldCheck, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export default function GatewaySimulatorBar() {
  const { simulatedGatewayMode, setSimulatedGatewayMode } = useCart();

  return (
    <aside aria-label="Mock Payment Gateway Controls" className="bg-slate-900 text-white border-b border-slate-800 text-xs py-2 px-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-brand-400" />
            Mock Gateway Simulator:
          </span>
          <span className="text-slate-400 hidden sm:inline">
            Test stock reservation & failure recovery in real-time
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium hidden md:inline">Gateway Mode:</span>
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setSimulatedGatewayMode('RANDOM')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                simulatedGatewayMode === 'RANDOM'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎲 Realistic Random
            </button>
            <button
              onClick={() => setSimulatedGatewayMode('SUCCESS')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                simulatedGatewayMode === 'SUCCESS'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle className="w-3 h-3" /> Force Success
            </button>
            <button
              onClick={() => setSimulatedGatewayMode('FAILURE')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                simulatedGatewayMode === 'FAILURE'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3 h-3" /> Force Fail
            </button>
            <button
              onClick={() => setSimulatedGatewayMode('TIMEOUT')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                simulatedGatewayMode === 'TIMEOUT'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3" /> Force 10s Timeout
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
