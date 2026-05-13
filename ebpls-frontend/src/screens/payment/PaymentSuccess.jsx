import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, FileText } from 'lucide-react';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/ui/Button';

const PaymentSuccess = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        
        <h1 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Payment Successful!</h1>
        <p className="text-gray-500 text-sm mb-8">
          Your online payment has been received and is being verified. Your application status will update automatically.
        </p>

        <div className="space-y-3">
          <Link to={ROUTES.APPLICANT_DASHBOARD}>
            <Button variant="primary" fullWidth rightIcon={<ArrowRight size={18} />}>
              Go to Dashboard
            </Button>
          </Link>
          
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest pt-4">
            Official Receipt will be available shortly
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
