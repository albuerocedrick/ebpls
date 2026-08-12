import React from 'react';
import { STATUSES } from '../../utils/constants';

const ProcedureGuide = ({ status }) => {
  let message = '';
  let type = 'info';

  switch (status) {
    case STATUSES.PENDING:
      message = 'Your application is being reviewed by the BPLO office. Please wait for verification.';
      break;
    case STATUSES.UNDER_REVIEW:
      message = 'BPLO officers are checking your documents. This usually takes 1-2 business days.';
      break;
    case STATUSES.RETURNED:
      message = '⚠️ Your application needs corrections. Click "Update Application" to fix the issues.';
      type = 'warning';
      break;
    case STATUSES.VERIFIED:
    case STATUSES.FOR_ASSESSMENT:
      message = 'Your documents are verified! Your application has been forwarded to Treasury for fee assessment.';
      type = 'success';
      break;
    case STATUSES.ASSESSED:
    case STATUSES.FOR_PAYMENT:
      message = 'Your fees have been assessed. Review the breakdown below and proceed to payment.';
      type = 'success';
      break;
    case STATUSES.PAYMENT_PROCESSING:
      message = 'We are verifying your online payment. This page will update automatically.';
      break;
    case STATUSES.PAID:
    case STATUSES.COMPLETED:
      message = '✅ Your payment has been confirmed! Download your Business Permit and E-Resibo below.';
      type = 'success';
      break;
    default:
      message = 'Please check the status of your application below.';
  }

  const baseClasses = 'p-4 rounded-xl text-sm mb-6 animate-in fade-in-50';
  let colorClasses = 'bg-blue-50 text-blue-800 border border-blue-200';

  if (type === 'warning') colorClasses = 'bg-yellow-50 text-yellow-800 border border-yellow-200';
  if (type === 'success') colorClasses = 'bg-emerald-50 text-emerald-800 border border-emerald-200';

  return (
    <div className={`${baseClasses} ${colorClasses}`}>
      <p className="font-medium">{message}</p>
    </div>
  );
};

export default ProcedureGuide;
