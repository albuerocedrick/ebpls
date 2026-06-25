import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { ROUTES } from '../../utils/constants';

const VerifySuccess = () => {
  return (
    <div className="p-8 flex flex-col gap-8 items-center text-center animate-in fade-in zoom-in duration-500">
      <div
        style={{
          width: '5rem',
          height: '5rem',
          borderRadius: '50%',
          backgroundColor: 'hsl(var(--color-success-bg, 142, 70%, 95%))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px hsla(142, 76%, 36%, 0.1)'
        }}
      >
        <CheckCircle2
          size={40}
          style={{ color: 'hsl(var(--color-success, 142, 76%, 36%))' }}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-[hsl(var(--color-text))]">
          Email Verified!
        </h1>
        <p className="text-sm text-[hsl(var(--color-text-muted))] leading-relaxed max-w-xs">
          Your account has been successfully activated. You can now access all the features of the BOSS system.
        </p>
      </div>

      <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <Link
        to={ROUTES.LOGIN}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 hover:scale-[1.02] transition-all"
      >
        Continue to Sign In
        <ArrowRight size={18} />
      </Link>
    </div>
  );
};

export default VerifySuccess;
