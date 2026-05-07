/**
 * ForgotPassword.jsx
 * Password reset request screen.
 * Phase 2A: Wired to POST /api/auth/forgot-password via useAuth hook.
 *
 * Security: Always shows success state after submit — never reveals
 * whether the email address is registered in the system.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2 } from 'lucide-react';

import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import useAuth from '../../hooks/useAuth';
import { ROUTES } from '../../utils/constants';

const ForgotPassword = () => {
  const { forgotPassword, isLoading } = useAuth();
  const [email, setEmail]       = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    await forgotPassword(email.trim());
    // Always transition to confirmation state regardless of server outcome.
    setSubmitted(true);
  };

  // =========================================
  // Confirmation State
  // Shown after submit — replaces the form.
  // =========================================
  if (submitted) {
    return (
      <div className="p-6 flex flex-col gap-6 items-center text-center">
        <div
          style={{
            width: '3rem',
            height: '3rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'hsl(var(--color-success-bg))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <CheckCircle2
            size={22}
            style={{ color: 'hsl(var(--color-success))' }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-[hsl(var(--color-text))]">
            Check your email
          </h1>
          <p className="text-sm text-[hsl(var(--color-text-muted))]">
            If <strong>{email}</strong> is linked to an eBPLS account, a password
            reset link has been sent. Check your inbox and spam folder.
          </p>
        </div>

        <Link
          to={ROUTES.LOGIN}
          className="text-sm text-accent font-medium hover:opacity-80 transition-opacity"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  // =========================================
  // Request Form
  // =========================================
  return (
    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6" noValidate>
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
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <Button
        variant="primary"
        fullWidth
        type="submit"
        leftIcon={<Mail size={16} />}
        isLoading={isLoading}
        disabled={!email.trim()}
      >
        Send Reset Link
      </Button>

      <Link
        to={ROUTES.LOGIN}
        className="text-center text-xs text-accent hover:opacity-80 transition-opacity"
      >
        Back to Sign In
      </Link>
    </form>
  );
};

export default ForgotPassword;
