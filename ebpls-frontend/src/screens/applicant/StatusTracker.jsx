// src/screens/applicant/StatusTracker.jsx

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, AlertCircle, ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/shared/StatusBadge';
import { ROUTES } from '../../utils/constants';

// The strict linear path of the state machine (Draft is pre-submission)
const TIMELINE_STEPS = [
  { status: 'Pending', label: 'Application Submitted', desc: 'Awaiting BPLO review.' },
  { status: 'Under Review', label: 'Under Review', desc: 'BPLO is checking your documents.' },
  { status: 'Verified', label: 'Documents Verified', desc: 'All requirements are complete.' },
  { status: 'For Assessment', label: 'Routing to Treasury', desc: 'Preparing fee assessment.' },
  { status: 'Assessed', label: 'Fees Assessed', desc: 'Tax Order of Payment (TOP) generated.' },
  { status: 'For Payment', label: 'Ready for Payment', desc: 'Please pay Over-The-Counter (OTC).' },
  { status: 'Paid', label: 'Payment Recorded', desc: 'Official Receipt issued.' },
  { status: 'Completed', label: 'Permit Issued', desc: 'Business permit and E-Resibo are ready.' }
];

// Mock Data (Phase 3A)
const MOCK_DATA = {
  id: 'APP-2025-00001',
  business_name: 'Juan Dela Cruz Sari-Sari Store',
  current_status: 'Under Review', 
  // Change to 'Returned' to test the edge case UI:
  // current_status: 'Returned', 
  // return_remarks: 'Missing DTI Registration. Please upload a clear copy.',
  submitted_at: '2025-01-15T08:30:00Z',
  history: [
    { status: 'Pending', timestamp: '2025-01-15T08:30:00Z' },
    { status: 'Under Review', timestamp: '2025-01-16T10:15:00Z' },
  ]
};

const StatusTracker = () => {
  const [searchParams] = useSearchParams();
  const appId = searchParams.get('id') || MOCK_DATA.id;

  // Calculate timeline progress
  const isReturned = MOCK_DATA.current_status === 'Returned';
  const currentStepIndex = TIMELINE_STEPS.findIndex(s => s.status === MOCK_DATA.current_status);
  
  // If Returned, it essentially halts at the 'Under Review' phase visually
  const activeIndex = isReturned ? 1 : currentStepIndex;

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Intl.DateTimeFormat('en-PH', { 
      month: 'short', day: 'numeric', year: 'numeric', 
      hour: 'numeric', minute: '2-digit' 
    }).format(new Date(isoString));
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      
      {/* Navigation & Header */}
      <div>
        <Link 
          to={ROUTES?.APPLICANT_DASHBOARD || '/applicant/dashboard'}
          className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--color-text-muted,0,0%,40%))] hover:text-accent transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-[hsl(var(--color-text,0,0%,10%))]">Track Application</h1>
      </div>

      {/* Application Overview Card */}
      <div className="bg-[hsl(var(--color-surface,0,0%,100%))] border border-[hsl(var(--color-border,0,0%,90%))] rounded-xl shadow-[var(--shadow-sm,0_1px_2px_0_rgba(0,0,0,0.05))] overflow-hidden">
        <div className="bg-[hsl(var(--color-surface-raised,0,0%,96%))] px-5 py-4 border-b border-[hsl(var(--color-border,0,0%,90%))] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white border border-[hsl(var(--color-border,0,0%,90%))] rounded-lg">
              <FileText size={20} className="text-[hsl(var(--color-text-muted,0,0%,40%))]" />
            </div>
            <div>
              <p className="font-bold text-[hsl(var(--color-text,0,0%,10%))]">{MOCK_DATA.business_name}</p>
              <p className="text-xs font-mono text-[hsl(var(--color-text-muted,0,0%,40%))] mt-0.5">Ref: {appId}</p>
            </div>
          </div>
          <div className="shrink-0 self-start sm:self-auto">
            <StatusBadge status={MOCK_DATA.current_status} size="md" />
          </div>
        </div>

        {/* Timeline Area */}
        <div className="p-6 sm:p-8">
          
          {/* Returned Edge Case Banner */}
          {isReturned && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-800">Application Returned</h4>
                <p className="text-sm text-red-700 mt-1">{MOCK_DATA.return_remarks}</p>
                <button className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors shadow-sm">
                  Update Application
                </button>
              </div>
            </div>
          )}

          <div className="relative">
            {TIMELINE_STEPS.map((step, index) => {
              const isPast = activeIndex > index && !isReturned;
              const isActive = activeIndex === index && !isReturned;
              const isFuture = activeIndex < index || (isReturned && index > 1);
              
              // Find history record if completed
              const historyRecord = MOCK_DATA.history.find(h => h.status === step.status);

              return (
                <div key={step.status} className="flex gap-4 sm:gap-6 relative pb-8 last:pb-0">
                  
                  {/* Vertical Line Connector */}
                  {index !== TIMELINE_STEPS.length - 1 && (
                    <div 
                      className={`absolute top-8 left-[11px] sm:left-[15px] bottom-0 w-[2px] -ml-px ${
                        isPast ? 'bg-emerald-500' : 'bg-[hsl(var(--color-border,0,0%,90%))]'
                      }`}
                    />
                  )}

                  {/* Icon Node */}
                  <div className="relative z-10 shrink-0 mt-1">
                    {isPast ? (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200">
                        <CheckCircle2 size={16} strokeWidth={2.5} />
                      </div>
                    ) : isActive ? (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-accent text-white flex items-center justify-center shadow-md shadow-accent/20">
                        <Clock size={16} strokeWidth={2.5} />
                      </div>
                    ) : isReturned && index === 1 ? (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center border border-red-200">
                        <AlertCircle size={16} strokeWidth={2.5} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[hsl(var(--color-surface-raised,0,0%,96%))] text-[hsl(var(--color-border,0,0%,80%))] flex items-center justify-center border border-[hsl(var(--color-border,0,0%,90%))]">
                        <Circle size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1 sm:pt-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                      <p className={`text-sm sm:text-base font-semibold ${
                        isPast || isActive ? 'text-[hsl(var(--color-text,0,0%,10%))]' : 'text-[hsl(var(--color-text-muted,0,0%,50%))]'
                      }`}>
                        {step.label}
                      </p>
                      {historyRecord && (
                        <p className="text-[10px] sm:text-xs font-medium text-[hsl(var(--color-text-muted,0,0%,40%))] shrink-0">
                          {formatDate(historyRecord.timestamp)}
                        </p>
                      )}
                    </div>
                    <p className={`text-xs sm:text-sm mt-1 ${
                      isActive ? 'text-[hsl(var(--color-text-muted,0,0%,30%))]' : 'text-[hsl(var(--color-text-muted,0,0%,50%))]'
                    }`}>
                      {step.desc}
                    </p>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
};

export default StatusTracker;