import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2 } from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { ROUTES } from '../../utils/constants';
import { apiClient } from '../../utils/apiClient';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Supabase sends the reset link with the token in the hash:
  // #access_token=...&refresh_token=...
  // Read it during the first render so no state update is needed in an effect.
  const [token] = useState(() => {
    const params = new URLSearchParams(window.location.hash.replace('#', '?'));
    return params.get('access_token');
  });

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or expired reset link.');
      navigate(ROUTES.LOGIN);
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match.');
    }

    if (password.length < 8) {
      return toast.error('Password must be at least 8 characters.');
    }

    setIsLoading(true);
    try {
      // We send the token and new password to our own backend
      await apiClient.post('/api/auth/reset-password', {
        password,
        token
      });
      
      setIsSuccess(true);
      toast.success('Password updated successfully!');
      
      // Auto-redirect to login after 3 seconds
      setTimeout(() => navigate(ROUTES.LOGIN), 3000);
    } catch (err) {
      console.error('Reset password error:', err.message);
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-6 p-7 sm:p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-900">
          <CheckCircle2 size={20} className="text-white" />
        </div>
        <div>
          <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
            Password updated
          </span>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900">
            You&apos;re all set
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Your password has been changed. Taking you to sign in…
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7 p-7 sm:p-8">
      <div>
        <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
          Password reset
        </span>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900">
          Set a new password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Choose a password of at least 8 characters.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="New password"
          type="password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          leftElement={<Lock size={15} className="text-zinc-400" />}
        />

        <Input
          label="Confirm new password"
          type="password"
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          leftElement={<Lock size={15} className="text-zinc-400" />}
        />
      </div>

      <Button
        variant="primary"
        fullWidth
        size="lg"
        type="submit"
        leftIcon={<Lock size={16} />}
        isLoading={isLoading}
        className="font-semibold"
      >
        Update password
      </Button>
    </form>
  );
};

export default ResetPassword;
