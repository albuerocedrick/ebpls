/**
 * UAFWizardScreen.jsx — Applicant Module
 * 5-step Unified Application Form wizard with autosave.
 * Phase 3A: Build full multi-step form with applicationStore and useAutosave hook.
 */

import React from 'react';
import { FileEdit, MapPin, Upload, Eye, Send } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const STEPS = [
  { icon: <FileEdit size={16} />, label: 'Business Info' },
  { icon: <MapPin size={16} />, label: 'Location' },
  { icon: <Upload size={16} />, label: 'Documents' },
  { icon: <Eye size={16} />, label: 'Review' },
  { icon: <Send size={16} />, label: 'Submit' },
];

const UAFWizardScreen = () => (
  <div className="flex flex-col gap-5">
    <div>
      <h1 className="text-xl font-bold text-[hsl(var(--color-text))]">New Application</h1>
      <p className="text-sm text-[hsl(var(--color-text-muted))] mt-0.5">
        Unified Application Form (UAF) — 5 steps
      </p>
    </div>

    {/* Step progress bar */}
    <Card variant="tinted" padding="md">
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((step, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
            <div className={[
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold',
              'border transition-colors duration-200',
              i === 0
                ? 'bg-accent text-white border-accent'
                : 'bg-[hsl(var(--color-surface-raised))] text-[hsl(var(--color-text-muted))] border-border',
            ].join(' ')}>
              {i === 0 ? step.icon : i + 1}
            </div>
            <span className="text-[10px] text-[hsl(var(--color-text-muted))] text-center leading-tight hidden sm:block">
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </Card>

    {/* Form area placeholder */}
    <Card padding="md">
      <p className="text-sm font-medium text-[hsl(var(--color-text))] mb-3">
        Step 1: Business Information
      </p>
      <Card variant="tinted" padding="md">
        <p className="text-xs text-[hsl(var(--color-text-muted))] text-center py-4">
          Phase 0 placeholder — 5-step UAF form built in Phase 3A.
          <br />
          Includes: draft autosave, location pin (Leaflet.js), document upload.
        </p>
      </Card>
    </Card>

    {/* Navigation */}
    <div className="flex gap-3">
      <Button variant="secondary" fullWidth disabled>Previous</Button>
      <Button variant="primary" fullWidth disabled>Next Step</Button>
    </div>
  </div>
);

export default UAFWizardScreen;
