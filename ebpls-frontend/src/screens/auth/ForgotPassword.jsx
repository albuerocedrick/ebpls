/**
 * ForgotPassword.jsx
 * Password reset request screen.
 * Phase 2A: Wire to POST /api/auth/forgot-password.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { ROUTES } from '../../utils/constants';

const ForgotPassword = () => (
  <div className="p-6 flex flex-col gap-6">
    <div className="flex flex-col gap-1">
      <h1 className="text-xl font-bold text-[hsl(var(--color-text))]">Reset Password</h1>
      <p className="text-sm text-[hsl(var(--color-text-muted))]">
        Enter your email address and we will send you a reset link.
      </p>
    </div>

    <Input
      label="Email Address"
      type="email"
      placeholder="you@example.com"
      hint="Enter the email linked to your eBPLS account."
      required
      disabled
    />

    <Button variant="primary" fullWidth leftIcon={<Mail size={16} />} disabled>
      Send Reset Link
    </Button>

    <Link
      to={ROUTES.LOGIN}
      className="text-center text-xs text-accent hover:opacity-80 transition-opacity"
    >
      Back to Sign In
    </Link>

    <Card variant="tinted" padding="sm">
      <p className="text-xs text-[hsl(var(--color-text-muted))] text-center">
        Phase 0 placeholder — wired in Phase 2A.
      </p>
    </Card>
  </div>
);

export default ForgotPassword;
