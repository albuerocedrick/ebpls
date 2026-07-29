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
    <form onSubmit={handleSubmit} className="p-7 sm:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
          Sign in to your account
        </h1>
        <p className="text-xs text-zinc-500 leading-relaxed font-normal">
          Enter your credentials below to access the e-BPLS portal.
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          leftElement={<Mail size={15} className="text-zinc-400" />}
        />
        <div>
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            leftElement={<Lock size={15} className="text-zinc-400" />}
          />
          <div className="flex justify-end mt-2">
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        variant="primary"
        fullWidth
        type="submit"
        size="lg"
        leftIcon={<LogIn size={16} />}
        isLoading={isLoading}
        disabled={!email || !password}
        className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl py-3 shadow-xs transition-all"
      >
        Sign In
      </Button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-200" />
        <span className="text-[11px] text-zinc-400 font-mono">New here?</span>
        <div className="flex-1 h-px bg-zinc-200" />
      </div>

      {/* Register Link */}
      <Link
        to={ROUTES.REGISTER}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-zinc-200/90 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-2xs"
      >
        Create an account
        <ArrowRight size={14} />
      </Link>
    </form>
  );
};

export default Login;
