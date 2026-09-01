/**
 * Login.jsx
 * Sign-in form. Presentation only — the auth flow is unchanged.
 */
import { useState } from 'react';
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-7 p-7 sm:p-8">
      {/* Header. Mono eyebrow above the title, as every landing section does. */}
      <div>
        <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
          Account access
        </span>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900">
          Sign in to your account
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Enter your credentials to reach the Business One Stop Shop portal.
        </p>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4">
        <Input
          label="Email address"
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
          <div className="mt-2 flex justify-end">
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="text-xs font-medium text-zinc-500 transition-colors duration-200 hover:text-zinc-900"
            >
              Forgot password?
            </Link>
          </div>
        </div>
      </div>

      <Button
        variant="primary"
        fullWidth
        type="submit"
        size="lg"
        leftIcon={<LogIn size={16} />}
        isLoading={isLoading}
        disabled={!email || !password}
        className="font-semibold"
      >
        Sign in
      </Button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-200" />
        <span className="font-mono text-[10px] tracking-[0.12em] text-zinc-400 uppercase">
          New here?
        </span>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      {/* Register link, kept as the secondary action rather than a second
          filled button so the primary path stays unambiguous. */}
      <Link
        to={ROUTES.REGISTER}
        className="group flex w-full items-center justify-center gap-2 rounded-md border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-800 transition-colors duration-200 hover:border-zinc-300 hover:bg-zinc-50"
      >
        Create an account
        <ArrowRight
          size={14}
          className="transition-transform duration-300 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </Link>
    </form>
  );
};

export default Login;
