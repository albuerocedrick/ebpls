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
  Banknote
} from 'lucide-react';
import StatusBadge from '../../components/shared/StatusBadge';
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
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-10 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>
          <h3 className="text-lg font-bold text-purple-900 tracking-tight">Confirming Your Payment</h3>
          <p className="text-sm text-purple-700 mt-2 max-w-sm">We are waiting for PayMongo to confirm your transaction. This page will update automatically once confirmed.</p>
          <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-4"><span className="w-2 h-2 bg-purple-400 rounded-full animate-ping"></span> Live Verification in progress</div>
          
          <div className="pt-4 border-t border-purple-200 w-full mt-4">
            <p className="text-xs text-purple-600 mb-3">Taking too long or cancelled the window?</p>
            <Button 
              variant="secondary" 
              size="sm"
              className="!bg-purple-600 !text-white !border-none hover:!bg-purple-700"
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
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-emerald-200 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg"><Award size={20} /></div>
            <div>
              <h3 className="text-sm font-bold text-emerald-900">Your Permit is Ready</h3>
              <p className="text-xs text-emerald-700 mt-0.5">Download your official documents below.</p>
            </div>
          </div>
          <div className="p-5 flex flex-col sm:flex-row gap-3">
            <button onClick={() => { const token = useAuthStore.getState().token; window.open(`${API_BASE_URL}/api/documents/permit/${appId}?token=${token}`, '_blank'); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"><Award size={18} /> Business Permit <Download size={16} className="ml-auto opacity-70" /></button>
            <button onClick={() => { const token = useAuthStore.getState().token; window.open(`${API_BASE_URL}/api/documents/eresibo/${appId}?token=${token}`, '_blank'); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-emerald-800 text-sm font-semibold rounded-lg border border-emerald-300 hover:bg-emerald-50 transition-colors cursor-pointer"><Receipt size={18} /> E-Resibo (Receipt) <Download size={16} className="ml-auto opacity-70" /></button>
          </div>
        </div>
      )}

    </div>
  );
};

export default StatusTracker;