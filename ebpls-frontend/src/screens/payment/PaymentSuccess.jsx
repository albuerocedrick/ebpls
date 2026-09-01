import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/ui/Button';

const PaymentSuccess = () => {
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 duration-500 animate-in fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-900">
          <CheckCircle2 size={20} className="text-white" />
        </div>

        <span className="mt-6 block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
          Payment received
        </span>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900">
          Payment successful
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Your online payment has been received and is being verified. Your application status will
          update automatically.
        </p>

        <div className="mt-7 space-y-4">
          <Link to={ROUTES.APPLICANT_DASHBOARD} className="block">
            <Button variant="primary" fullWidth rightIcon={<ArrowRight size={16} />}>
              Go to dashboard
            </Button>
          </Link>

          <div className="border-t border-zinc-200 pt-4">
            <p className="font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">
              Official receipt available shortly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
