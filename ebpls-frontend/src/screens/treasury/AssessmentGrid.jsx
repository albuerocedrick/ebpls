/**
 * AssessmentGrid.jsx — Treasury Module
 * Spreadsheet-style fee assessment view with override fields.
 * Phase 5A: Build with real assessment data from POST /api/treasury/assess.
 *
 * @policy  HIGH CONTRAST dark canvas (treasury-canvas) — large, legible typography.
 */

import React from 'react';
import { Calculator } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { APP_STATUS } from '../../utils/constants';

const FEE_LINES = [
  { description: "Mayor's Permit Fee", base: '₱2,400.00', override: null },
  { description: 'Fire Safety Inspection Fee (10%)', base: '₱240.00', override: null },
  { description: 'Sanitary Permit Fee', base: '₱500.00', override: null },
  { description: 'Garbage Fee', base: '₱300.00', override: null },
];

const AssessmentGrid = () => (
  <div className="flex flex-col gap-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white">Fee Assessment</h1>
        <p className="text-sm text-white/60 mt-1">Liliw General Merchandise — BP-2025-010</p>
      </div>
      <Badge status={APP_STATUS.FOR_ASSESSMENT} />
    </div>

    {/* Fee grid */}
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: 'rgba(255,255,255,0.1)' }}
    >
      {/* Header */}
      <div
        className="grid grid-cols-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/50"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      >
        <span>Fee Description</span>
        <span className="text-right">Computed Amount</span>
        <span className="text-right">Override</span>
      </div>
      {/* Rows */}
      {FEE_LINES.map((fee, i) => (
        <div
          key={i}
          className="grid grid-cols-3 px-4 py-3 text-sm items-center"
          style={{ borderTop: 'rgba(255,255,255,0.06) 1px solid' }}
        >
          <span className="text-white/80">{fee.description}</span>
          <span className="text-right font-mono text-white">{fee.base}</span>
          <div className="flex justify-end">
            <input
              type="text"
              placeholder={fee.base}
              disabled
              className="w-28 text-right px-2 py-1 rounded text-sm font-mono text-white
                         bg-[hsl(var(--color-warning-bg)/0.15)] border
                         border-[hsl(var(--color-warning)/0.4)]
                         placeholder:text-white/30 outline-none
                         focus:border-[hsl(var(--color-warning))]
                         disabled:opacity-40"
              aria-label={`Override amount for ${fee.description}`}
            />
          </div>
        </div>
      ))}
      {/* Total */}
      <div
        className="grid grid-cols-3 px-4 py-3 text-sm font-bold"
        style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderTop: '1px solid rgba(255,255,255,0.1)' }}
      >
        <span className="text-white">Total</span>
        <span className="text-right font-mono text-white col-span-2">₱3,440.00</span>
      </div>
    </div>

    {/* Actions */}
    <div className="flex gap-3">
      <Button
        variant="secondary"
        fullWidth
        disabled
        className="!bg-white/10 !text-white !border-white/20"
      >
        Reset Overrides
      </Button>
      <Button
        variant="primary"
        fullWidth
        leftIcon={<Calculator size={16} />}
        disabled
      >
        Finalize Assessment
      </Button>
    </div>

    <p className="text-xs text-white/40 text-center">
      Phase 0 placeholder — assessment engine wired in Phase 5B.
    </p>
  </div>
);

export default AssessmentGrid;
