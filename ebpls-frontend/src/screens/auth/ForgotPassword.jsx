import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2, ArrowLeft, Send } from 'lucide-react';

import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import useAuth from '../../hooks/useAuth';
import { ROUTES } from '../../utils/constants';

const ForgotPassword = () => {
  const { forgotPassword, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    await forgotPassword(email.trim());
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col gap-6 p-7 sm:p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-900">
          <CheckCircle2 size={20} className="text-white" />
        </div>
        <div>
          <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
            Reset requested
          </span>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900">
            Check your inbox
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            If <strong className="font-medium text-zinc-900">{email}</strong> is
            linked to an account, a password reset link has been sent.
          </p>
        </div>
        <div className="h-px w-full bg-zinc-200" />
        <Link
          to={ROUTES.LOGIN}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-zinc-900"
        >
          <ArrowLeft
            size={14}
            className="transition-transform duration-300 ease-out group-hover:-translate-x-0.5 motion-reduce:transition-none"
          />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7 p-7 sm:p-8" noValidate>
      {/* Header */}
      <div>
        <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
          Password reset
        </span>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900">
          Reset your password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Enter your email address and we&apos;ll send you a link to set a new
          password.
        </p>
      </div>

      {/* Field */}
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        hint="We'll send a secure reset link to this address."
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        leftElement={<Mail size={15} className="text-zinc-400" />}
      />

      {/* Submit */}
      <Button
        variant="primary"
        fullWidth
        size="lg"
        type="submit"
        leftIcon={<Send size={16} />}
        isLoading={isLoading}
        disabled={!email.trim()}
        className="font-semibold"
      >
        Send reset link
      </Button>

      {/* Back */}
      <Link
        to={ROUTES.LOGIN}
        className="group inline-flex items-center justify-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors duration-200 hover:text-zinc-900"
      >
        <ArrowLeft
          size={14}
          className="transition-transform duration-300 ease-out group-hover:-translate-x-0.5 motion-reduce:transition-none"
        />
        Back to sign in
      </Link>
    </form>
  );
};

export default ForgotPassword;
