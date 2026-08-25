/**
 * ProcedureGuide.jsx
 * One-line "what happens next" banner above the status timeline.
 *
 * @policy  Neutral zinc only. Emphasis is carried by fill weight — a plain
 *          hairline card for informational states and a solid zinc-900 card
 *          when the applicant has to act — instead of blue/amber/green.
 */
import { STATUSES } from '../../utils/constants';

const ProcedureGuide = ({ status }) => {
  let message;
  // 'info'   — nothing for the applicant to do, just an update.
  // 'action' — the applicant must act (corrections, payment, download).
  let type = 'info';

  switch (status) {
    case STATUSES.PENDING:
      message = 'Your application is being reviewed by the BPLO office. Please wait for verification.';
      break;
    case STATUSES.UNDER_REVIEW:
      message = 'BPLO officers are checking your documents. This usually takes 1-2 business days.';
      break;
    case STATUSES.RETURNED:
      message = 'Your application needs corrections. Use "Update application" below to fix the issues.';
      type = 'action';
      break;
    case STATUSES.VERIFIED:
    case STATUSES.FOR_ASSESSMENT:
      message = 'Your documents are verified. The application has been forwarded to Treasury for fee assessment.';
      break;
    case STATUSES.ASSESSED:
    case STATUSES.FOR_PAYMENT:
      message = 'Your fees have been assessed. Review the breakdown below and proceed to payment.';
      type = 'action';
      break;
    case STATUSES.PAYMENT_PROCESSING:
      message = 'We are verifying your online payment. This page will update automatically.';
      break;
    case STATUSES.PAID:
    case STATUSES.COMPLETED:
      message = 'Your payment is confirmed. Download your business permit and E-Resibo below.';
      type = 'action';
      break;
    default:
      message = 'Please check the status of your application below.';
  }

  const eyebrow = type === 'action' ? 'Next step' : 'Status';

  return (
    <div
      className={[
        'rounded-lg p-4 animate-in fade-in-50',
        type === 'action'
          ? 'bg-zinc-900 text-white'
          : 'border border-zinc-200 bg-white text-zinc-700',
      ].join(' ')}
    >
      <span
        className={[
          'block font-mono text-[10px] tracking-[0.16em] uppercase',
          type === 'action' ? 'text-zinc-400' : 'text-zinc-500',
        ].join(' ')}
      >
        {eyebrow}
      </span>
      <p className="mt-2 text-sm leading-relaxed">{message}</p>
    </div>
  );
};

export default ProcedureGuide;
