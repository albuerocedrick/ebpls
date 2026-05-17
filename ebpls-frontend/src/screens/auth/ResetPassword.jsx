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
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Supabase sends the reset link with the token in the hash:
    // #access_token=...&refresh_token=...
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', '?'));
    const accessToken = params.get('access_token');

    if (!accessToken) {
      toast.error('Invalid or expired reset link.');
      navigate(ROUTES.LOGIN);
    } else {
      setToken(accessToken);
    }
  }, [navigate]);

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
      <div className="p-6 flex flex-col gap-6 items-center text-center">
        <div
          style={{
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            backgroundColor: 'hsl(var(--color-success-bg, 142, 70%, 95%))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckCircle2 size={24} className="text-green-500" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-[hsl(var(--color-text))]">Password Updated</h1>
          <p className="text-sm text-[hsl(var(--color-text-muted))]">
            Your password has been changed successfully. Redirecting you to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-[hsl(var(--color-text))]">Set New Password</h1>
        <p className="text-sm text-[hsl(var(--color-text-muted))]">
          Please enter your new password below.
        </p>
      </div>

      <Input
        label="New Password"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <Input
        label="Confirm New Password"
        type="password"
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />

      <Button
        variant="primary"
        fullWidth
        type="submit"
        leftIcon={<Lock size={16} />}
        isLoading={isLoading}
      >
        Update Password
      </Button>
    </form>
  );
};

export default ResetPassword;
