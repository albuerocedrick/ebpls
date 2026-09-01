import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  ArrowLeft, 
  FileText, 
  Loader2, 
  Download, 
  Award, 
  Receipt,
  Globe,
  Banknote,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import StatusBadge from '../../components/shared/StatusBadge';
import ProcedureGuide from '../../components/shared/ProcedureGuide';
import { ROUTES, STATUSES, API_BASE_URL } from '../../utils/constants';
import apiClient from '../../utils/apiClient';
import useAuthStore from '../../store/authStore';
import Button from '../../components/ui/Button';
import useApplicationStatus from '../../hooks/useApplicationStatus'; // Import the Hook

// Timeline definition
const TIMELINE_STEPS = [
  { status: 'Pending', label: 'Application Submitted', desc: 'Awaiting BPLO review.' },
  { status: 'Under Review', label: 'Under Review', desc: 'BPLO is checking your documents.' },
  { status: 'Verified', label: 'Documents Verified', desc: 'All requirements are complete.' },
  { status: 'For Assessment', label: 'Routing to Treasury', desc: 'Preparing fee assessment.' },
  { status: 'Assessed', label: 'Fees Assessed', desc: 'Tax Order of Payment (TOP) generated.' },
  { status: 'For Payment', label: 'Ready for Payment', desc: 'Please pay Over-The-Counter (OTC) or Online.' },
  { status: 'PaymentProcessing', label: 'Verifying Online Payment', desc: 'Waiting for PayMongo confirmation.' },
  { status: 'Paid', label: 'Payment Recorded', desc: 'Official Receipt issued.' },
  { status: 'Completed', label: 'Permit Issued', desc: 'Business permit and E-Resibo are ready.' }
];

const StatusTracker = () => {
  const [searchParams] = useSearchParams();
  const appId = searchParams.get('id');

  // Use the Custom Hook (Handles data, status, loading, error, and POLLING)
  const { data: applicationData, status: currentStatus, isLoading, error } = useApplicationStatus(appId);
  
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Assessment Breakdown state
  const [assessmentBreakdown, setAssessmentBreakdown] = useState(null);
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);
  const [isPaymentBreakdownExpanded, setIsPaymentBreakdownExpanded] = useState(false);

  useEffect(() => {
    if (appId && currentStatus) {
      const breakdownStatuses = [
        STATUSES.ASSESSED,
        STATUSES.FOR_PAYMENT,
        STATUSES.PAYMENT_PROCESSING,
        STATUSES.PAID,
        STATUSES.COMPLETED
      ];
      
      if (breakdownStatuses.includes(currentStatus) && !assessmentBreakdown && !isBreakdownLoading) {
        const fetchAssessment = async () => {
          try {
            setIsBreakdownLoading(true);
            const res = await apiClient.get(`/api/applications/${appId}/assessment`);
            if (res.success) {
              setAssessmentBreakdown(res.data);
            }
          } catch (err) {
            console.error('Failed to fetch assessment breakdown', err);
          } finally {
            setIsBreakdownLoading(false);
          }
        };
        fetchAssessment();
      }
    }
  }, [appId, currentStatus]);

  // ---------------------------------------------------------------------------
  // ONLINE PAYMENT HANDLER
  // ---------------------------------------------------------------------------
  const handlePayOnline = async () => {
    try {
      setIsActionLoading(true);
      const res = await apiClient.post('/api/treasury/payments/online', { application_no: appId });
      if (res.success && res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (err) {
      alert(err.message || 'Could not initiate online payment.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Intl.DateTimeFormat('en-PH', { 
      month: 'short', day: 'numeric', year: 'numeric', 
      hour: 'numeric', minute: '2-digit' 
    }).format(new Date(isoString));
  };

  // State for application list (when no appId is provided)
  const [appList, setAppList] = useState([]);
  const [isListLoading, setIsListLoading] = useState(!appId);

  useEffect(() => {
    if (!appId) {
      const fetchList = async () => {
        try {
          setIsListLoading(true);
          const res = await apiClient.get('/api/applications/list');
          setAppList(res?.data || []);
        } catch { setAppList([]); }
        finally { setIsListLoading(false); }
      };
      fetchList();
    }
  }, [appId]);

  if (!appId) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <Link
            to={ROUTES.APPLICANT_DASHBOARD}
            className="group mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors duration-200 hover:text-zinc-900 motion-reduce:transition-none"
          >
            <ArrowLeft
              size={14}
              className="transition-transform duration-300 ease-out group-hover:-translate-x-0.5 motion-reduce:transition-none"
            />
            Back to dashboard
          </Link>
          <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
            Status tracker
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">Track application</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Select an application to view its progress.
          </p>
        </div>

        {isListLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={22} className="animate-spin text-zinc-300" />
          </div>
        ) : appList.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md border border-zinc-200 bg-white">
              <FileText size={18} className="text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-900">No applications found</p>
            <p className="mt-1 text-xs text-zinc-500">Submit an application first to track its status.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {appList.map((app) => (
              <Link
                key={app.application_no}
                to={`${ROUTES.APPLICANT_STATUS}?id=${app.application_no}`}
                className="flex items-center justify-between border-b border-zinc-200 p-4 transition-colors duration-200 last:border-b-0 hover:bg-zinc-50 motion-reduce:transition-none"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-md border border-zinc-200 bg-white p-2">
                    <FileText size={15} className="text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{app.businesses?.business_name || 'Business'}</p>
                    <p className="font-mono text-[11px] text-zinc-500">{app.application_no}</p>
                  </div>
                </div>
                <StatusBadge status={app.status} size="sm" />
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Loader2 size={28} className="animate-spin text-zinc-300" />
        <p className="text-sm text-zinc-500">Tracking application…</p>
      </div>
    );
  }

  if (error || !applicationData) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Link
          to={ROUTES.APPLICANT_DASHBOARD}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors duration-200 hover:text-zinc-900 motion-reduce:transition-none"
        >
          <ArrowLeft
            size={14}
            className="transition-transform duration-300 ease-out group-hover:-translate-x-0.5 motion-reduce:transition-none"
          />
          Back
        </Link>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center">
          <AlertCircle size={24} className="mx-auto mb-3 text-zinc-500" />
          <p className="font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">Tracking failed</p>
          <p className="mt-2 text-sm text-zinc-700">{error || 'Application not found.'}</p>
        </div>
      </div>
    );
  }

  const { last_updated, return_remarks, businesses, assessments } = applicationData;
  const businessName = businesses?.business_name || 'Business Application';
  
  // Handle both array (Supabase default) and single object (Supabase 1:1 optimization)
  const assessmentData = Array.isArray(assessments) ? assessments[0] : assessments;
  const totalAmount = Number(assessmentData?.total_amount || 0);

  const isReturned = currentStatus === 'Returned';
  const currentStepIndex = TIMELINE_STEPS.findIndex(s => s.status === currentStatus);
  const activeIndex = isReturned ? 1 : currentStepIndex;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-20">

      <div>
        <Link
          to={ROUTES.APPLICANT_DASHBOARD}
          className="group mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors duration-200 hover:text-zinc-900 motion-reduce:transition-none"
        >
          <ArrowLeft
            size={14}
            className="transition-transform duration-300 ease-out group-hover:-translate-x-0.5 motion-reduce:transition-none"
          />
          Back to dashboard
        </Link>
        <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
          Status tracker
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">Track application</h1>
      </div>

      <ProcedureGuide status={currentStatus} />

      {/* Main Status Timeline Card */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-zinc-200 bg-white p-2.5">
              <FileText size={18} className="text-zinc-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">{businessName}</p>
              <p className="mt-0.5 font-mono text-[11px] text-zinc-500">Ref: {appId}</p>
            </div>
          </div>
          <StatusBadge status={currentStatus} size="md" />
        </div>

        <div className="p-6 sm:p-8">
          {/* Returned Edge Case Banner */}
          {isReturned && (
            <div className="mb-8 flex items-start gap-3 rounded-md border border-zinc-300 bg-zinc-50 p-4">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-zinc-600" />
              <div>
                <h4 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
                  Application returned
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">
                  {return_remarks || 'Please check your requirements.'}
                </p>
                <Link
                  to={`${ROUTES.APPLICANT_UAF}?edit=${appId}`}
                  className="mt-3 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-zinc-800 motion-reduce:transition-none"
                >
                  Update application
                </Link>
              </div>
            </div>
          )}

          {/* Timeline Display */}
          <div className="relative">
            {TIMELINE_STEPS.map((step, index) => {
              const isPast = activeIndex > index && !isReturned;
              const isActive = activeIndex === index && !isReturned;
              const showTimestamp = (isActive || (isReturned && step.status === 'Under Review')) && last_updated;

              return (
                <div key={step.status} className="relative flex gap-4 pb-8 last:pb-0 sm:gap-6">
                  {index !== TIMELINE_STEPS.length - 1 && (
                    <div className={`absolute top-8 bottom-0 left-[11px] -ml-px w-px sm:left-[15px] ${isPast ? 'bg-zinc-900' : 'bg-zinc-200'}`} />
                  )}

                  <div className="relative z-10 mt-1 shrink-0">
                    {isPast ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-white sm:h-8 sm:w-8">
                        <CheckCircle2 size={15} strokeWidth={2.5} />
                      </div>
                    ) : isActive ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-zinc-900 ring-2 ring-zinc-900 sm:h-8 sm:w-8">
                        <Clock size={15} strokeWidth={2.5} />
                      </div>
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-300 sm:h-8 sm:w-8">
                        <Circle size={11} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pt-1 sm:pt-1.5">
                    <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center sm:gap-4">
                      <p className={`text-sm font-medium sm:text-base ${isPast || isActive ? 'text-zinc-900' : 'text-zinc-400'}`}>
                        {step.label}
                      </p>
                      {showTimestamp && (
                        <p className="shrink-0 font-mono text-[10px] text-zinc-500 tabular-nums sm:text-[11px]">
                          {formatDate(last_updated)}
                        </p>
                      )}
                    </div>
                    <p className={`mt-1 text-xs leading-relaxed sm:text-sm ${isActive ? 'text-zinc-600' : 'text-zinc-400'}`}>{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PHASE 2: ASSESSMENT BREAKDOWN CARD */}
      {assessmentBreakdown && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div
            className="flex cursor-pointer items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-4 sm:cursor-default"
            onClick={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
          >
            <div>
              <h3 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
                Fee assessment breakdown
              </h3>
              <p className="mt-1.5 text-xs text-zinc-500">
                Assessed {formatDate(assessmentBreakdown.assessed_at)}
              </p>
            </div>
            <div className="text-zinc-400 sm:hidden">
              {isBreakdownExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>

          <div className={`p-6 ${isBreakdownExpanded ? 'block' : 'hidden sm:block'}`}>
            <div className="space-y-4">
              {assessmentBreakdown.line_items.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900">{item.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                      {item.computation}
                    </p>
                  </div>
                  <div className="pt-0.5 font-mono text-sm whitespace-nowrap text-zinc-900 tabular-nums">
                    ₱ {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-zinc-900 pt-4">
              <p className="font-mono text-[10px] tracking-[0.16em] text-zinc-900 uppercase">Total amount due</p>
              <p className="font-mono text-lg font-semibold text-zinc-900 tabular-nums">
                ₱ {assessmentBreakdown.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>

            {assessmentBreakdown.special_notes && assessmentBreakdown.special_notes.length > 0 && (
              <div className="mt-6 flex items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-zinc-500" />
                <div className="space-y-2">
                  {assessmentBreakdown.special_notes.map((note, idx) => (
                    <p key={idx} className="text-xs leading-relaxed text-zinc-600">{note}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-zinc-200 pt-6">
               <Button variant="secondary" fullWidth leftIcon={<Download size={15} />} onClick={() => { const token = useAuthStore.getState().token; window.open(`${API_BASE_URL}/api/documents/top/${appId}?token=${token}`, '_blank'); }}>
                 Download Tax Order of Payment
               </Button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 5: PAYMENT OPTIONS CARD */}
      {currentStatus === STATUSES.FOR_PAYMENT && (
        <div className="rounded-lg bg-zinc-900 p-6 text-white animate-in slide-in-from-bottom-4">
          <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-400 uppercase">
                Action required
              </span>
              <h3 className="mt-2 text-lg font-semibold tracking-tight">Payment required</h3>
              <p className="mt-1 text-sm text-zinc-400">Settle your dues to finalize your permit.</p>
            </div>
            <div className="text-center sm:text-right">
              <p className="font-mono text-[10px] tracking-[0.16em] text-zinc-400 uppercase">Total amount due</p>
              <p className="mt-1.5 font-mono text-3xl font-semibold tabular-nums">
                ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Phase 4: Payment Breakdown */}
          <div className="mb-6">
            <button
              onClick={() => setIsPaymentBreakdownExpanded(!isPaymentBreakdownExpanded)}
              className="flex w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-800 px-4 py-3 text-white transition-colors duration-200 hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 focus-visible:outline-none motion-reduce:transition-none"
            >
              <span className="font-mono text-[10px] tracking-[0.12em] uppercase">
                {isPaymentBreakdownExpanded ? 'Hide fee breakdown' : 'View fee breakdown'}
              </span>
              {isPaymentBreakdownExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            <div 
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isPaymentBreakdownExpanded ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="rounded-md border border-zinc-700 bg-zinc-800 p-4">
                {isBreakdownLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-zinc-400" />
                  </div>
                ) : !assessmentBreakdown ? (
                  <p className="py-2 text-center text-sm text-zinc-400">Fee details unavailable</p>
                ) : !assessmentBreakdown.line_items || assessmentBreakdown.line_items.length === 0 ? (
                  <p className="py-2 text-center text-sm text-zinc-400">No fee items found.</p>
                ) : (
                  <div className="space-y-3">
                    {assessmentBreakdown.line_items.map((item, idx) => {
                      let displayName = item.name;
                      if (item.name === "Mayor's Permit Fee" && item.computation) {
                        const parts = item.computation.split('—');
                        if (parts.length > 1) {
                            const businessType = parts[1].split('(')[0].trim();
                            if (businessType) displayName = `${item.name} (${businessType})`;
                        } else {
                            const withoutRc = item.computation.split('(Revenue Code:')[0].trim();
                            if (withoutRc) displayName = `${item.name} (${withoutRc})`;
                        }
                      }
                      
                      return (
                        <div key={idx} className="flex items-start justify-between gap-4 border-b border-zinc-700 pb-3 last:border-0 last:pb-0">
                          <p className="flex-1 text-sm font-medium text-white">{displayName}</p>
                          <p className="pt-0.5 font-mono text-sm whitespace-nowrap text-zinc-300 tabular-nums">
                            ₱ {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      );
                    })}
                    <div className="mt-2 flex items-center justify-between border-t border-zinc-600 pt-3">
                      <p className="font-mono text-[10px] tracking-[0.16em] text-white uppercase">Total</p>
                      <p className="font-mono font-semibold text-white tabular-nums">
                        ₱ {Number(assessmentBreakdown.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col rounded-md border border-zinc-700 bg-zinc-800 p-4">
              <div className="mb-2 flex items-center gap-2.5">
                <Banknote size={17} className="text-zinc-400" />
                <h4 className="text-sm font-semibold">Over-the-counter</h4>
              </div>
              <p className="flex-1 text-xs leading-relaxed text-zinc-400">Pay at the Municipal Treasury using your TOP.</p>
              <button
                onClick={() => { const token = useAuthStore.getState().token; window.open(`${API_BASE_URL}/api/documents/top/${appId}?token=${token}`, '_blank'); }}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors duration-200 hover:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 focus-visible:outline-none motion-reduce:transition-none"
              >
                <Download size={15} /> Download TOP
              </button>
            </div>

            <div className="flex flex-col rounded-md border border-zinc-700 bg-zinc-800 p-4">
              <div className="mb-2 flex items-center gap-2.5">
                <Globe size={17} className="text-zinc-400" />
                <h4 className="text-sm font-semibold">Pay online</h4>
              </div>
              <p className="flex-1 text-xs leading-relaxed text-zinc-400">Instant via GCash, Maya, or card (PayMongo).</p>
              <button
                onClick={handlePayOnline}
                disabled={isActionLoading}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors duration-200 hover:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
              >
                {isActionLoading && <Loader2 size={15} className="animate-spin" />}
                Pay via GCash / card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 5: POLLING UI FOR ONLINE PAYMENT */}
      {currentStatus === STATUSES.PAYMENT_PROCESSING && (
        <div className="flex flex-col items-center rounded-lg border border-zinc-200 bg-white p-10 text-center">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-900" />
          </div>
          <h3 className="text-base font-semibold tracking-tight text-zinc-900">Confirming your payment</h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-600">
            We are waiting for PayMongo to confirm your transaction. This page will update automatically once confirmed.
          </p>
          <div className="mt-6 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-zinc-900 motion-reduce:animate-none"></span>
            Verification in progress
          </div>

          <div className="mt-6 w-full border-t border-zinc-200 pt-5">
            <p className="mb-3 text-xs text-zinc-500">Taking too long, or cancelled the window?</p>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePayOnline}
              isLoading={isActionLoading}
            >
              Retry online payment
            </Button>
          </div>
        </div>
      )}

      {/* PAID / COMPLETED SECTION — Download buttons */}
      {(currentStatus === STATUSES.PAID || currentStatus === STATUSES.COMPLETED) && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white">
              <Award size={16} className="text-zinc-600" />
            </div>
            <div>
              <h3 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">Permit ready</h3>
              <p className="mt-1 text-xs text-zinc-500">Download your official documents below.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 p-5 sm:flex-row">
            <button
              onClick={() => { const token = useAuthStore.getState().token; window.open(`${API_BASE_URL}/api/documents/permit/${appId}?token=${token}`, '_blank'); }}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
            >
              <Award size={16} /> Business permit <Download size={14} className="ml-auto opacity-60" />
            </button>
            <button
              onClick={() => { const token = useAuthStore.getState().token; window.open(`${API_BASE_URL}/api/documents/eresibo/${appId}?token=${token}`, '_blank'); }}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition-colors duration-200 hover:border-zinc-400 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
            >
              <Receipt size={16} /> E-Resibo <Download size={14} className="ml-auto opacity-40" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default StatusTracker;