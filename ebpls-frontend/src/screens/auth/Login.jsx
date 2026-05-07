import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
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
    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-3">
        <Button
          variant="primary"
          fullWidth
          type="submit"
          leftIcon={<LogIn size={16} />}
          isLoading={isLoading}
          disabled={!email || !password}
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
    </form>
  );
};

export default Login;
