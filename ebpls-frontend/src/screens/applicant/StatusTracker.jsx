import React, { useState, useEffect } from 'react';
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
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <div>
          <Link to={ROUTES.APPLICANT_DASHBOARD} className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-accent transition-colors mb-4">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Track Application</h1>
          <p className="text-sm text-gray-500 mt-1">Select an application to view its progress.</p>
        </div>

        {isListLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-accent" />
          </div>
        ) : appList.length === 0 ? (
          <div className="p-8 bg-gray-50 border border-gray-200 rounded-xl text-center">
            <FileText size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">No applications found</p>
            <p className="text-xs text-gray-400 mt-1">Submit an application first to track its status.</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            {appList.map((app) => (
              <Link
                key={app.application_no}
                to={`${ROUTES.APPLICANT_STATUS}?id=${app.application_no}`}
                className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText size={16} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{app.businesses?.business_name || 'Business'}</p>
                    <p className="text-xs text-gray-400 font-mono">{app.application_no}</p>
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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 size={40} className="animate-spin text-accent" />
        <p className="text-sm font-medium text-gray-500">Tracking application...</p>
      </div>
    );
  }

  if (error || !applicationData) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <Link to={ROUTES.APPLICANT_DASHBOARD} className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 mb-4"><ArrowLeft size={16} /> Back</Link>
        <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-center">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-red-800">Tracking Failed</p>
          <p className="text-sm text-red-700 mt-1">{error || 'Application not found.'}</p>
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
    <div className="flex flex-col gap-6 max-w-3xl mx-auto pb-20">
      
      <div>
        <Link to={ROUTES.APPLICANT_DASHBOARD} className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-accent transition-colors mb-4">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Track Application</h1>
      </div>

      <ProcedureGuide status={currentStatus} />

      {/* Main Status Timeline Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white border border-gray-200 rounded-lg">
              <FileText size={20} className="text-gray-400" />
            </div>
            <div>
              <p className="font-bold text-gray-900">{businessName}</p>
              <p className="text-xs font-mono text-gray-400 mt-0.5">Ref: {appId}</p>
            </div>
          </div>
          <StatusBadge status={currentStatus} size="md" />
        </div>

        <div className="p-6 sm:p-8">
          {/* Returned Edge Case Banner */}
          {isReturned && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-800">Application Returned</h4>
                <p className="text-sm text-red-700 mt-1">{return_remarks || 'Please check your requirements.'}</p>
                <Link to={`${ROUTES.APPLICANT_UAF}?edit=${appId}`} className="inline-block mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700">
                  Update Application
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
                <div key={step.status} className="flex gap-4 sm:gap-6 relative pb-8 last:pb-0">
                  {index !== TIMELINE_STEPS.length - 1 && (
                    <div className={`absolute top-8 left-[11px] sm:left-[15px] bottom-0 w-[2px] -ml-px ${isPast ? 'bg-emerald-500' : 'bg-gray-100'}`} />
                  )}

                  <div className="relative z-10 shrink-0 mt-1">
                    {isPast ? (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200">
                        <CheckCircle2 size={16} strokeWidth={2.5} />
                      </div>
                    ) : isActive ? (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-accent text-white flex items-center justify-center shadow-md shadow-accent/20">
                        <Clock size={16} strokeWidth={2.5} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-50 text-gray-200 flex items-center justify-center border border-gray-100">
                        <Circle size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pt-1 sm:pt-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                      <p className={`text-sm sm:text-base font-semibold ${isPast || isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {showTimestamp && <p className="text-[10px] sm:text-xs font-medium text-gray-400 shrink-0">{formatDate(last_updated)}</p>}
                    </div>
                    <p className={`text-xs sm:text-sm mt-1 ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PHASE 2: ASSESSMENT BREAKDOWN CARD */}
      {assessmentBreakdown && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div 
            className="px-6 py-4 bg-gray-50 flex items-center justify-between cursor-pointer sm:cursor-default"
            onClick={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
          >
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                📋 Fee Assessment Breakdown
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Assessed: {formatDate(assessmentBreakdown.assessed_at)}
              </p>
            </div>
            <div className="sm:hidden text-gray-400">
              {isBreakdownExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
          
          <div className={`p-6 border-t border-gray-200 ${isBreakdownExpanded ? 'block' : 'hidden sm:block'}`}>
            <div className="space-y-4">
              {assessmentBreakdown.line_items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      └─ {item.computation}
                    </p>
                  </div>
                  <div className="font-mono text-sm text-gray-900 whitespace-nowrap pt-0.5">
                    ₱ {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t-2 border-gray-900 flex justify-between items-center">
              <p className="font-bold text-gray-900">TOTAL AMOUNT DUE</p>
              <p className="text-lg font-black font-mono text-gray-900">
                ₱ {assessmentBreakdown.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>

            {assessmentBreakdown.special_notes && assessmentBreakdown.special_notes.length > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 rounded-lg flex items-start gap-3">
                <AlertCircle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  {assessmentBreakdown.special_notes.map((note, idx) => (
                    <p key={idx} className="text-xs text-yellow-800 leading-relaxed">{note}</p>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-6 pt-6 border-t border-gray-100">
               <Button variant="secondary" fullWidth className="!bg-white" onClick={() => { const token = useAuthStore.getState().token; window.open(`${API_BASE_URL}/api/documents/top/${appId}?token=${token}`, '_blank'); }}>
                 📄 Download Tax Order of Payment (TOP)
               </Button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 5: PAYMENT OPTIONS CARD */}
      {currentStatus === STATUSES.FOR_PAYMENT && (
        <div className="bg-blue-600 rounded-xl p-6 text-white shadow-xl shadow-blue-600/20 animate-in slide-in-from-bottom-4">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="text-lg font-bold">Payment Required</h3>
              <p className="text-blue-100 text-sm">Please settle your dues to finalize your permit.</p>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-[10px] uppercase font-bold text-blue-200 tracking-widest">Total Amount Due</p>
              <p className="text-3xl font-black font-mono">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Phase 4: Payment Breakdown */}
          <div className="mb-6">
            <button
              onClick={() => setIsPaymentBreakdownExpanded(!isPaymentBreakdownExpanded)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 flex items-center justify-between text-white hover:bg-white/20 transition-colors"
            >
              <span className="font-semibold text-sm">
                {isPaymentBreakdownExpanded ? 'Hide Fee Breakdown' : 'View Fee Breakdown'}
              </span>
              {isPaymentBreakdownExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            
            <div 
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isPaymentBreakdownExpanded ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="bg-blue-700/50 rounded-xl p-4 border border-white/10">
                {isBreakdownLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={24} className="text-blue-200 animate-spin" />
                  </div>
                ) : !assessmentBreakdown ? (
                  <p className="text-center text-blue-200 text-sm py-2">Fee details unavailable</p>
                ) : !assessmentBreakdown.line_items || assessmentBreakdown.line_items.length === 0 ? (
                  <p className="text-center text-blue-200 text-sm py-2">No fee items found.</p>
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
                        <div key={idx} className="flex justify-between items-start gap-4 pb-3 border-b border-white/20 last:border-0 last:pb-0">
                          <p className="text-sm text-white font-medium flex-1">{displayName}</p>
                          <p className="font-mono text-sm text-white/90 whitespace-nowrap pt-0.5">
                            ₱ {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      );
                    })}
                    <div className="pt-3 border-t border-white/40 flex justify-between items-center mt-2">
                      <p className="font-bold text-white text-sm">TOTAL</p>
                      <p className="font-mono font-bold text-white">
                        ₱ {Number(assessmentBreakdown.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white/10 border border-white/20 p-4 rounded-xl flex flex-col">
              <div className="flex items-center gap-3 mb-2"><Banknote size={20} className="text-blue-200" /><h4 className="font-bold">Over-the-Counter</h4></div>
              <p className="text-xs text-blue-100 flex-1">Pay at the Municipal Treasury using your TOP.</p>
              <Button variant="secondary" fullWidth className="mt-4 !bg-white !text-blue-600" onClick={() => { const token = useAuthStore.getState().token; window.open(`${API_BASE_URL}/api/documents/top/${appId}?token=${token}`, '_blank'); }}>Download TOP</Button>
            </div>

            <div className="bg-white/10 border border-white/20 p-4 rounded-xl flex flex-col">
              <div className="flex items-center gap-3 mb-2"><Globe size={20} className="text-blue-200" /><h4 className="font-bold">Pay Online</h4></div>
              <p className="text-xs text-blue-100 flex-1">Instant via GCash, Maya, or Card (PayMongo).</p>
              <Button variant="primary" fullWidth className="mt-4 !bg-emerald-500 !text-white" onClick={handlePayOnline} loading={isActionLoading}>Pay via GCash/Card</Button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 5: POLLING UI FOR ONLINE PAYMENT */}
      {currentStatus === STATUSES.PAYMENT_PROCESSING && (
        <div className="bg-white border border-gray-200 rounded-3xl p-10 text-center flex flex-col items-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
            <Loader2 className="w-7 h-7 text-gray-900 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Confirming Your Payment</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-sm leading-relaxed">We are waiting for PayMongo to confirm your transaction. This page will update automatically once confirmed.</p>
          <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <span className="w-2 h-2 bg-gray-900 rounded-full animate-ping"></span> Verification in progress
          </div>
          
          <div className="pt-5 border-t border-gray-100 w-full mt-6">
            <p className="text-xs text-gray-400 mb-3">Taking too long or cancelled the window?</p>
            <Button 
              variant="primary" 
              size="sm"
              onClick={handlePayOnline}
              loading={isActionLoading}
            >
              Retry Online Payment
            </Button>
          </div>
        </div>
      )}

      {/* PAID / COMPLETED SECTION — Download buttons */}
      {(currentStatus === STATUSES.PAID || currentStatus === STATUSES.COMPLETED) && (
        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Award size={18} className="text-gray-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Your Permit is Ready</h3>
              <p className="text-xs text-gray-500 mt-0.5">Download your official documents below.</p>
            </div>
          </div>
          <div className="p-5 flex flex-col sm:flex-row gap-3">
            <button onClick={() => { const token = useAuthStore.getState().token; window.open(`${API_BASE_URL}/api/documents/permit/${appId}?token=${token}`, '_blank'); }} className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-gray-900 text-white text-sm font-semibold rounded-2xl hover:bg-gray-800 transition-all shadow-sm cursor-pointer">
              <Award size={17} /> Business Permit <Download size={15} className="ml-auto opacity-60" />
            </button>
            <button onClick={() => { const token = useAuthStore.getState().token; window.open(`${API_BASE_URL}/api/documents/eresibo/${appId}?token=${token}`, '_blank'); }} className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-white text-gray-900 text-sm font-semibold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all cursor-pointer">
              <Receipt size={17} /> E-Resibo (Receipt) <Download size={15} className="ml-auto opacity-40" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default StatusTracker;