import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, RefreshCcw } from 'lucide-react';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/ui/Button';

const PaymentCancel = () => {
  const [searchParams] = useSearchParams();
  const appNo = searchParams.get('application_no');
  const retryUrl = appNo ? `${ROUTES.APPLICANT_STATUS}?id=${appNo}` : ROUTES.APPLICANT_DASHBOARD;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={40} className="text-amber-600" />
        </div>
        
        <h1 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Payment Cancelled</h1>
        <p className="text-gray-500 text-sm mb-8">
          The payment process was interrupted or cancelled. No charges were made to your account.
        </p>

        <div className="space-y-3">
          <Link to={retryUrl}>
            <Button variant="primary" fullWidth leftIcon={<RefreshCcw size={18} />}>
              Return & Try Again
            </Button>
          </Link>
          
          <Link to={ROUTES.APPLICANT_DASHBOARD} className="block text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors pt-2">
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
