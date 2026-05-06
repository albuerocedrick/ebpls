/**
 * CashierPOS.jsx — Treasury Module
 * High-contrast OTC payment entry — Cash or Manager Check ONLY.
 * Phase 5A: Wire to POST /api/treasury/payments/otc.
 *
 * @policy  HIGH CONTRAST dark canvas. Large typography for cashier readability.
 * @policy  OTC STRICT: Only Cash and Manager Check selectors. No other modes.
 * @policy  Change computation must be displayed immediately (Phase 5A: reactive).
 */

import React from 'react';
import { Banknote, CreditCard } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { APP_STATUS, PAYMENT_MODES } from '../../utils/constants';

const CashierPOS = () => (
  <div className="flex flex-col gap-6 max-w-lg mx-auto">
    {/* Application info */}
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white">Cashier POS</h1>
        <p className="text-sm text-white/60 mt-1">BP-2025-010 — Liliw General Merchandise</p>
      </div>
      <Badge status={APP_STATUS.FOR_PAYMENT} />
    </div>

    {/* Amount due — large, high contrast */}
    <div
      className="rounded-xl p-6 text-center"
      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-2">Total Amount Due</p>
      <p className="text-5xl font-bold text-white font-mono">₱3,440.00</p>
    </div>

    {/* Payment mode selector */}
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Payment Mode</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { mode: PAYMENT_MODES.CASH, icon: <Banknote size={18} />, active: true },
          { mode: PAYMENT_MODES.MANAGERS_CHECK, icon: <CreditCard size={18} />, active: false },
        ].map(({ mode, icon, active }) => (
          <button
            key={mode}
            disabled
            className={[
              'flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold',
              'border transition-colors duration-200',
              active
                ? 'bg-accent text-white border-accent'
                : 'bg-transparent text-white/60 border-white/20',
            ].join(' ')}
            aria-label={`Select ${mode}`}
          >
            {icon} {mode}
          </button>
        ))}
      </div>
    </div>

    {/* Amount tendered */}
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
        Amount Tendered
      </label>
      <input
        type="number"
        placeholder="0.00"
        disabled
        className="w-full px-4 py-3 rounded-lg text-2xl font-mono font-bold text-white text-right
                   bg-transparent border border-white/20
                   placeholder:text-white/20 outline-none
                   focus:border-accent disabled:opacity-40"
        aria-label="Amount tendered by customer"
      />
    </div>

    {/* Change display */}
    <div
      className="rounded-lg px-4 py-3 flex items-center justify-between"
      style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
    >
      <span className="text-sm text-white/60 font-medium">Change</span>
      <span className="text-2xl font-mono font-bold text-white">₱0.00</span>
    </div>

    {/* Official Receipt Number */}
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
        Official Receipt No.
      </label>
      <input
        type="text"
        placeholder="e.g. 2025-00123"
        disabled
        className="w-full px-4 py-3 rounded-lg text-base font-mono text-white
                   bg-transparent border border-white/20
                   placeholder:text-white/20 outline-none disabled:opacity-40"
      />
    </div>

    {/* Confirm */}
    <Button variant="primary" fullWidth size="lg" disabled>
      Confirm OTC Payment
    </Button>

    <p className="text-xs text-white/30 text-center">
      Phase 0 placeholder — payment logic wired in Phase 5A &amp; 5B.
    </p>
  </div>
);

export default CashierPOS;
