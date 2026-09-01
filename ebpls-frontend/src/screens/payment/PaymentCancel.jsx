import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/ui/Button';

const PaymentCancel = () => {
  const [searchParams] = useSearchParams();
  const appNo = searchParams.get('application_no');
  const retryUrl = appNo ? `${ROUTES.APPLICANT_STATUS}?id=${appNo}` : ROUTES.APPLICANT_DASHBOARD;

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 duration-500 animate-in fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
          <AlertCircle size={20} className="text-zinc-600" />
        </div>

        <span className="mt-6 block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
          Not completed
        </span>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900">
          Payment cancelled
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          The payment process was interrupted or cancelled. No charges were made to your account.
        </p>

        <div className="mt-7 space-y-3">
          <Link to={retryUrl} className="block">
            <Button variant="primary" fullWidth leftIcon={<RefreshCcw size={16} />}>
              Return and try again
            </Button>
          </Link>

          <Link
            to={ROUTES.APPLICANT_DASHBOARD}
            className="block pt-1 text-sm font-medium text-zinc-500 transition-colors duration-200 hover:text-zinc-900 motion-reduce:transition-none"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
