/**
 * Login.jsx
 * Universal login screen for all roles.
 * Phase 2A: Wire to POST /api/auth/login via useAuth hook.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { ROUTES } from '../../utils/constants';

const Login = () => (
  <div className="p-6 flex flex-col gap-6">
    <div className="flex flex-col gap-1">
      <h1 className="text-xl font-bold text-[hsl(var(--color-text))]">Sign In</h1>
      <p className="text-sm text-[hsl(var(--color-text-muted))]">
        Enter your credentials to access the system.
      </p>
    </div>

    <div className="flex flex-col gap-4">
      <Input
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        required
        disabled
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        required
        disabled
      />
    </div>

    <div className="flex flex-col gap-3">
      <Button
        variant="primary"
        fullWidth
        leftIcon={<LogIn size={16} />}
        disabled
      >
        Sign In
      </Button>
      <Link
        to={ROUTES.FORGOT_PASSWORD}
        className="text-center text-xs text-accent hover:opacity-80 transition-opacity"
      >
        Forgot your password?
      </Link>
    </div>

    <div className="border-t border-border pt-4 text-center text-sm text-[hsl(var(--color-text-muted))]">
      New applicant?{' '}
      <Link to={ROUTES.REGISTER} className="text-accent font-medium hover:opacity-80 transition-opacity">
        Create an account
      </Link>
    </div>

    <Card variant="tinted" padding="sm">
      <p className="text-xs text-[hsl(var(--color-text-muted))] text-center">
        Phase 0 placeholder — form disabled. Auth wired in Phase 2A.
      </p>
    </Card>
  </div>
);

export default Login;
