import { useState, useEffect, useRef } from 'react';
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
  Banknote,
  ChevronDown,
  ChevronUp,
  Upload,
  ExternalLink,
  Building2,
  Smartphone
} from 'lucide-react';
import StatusBadge from '../../components/shared/StatusBadge';
import ProcedureGuide from '../../components/shared/ProcedureGuide';
import { ROUTES, STATUSES, API_BASE_URL, API_ENDPOINTS } from '../../utils/constants';
import apiClient from '../../utils/apiClient';
import useAuthStore from '../../store/authStore';
import Button from '../../components/ui/Button';
import useApplicationStatus from '../../hooks/useApplicationStatus';
import CorrectionRequestModal from '../../components/shared/CorrectionRequestModal';

// Timeline definition updated for Phase 5 Payment Modernization
const TIMELINE_STEPS = [
  { status: 'Pending', label: 'Application Submitted', desc: 'Awaiting BPLO review.' },
  { status: 'Under Review', label: 'Under Review', desc: 'BPLO is checking your documents.' },
  { status: 'Verified', label: 'Documents Verified', desc: 'All requirements are complete.' },
  { status: 'For Assessment', label: 'Routing to Treasury', desc: 'Preparing fee assessment.' },
  { status: 'Assessed', label: 'Fees Assessed', desc: 'Tax Order of Payment (TOP) generated.' },
  { status: 'For Payment', label: 'Ready for Payment', desc: 'Pay Over-the-Counter or submit Bank/GCash proof.' },
  { status: 'PaymentVerificationPending', label: 'Verifying Payment Proof', desc: 'Municipal Treasury is verifying your deposit slip.' },
  { status: 'Paid', label: 'Payment Recorded', desc: 'Official Receipt issued.' },
  { status: 'Completed', label: 'Permit Issued', desc: 'Business permit and E-Resibo are ready.' }
];

const StatusTracker = () => {
  const [searchParams] = useSearchParams();
  const appId = searchParams.get('id');

  // Custom Hook (Handles data, status, loading, error, and background POLLING)
  const { data: applicationData, status: currentStatus, isLoading, error, refresh } = useApplicationStatus(appId);
  
  const [assessmentBreakdown, setAssessmentBreakdown] = useState(null);
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);
  const [isPaymentBreakdownExpanded, setIsPaymentBreakdownExpanded] = useState(false);

  // Correction Request State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionRequests, setCorrectionRequests] = useState([]);
  const [isCorrectionsLoading, setIsCorrectionsLoading] = useState(false);

  // Phase 5: Proof of Payment Form State
  const [paymentChannel, setPaymentChannel] = useState('GCash'); // 'GCash' | 'Bank Transfer'
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [proofFile, setProofFile] = useState(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [proofError, setProofError] = useState('');
  const [proofSuccess, setProofSuccess] = useState('');
  
  // Phase 5: Submitted Proof Metadata State (when status is PaymentVerificationPending)
  const [submittedProof, setSubmittedProof] = useState(null);
  const [isProofLoading, setIsProofLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Correction Eligible Statuses
  const CORRECTION_ELIGIBLE_STATUSES = [
    STATUSES.VERIFIED, STATUSES.FOR_ASSESSMENT, STATUSES.ASSESSED, 
    STATUSES.FOR_PAYMENT, STATUSES.PAYMENT_VERIFICATION_PENDING, STATUSES.PAYMENT_PROCESSING, 
    STATUSES.PAID, STATUSES.COMPLETED
  ];
  const isEligibleForCorrection = CORRECTION_ELIGIBLE_STATUSES.includes(currentStatus);

  // Fetch assessment breakdown for payable or completed stages
  useEffect(() => {
    if (appId && currentStatus) {
      const breakdownStatuses = [
        STATUSES.ASSESSED,
        STATUSES.FOR_PAYMENT,
        STATUSES.PAYMENT_VERIFICATION_PENDING,
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
  }, [appId, currentStatus, assessmentBreakdown, isBreakdownLoading]);

  // Fetch submitted payment proof metadata when pending verification
  useEffect(() => {
    if (appId && (currentStatus === STATUSES.PAYMENT_VERIFICATION_PENDING || currentStatus === STATUSES.PAYMENT_PROCESSING)) {
      const fetchProofData = async () => {
        try {
          setIsProofLoading(true);
          const res = await apiClient.get(`/api/treasury/payments/${appId}/proof`);
          if (res.success && res.data) {
            setSubmittedProof(res.data);
          }
        } catch {
          // No proof uploaded yet or not available
        } finally {
          setIsProofLoading(false);
        }
      };
      fetchProofData();
    }
  }, [appId, currentStatus]);

  // Fetch Correction Requests
  useEffect(() => {
    if (appId) {
      const fetchCorrections = async () => {
        try {
          setIsCorrectionsLoading(true);
          const res = await apiClient.get(API_ENDPOINTS.CORRECTIONS_MY);
          if (res.success) {
            const appCorrections = res.data.filter(req => req.application_no === appId);
            setCorrectionRequests(appCorrections);
          }
        } catch (err) {
          console.error('Failed to fetch correction requests', err);
        } finally {
          setIsCorrectionsLoading(false);
        }
      };
      fetchCorrections();
    }
  }, [appId]);

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Intl.DateTimeFormat('en-PH', { 
      month: 'short', day: 'numeric', year: 'numeric', 
      hour: 'numeric', minute: '2-digit' 
    }).format(new Date(isoString));
  };

  // Phase 5: Proof File Drop / Change Handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProofError('');
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.type)) {
      setProofError('Only JPG, PNG, and PDF files are accepted.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProofError('File size exceeds 5MB limit. Please compress your file.');
      return;
    }

    setProofFile(file);
  };

  // Phase 5: Submit Bank Transfer / GCash Proof Handler
  const handleSubmitProof = async (e) => {
    e.preventDefault();
    setProofError('');
    setProofSuccess('');

    if (!referenceNo.trim()) {
      setProofError('Please enter the transaction reference number.');
      return;
    }

    if (!paymentDate) {
      setProofError('Please select the payment date.');
      return;
    }

    if (!proofFile) {
      setProofError('Please upload your deposit slip or transaction receipt.');
      return;
    }

    try {
      setIsSubmittingProof(true);

      // 1. Request presigned upload URL from server
      const uploadUrlRes = await apiClient.post('/api/treasury/payments/proof-upload-url', {
        fileName: proofFile.name,
        fileType: proofFile.type
      });

      if (!uploadUrlRes.success || !uploadUrlRes.data?.uploadUrl) {
        throw new Error(uploadUrlRes.message || 'Unable to generate secure upload URL.');
      }

      const { uploadUrl, filePath } = uploadUrlRes.data;

      // 2. Direct upload to Supabase Storage private bucket
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': proofFile.type
        },
        body: proofFile
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload proof document to storage. Please try again.');
      }

      // 3. Submit proof metadata to Treasury endpoint
      const submitRes = await apiClient.post('/api/treasury/payments/proof', {
        application_no: appId,
        payment_channel: paymentChannel,
        payment_reference_no: referenceNo.trim(),
        payment_date: paymentDate,
        proof_file_path: filePath
      });

      if (submitRes.success) {
        setProofSuccess('Deposit slip submitted successfully! The Municipal Treasury is now verifying your payment.');
        setProofFile(null);
        setReferenceNo('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (refresh) refresh();
      } else {
        throw new Error(submitRes.message || 'Failed to submit proof of payment.');
      }
    } catch (err) {
      console.error('[StatusTracker] Proof submission failed:', err);
      setProofError(err.message || 'An error occurred while submitting your payment proof.');
    } finally {
      setIsSubmittingProof(false);
    }
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

  // Derive Current Step Index from Timeline Steps
  const getCurrentStepIndex = () => {
    if (currentStatus === 'Returned') return 0;
    if (currentStatus === 'PaymentProcessing') return 6; // Aligned with PaymentVerificationPending
    const idx = TIMELINE_STEPS.findIndex((s) => s.status === currentStatus);
    return idx === -1 ? 0 : idx;
  };

  const currentStepIdx = getCurrentStepIndex();

  const business = applicationData.businesses || {};
  const totalAmount = Number(
    applicationData.assessments?.[0]?.total_amount || 
    assessmentBreakdown?.total_amount || 
    0
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-16">
      {/* HEADER SECTION */}
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
              Application tracker
            </span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
              {business.business_name || 'Business Permit Application'}
            </h1>
            <p className="mt-1 font-mono text-xs text-zinc-500">{applicationData.application_no}</p>
          </div>
          <div className="flex items-center gap-3">
            {isEligibleForCorrection && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCorrectionModalOpen(true)}
                isLoading={isCorrectionsLoading}
                className="text-xs"
              >
                Request Correction
              </Button>
            )}
            <StatusBadge status={currentStatus} size="md" />
          </div>
        </div>
      </div>

      {/* PROCEDURE GUIDE (Collapsible Liliw Flow) */}
      <ProcedureGuide currentStatus={currentStatus} />

      {/* TIMELINE PROGRESS SECTION */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-4">
          <h2 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">Application progress</h2>
        </div>
        <div className="p-6">
          <div className="relative pl-6">
            <div className="absolute top-3 bottom-3 left-[11px] w-px bg-zinc-200" />
            <div className="flex flex-col gap-6">
              {TIMELINE_STEPS.map((step, idx) => {
                const isPassed = idx < currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div key={step.status} className="relative flex items-start gap-4">
                    <div className="relative z-10 -ml-6 flex h-6 w-6 items-center justify-center rounded-full bg-white">
                      {isPassed ? (
                        <CheckCircle2 size={18} className="text-zinc-900" />
                      ) : isCurrent ? (
                        <Circle size={18} className="fill-zinc-900 text-zinc-900" />
                      ) : (
                        <Circle size={18} className="text-zinc-300" />
                      )}
                    </div>
                    <div className="pt-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-semibold tracking-tight ${isCurrent ? 'text-zinc-900' : isPassed ? 'text-zinc-700' : 'text-zinc-400'}`}>
                          {step.label}
                        </h3>
                        {isCurrent && (
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-zinc-600 uppercase">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RETURNED ALERT (If returned by BPLO) */}
      {currentStatus === STATUSES.RETURNED && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-zinc-900 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-zinc-600" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold tracking-tight">Application Returned for Correction</h3>
              <p className="mt-1 text-xs text-zinc-600 leading-relaxed">
                The BPLO has reviewed your application and noted items that need your attention.
              </p>
              {applicationData.remarks && (
                <div className="mt-3 rounded border border-zinc-200 bg-white p-3">
                  <span className="font-mono text-[10px] uppercase text-zinc-400 tracking-wider">Remarks from BPLO</span>
                  <p className="mt-1 text-xs text-zinc-700 italic">"{applicationData.remarks}"</p>
                </div>
              )}
              <div className="mt-4">
                <Link
                  to={`${ROUTES.APPLICANT_UAF}?edit=${appId}`}
                  className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-zinc-800 focus-visible:outline-none"
                >
                  Edit & Resubmit Application
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 3 & 5: DUAL PAYMENT CHANNELS CARD (WHEN STATUS IS 'For Payment') */}
      {currentStatus === STATUSES.FOR_PAYMENT && (
        <div className="rounded-lg bg-zinc-900 p-6 text-white shadow-sm animate-in slide-in-from-bottom-4">
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-400 uppercase">
                Action required
              </span>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">Payment Required</h3>
              <p className="mt-1 text-xs text-zinc-400">
                Settle your assessed municipal fees via Over-the-Counter or Official Bank/GCash transfer.
              </p>
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-800/80 px-4 py-3 text-left sm:text-right">
              <p className="font-mono text-[10px] tracking-[0.16em] text-zinc-400 uppercase">Total amount due</p>
              <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
                ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Collapsible Fee Breakdown Accordion */}
          <div className="mb-6">
            <button
              onClick={() => setIsPaymentBreakdownExpanded(!isPaymentBreakdownExpanded)}
              className="flex w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-800/90 px-4 py-2.5 text-xs text-white transition-colors duration-200 hover:bg-zinc-700 focus-visible:outline-none"
            >
              <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-zinc-300">
                {isPaymentBreakdownExpanded ? 'Hide itemized fee breakdown' : 'View itemized fee breakdown (Tax Order of Payment)'}
              </span>
              {isPaymentBreakdownExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            
            <div 
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isPaymentBreakdownExpanded ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="rounded-md border border-zinc-700 bg-zinc-800 p-4">
                {isBreakdownLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={18} className="animate-spin text-zinc-400" />
                  </div>
                ) : !assessmentBreakdown ? (
                  <p className="py-2 text-center text-xs text-zinc-400">Fee breakdown details loading…</p>
                ) : !assessmentBreakdown.line_items || assessmentBreakdown.line_items.length === 0 ? (
                  <p className="py-2 text-center text-xs text-zinc-400">No fee items recorded.</p>
                ) : (
                  <div className="space-y-2.5">
                    {assessmentBreakdown.line_items.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-4 border-b border-zinc-700/80 pb-2.5 last:border-0 last:pb-0">
                        <p className="flex-1 text-xs text-zinc-200">{item.name}</p>
                        <p className="font-mono text-xs whitespace-nowrap text-zinc-300 tabular-nums">
                          ₱ {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                    <div className="mt-3 flex items-center justify-between border-t border-zinc-600 pt-3">
                      <p className="font-mono text-[10px] tracking-[0.16em] text-white uppercase font-medium">Total Assessed</p>
                      <p className="font-mono text-sm font-bold text-white tabular-nums">
                        ₱ {Number(assessmentBreakdown.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DUAL PAYMENT METHOD SECTIONS */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* CHANNEL 1: OVER-THE-COUNTER (CASHIER POS) */}
            <div className="flex flex-col justify-between rounded-lg border border-zinc-700 bg-zinc-800/80 p-5">
              <div>
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-700 text-zinc-200">
                    <Banknote size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Channel 1: Over-the-Counter</h4>
                    <p className="text-[11px] text-zinc-400">Cashier POS at Municipal Hall</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-300">
                  <p>Pay with <strong>Cash</strong> or <strong>Manager's Check</strong> at the Treasury Window:</p>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                    <li>Ground Floor, Liliw Municipal Hall</li>
                    <li>Office hours: Monday to Friday, 8:00 AM – 5:00 PM</li>
                    <li>Present your printed Tax Order of Payment (TOP)</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 border-t border-zinc-700 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    const token = useAuthStore.getState().token;
                    window.open(`${API_BASE_URL}/api/documents/top/${appId}?token=${token}`, '_blank');
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-xs font-semibold text-zinc-900 transition-colors duration-200 hover:bg-zinc-200 focus-visible:outline-none"
                >
                  <Download size={15} /> Download Tax Order of Payment (TOP)
                </button>
              </div>
            </div>

            {/* CHANNEL 2: BANK TRANSFER / GCASH PROOF SUBMISSION */}
            <div className="flex flex-col justify-between rounded-lg border border-zinc-700 bg-zinc-800/80 p-5">
              <div>
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-700 text-zinc-200">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Channel 2: Bank / GCash Transfer</h4>
                    <p className="text-[11px] text-zinc-400">Electronic deposit with proof upload</p>
                  </div>
                </div>

                {/* Municipal Treasury Official Account Details */}
                <div className="mt-3 rounded-md border border-zinc-700 bg-zinc-900/90 p-3 space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <Building2 size={14} className="mt-0.5 shrink-0 text-zinc-400" />
                    <div>
                      <p className="font-semibold text-zinc-200">Land Bank of the Philippines</p>
                      <p className="font-mono text-[11px] text-zinc-400">Account No: <span className="text-white font-medium">1234-5678-90</span></p>
                      <p className="text-[10px] text-zinc-400">Account Name: Municipality of Liliw</p>
                    </div>
                  </div>
                  <div className="border-t border-zinc-800 pt-2 flex items-start gap-2">
                    <Smartphone size={14} className="mt-0.5 shrink-0 text-zinc-400" />
                    <div>
                      <p className="font-semibold text-zinc-200">GCash Merchant Transfer</p>
                      <p className="font-mono text-[11px] text-zinc-400">GCash No: <span className="text-white font-medium">0917-123-4567</span></p>
                      <p className="text-[10px] text-zinc-400">Account Name: Municipality of Liliw Treasury</p>
                    </div>
                  </div>
                </div>

                {/* Upload Form */}
                <form onSubmit={handleSubmitProof} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300">Payment Channel</label>
                    <div className="mt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentChannel('GCash')}
                        className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                          paymentChannel === 'GCash'
                            ? 'border-white bg-white text-zinc-900 font-semibold'
                            : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        GCash
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentChannel('Bank Transfer')}
                        className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                          paymentChannel === 'Bank Transfer'
                            ? 'border-white bg-white text-zinc-900 font-semibold'
                            : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        Bank Transfer
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300">
                      Transaction Reference Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      placeholder="e.g. GCash Ref No or Bank Trace Number"
                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300">
                      Payment Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-zinc-400 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300">
                      Deposit Slip / Receipt Photo or PDF <span className="text-red-400">*</span>
                    </label>
                    <div className="mt-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="hidden"
                        id="proof-upload-input"
                      />
                      <label
                        htmlFor="proof-upload-input"
                        className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-zinc-700 bg-zinc-900/60 p-3 text-center transition-colors hover:border-zinc-500 hover:bg-zinc-900"
                      >
                        <Upload size={16} className="text-zinc-400" />
                        <span className="mt-1 text-[11px] text-zinc-300">
                          {proofFile ? proofFile.name : 'Click to browse or drop receipt'}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {proofFile
                            ? `${(proofFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace`
                            : 'PDF, JPG, or PNG up to 5MB'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {proofError && (
                    <div className="rounded-md border border-red-900/50 bg-red-950/40 p-2 text-xs text-red-300">
                      {proofError}
                    </div>
                  )}

                  {proofSuccess && (
                    <div className="rounded-md border border-emerald-900/50 bg-emerald-950/40 p-2 text-xs text-emerald-300">
                      {proofSuccess}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingProof}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-xs font-semibold text-zinc-900 transition-colors duration-200 hover:bg-zinc-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmittingProof && <Loader2 size={14} className="animate-spin text-zinc-900" />}
                      Submit Proof of Payment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 5: PAYMENT VERIFICATION PENDING STATE CARD */}
      {(currentStatus === STATUSES.PAYMENT_VERIFICATION_PENDING || currentStatus === STATUSES.PAYMENT_PROCESSING) && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-zinc-200 bg-amber-50/50 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-amber-200 bg-amber-100 text-amber-800">
              <Clock size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-[10px] tracking-[0.16em] text-amber-900 uppercase font-semibold">
                  Payment Verification In Progress
                </h3>
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                  Treasury Review
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-600">
                Your deposit slip has been submitted and is currently being verified by the Municipal Treasury.
              </p>
            </div>
          </div>

          <div className="p-6">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider font-mono">
                  Submitted Payment Proof Details
                </h4>
                {isProofLoading && <Loader2 size={14} className="animate-spin text-zinc-400" />}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-zinc-500">Payment Channel:</span>
                  <p className="font-medium text-zinc-900">
                    {submittedProof?.transaction?.tendered_type || 'GCash / Bank Transfer'}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500">Reference Number:</span>
                  <p className="font-mono font-medium text-zinc-900">
                    {submittedProof?.transaction?.payment_reference_no || 'Recorded with Treasury'}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500">Payment Date:</span>
                  <p className="font-medium text-zinc-900">
                    {submittedProof?.transaction?.payment_date || 'Pending verification'}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500">Amount Due / Assessed:</span>
                  <p className="font-mono font-semibold text-zinc-900">
                    ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {submittedProof?.url && (
                <div className="mt-4 border-t border-zinc-200 pt-3">
                  <a
                    href={submittedProof.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-900 hover:underline"
                  >
                    <ExternalLink size={14} /> View uploaded deposit slip / receipt
                  </a>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-100 pt-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                </span>
                <span>Auto-refreshing status. Once confirmed, your permit unlocks instantly.</span>
              </div>
              <button
                type="button"
                onClick={() => { if (refresh) refresh(); }}
                className="text-xs font-medium text-zinc-700 hover:text-zinc-900 underline"
              >
                Refresh now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAID / COMPLETED SECTION — Official Permit & E-Resibo Ready */}
      {(currentStatus === STATUSES.PAID || currentStatus === STATUSES.COMPLETED) && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center gap-3 border-b border-zinc-200 bg-emerald-50/60 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-emerald-200 bg-emerald-100 text-emerald-800">
              <Award size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-[10px] tracking-[0.16em] text-emerald-900 uppercase font-semibold">
                  Payment Confirmed & Permit Ready
                </h3>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                  Ready for Download
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-600">Download your official digital business documents below.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 p-5 sm:flex-row">
            <button
              onClick={() => {
                const token = useAuthStore.getState().token;
                window.open(`${API_BASE_URL}/api/documents/permit/${appId}?token=${token}`, '_blank');
              }}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-zinc-800 focus-visible:outline-none"
            >
              <Award size={16} /> Business Permit <Download size={14} className="ml-auto opacity-60" />
            </button>
            <button
              onClick={() => {
                const token = useAuthStore.getState().token;
                window.open(`${API_BASE_URL}/api/documents/eresibo/${appId}?token=${token}`, '_blank');
              }}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition-colors duration-200 hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline-none"
            >
              <Receipt size={16} /> E-Resibo (OR) <Download size={14} className="ml-auto opacity-40" />
            </button>
          </div>
        </div>
      )}

      {/* CORRECTION REQUESTS HISTORY */}
      {correctionRequests.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white">
              <AlertCircle size={16} className="text-zinc-600" />
            </div>
            <div>
              <h3 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">Correction Requests</h3>
              <p className="mt-1 text-xs text-zinc-500">History of data corrections you submitted.</p>
            </div>
          </div>
          
          <div className="divide-y divide-zinc-200">
            {correctionRequests.map((req) => (
              <div key={req.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-zinc-900 capitalize">{req.field_name.replace(/_/g, ' ')}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      req.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      req.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600">
                    <span className="line-through opacity-70">{req.old_value || '(empty)'}</span> 
                    <span className="mx-2 text-zinc-400">→</span> 
                    <span className="font-medium">{req.new_value}</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">Submitted {formatDate(req.created_at)}</p>
                  
                  {req.status === 'Rejected' && req.remarks && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-md">
                      <span className="font-semibold">Reason:</span> {req.remarks}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correction Request Modal */}
      <CorrectionRequestModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        applicationNo={appId}
        onSuccess={(newRequest) => {
          setCorrectionRequests([newRequest, ...correctionRequests]);
        }}
      />
    </div>
  );
};

export default StatusTracker;
