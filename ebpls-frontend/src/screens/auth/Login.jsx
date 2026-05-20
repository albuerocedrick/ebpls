import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, Mail, Lock, ArrowRight } from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { ROUTES } from '../../utils/constants';
import useAuth from '../../hooks/useAuth';

const Login = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    await login(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 sm:p-10 flex flex-col gap-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Enter your credentials to access your account.
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          leftElement={<Mail size={16} />}
        />
        <div>
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            leftElement={<Lock size={16} />}
          />
          <div className="flex justify-end mt-2.5">
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>
      </div>

      {/* Submit */}
      <Button
        variant="primary"
        fullWidth
        type="submit"
        size="lg"
        leftIcon={<LogIn size={17} />}
        isLoading={isLoading}
        disabled={!email || !password}
      >
        Sign In
      </Button>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium">New here?</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Register link */}
      <Link
        to={ROUTES.REGISTER}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
      >
        Create an account
        <ArrowRight size={15} />
      </Link>
    </form>
  );
};

export default Login;
