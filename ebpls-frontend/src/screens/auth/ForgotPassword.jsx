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
      <div className="p-8 sm:p-10 flex flex-col gap-6 items-center text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-gray-900">Check your inbox</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            If <strong className="text-gray-900">{email}</strong> is linked to an account, a password reset link has been sent.
          </p>
        </div>
        <div className="w-full h-px bg-gray-100 my-2" />
        <Link
          to={ROUTES.LOGIN}
          className="text-sm font-semibold text-gray-900 hover:underline flex items-center gap-1.5"
        >
          <ArrowLeft size={14} /> Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 sm:p-10 flex flex-col gap-8" noValidate>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          Reset your password
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {/* Field */}
      <Input
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        hint="We'll send a secure reset link to this address."
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        leftElement={<Mail size={16} />}
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
      >
        Send Reset Link
      </Button>

      {/* Back */}
      <div className="text-center">
        <Link
          to={ROUTES.LOGIN}
          className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          Back to Sign In
        </Link>
      </div>
    </form>
  );
};

export default ForgotPassword;
