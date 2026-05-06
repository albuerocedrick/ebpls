/**
 * LandingPage.jsx
 * Public entry point — system overview and navigation to Login/Register.
 * Phase 2A: Replace with full landing page design.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ArrowRight, ShieldCheck, FileText } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ROUTES } from '../../utils/constants';

const LandingPage = () => (
  <div className="px-6 py-10 flex flex-col gap-8">
    {/* Hero */}
    <div className="text-center flex flex-col items-center gap-4">
      <div className="w-14 h-14 rounded-xl bg-[hsl(var(--color-accent-subtle))] flex items-center justify-center">
        <Building2 size={28} className="text-accent" />
      </div>
      <h1 className="text-2xl font-bold text-[hsl(var(--color-text))]">
        eBPLS — Business Permits & Licensing
      </h1>
      <p className="text-sm text-[hsl(var(--color-text-muted))] max-w-sm">
        The official digital gateway for business permit applications in the Municipality of Liliw.
      </p>
    </div>

    {/* Feature highlights */}
    <Card variant="tinted" padding="md">
      <div className="flex flex-col gap-3">
        {[
          { icon: <FileText size={16} />, text: 'Submit and track business permit applications online' },
          { icon: <ShieldCheck size={16} />, text: 'Secure OTC-only payment processing' },
          { icon: <ArrowRight size={16} />, text: 'Real-time status tracking and email notifications' },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 text-sm text-[hsl(var(--color-text-muted))]">
            <span className="text-accent mt-0.5 shrink-0">{item.icon}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </Card>

    {/* CTAs */}
    <div className="flex flex-col gap-3">
      <Link to={ROUTES.LOGIN}>
        <Button variant="primary" fullWidth>Sign In</Button>
      </Link>
      <Link to={ROUTES.REGISTER}>
        <Button variant="outline" fullWidth>Register as Applicant</Button>
      </Link>
    </div>

    <p className="text-center text-xs text-[hsl(var(--color-text-muted))]">
      Under construction — Phase 2A will replace this placeholder.
    </p>
  </div>
);

export default LandingPage;
