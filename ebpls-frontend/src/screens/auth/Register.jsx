/**
 * Register.jsx
 * Applicant self-registration screen.
 * Phase 2A: Wire to POST /api/auth/register via useAuth hook.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { ROUTES } from '../../utils/constants';

const Register = () => (
  <div className="p-6 flex flex-col gap-6">
    <div className="flex flex-col gap-1">
      <h1 className="text-xl font-bold text-[hsl(var(--color-text))]">Create Account</h1>
      <p className="text-sm text-[hsl(var(--color-text-muted))]">
        Register to submit and track business permit applications.
      </p>
    </div>

    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="First Name" placeholder="Juan" required disabled />
        <Input label="Last Name" placeholder="dela Cruz" required disabled />
      </div>
      <Input label="Email Address" type="email" placeholder="you@example.com" required disabled />
      <Input label="Password" type="password" placeholder="Min. 8 characters" required disabled />
      <Input label="Confirm Password" type="password" placeholder="Repeat password" required disabled />
    </div>

    <Button variant="primary" fullWidth leftIcon={<UserPlus size={16} />} disabled>
      Create Account
    </Button>

    <div className="border-t border-border pt-4 text-center text-sm text-[hsl(var(--color-text-muted))]">
      Already have an account?{' '}
      <Link to={ROUTES.LOGIN} className="text-accent font-medium hover:opacity-80 transition-opacity">
        Sign in
      </Link>
    </div>

    <Card variant="tinted" padding="sm">
      <p className="text-xs text-[hsl(var(--color-text-muted))] text-center">
        Phase 0 placeholder — form disabled. Auth wired in Phase 2A.
      </p>
    </Card>
  </div>
);

export default Register;
