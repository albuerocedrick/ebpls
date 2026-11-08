/**
 * DataReviewPanel.jsx — BPLO Module (Phase 4)
 *
 * Shows the actual declared application data organized into four sections.
 * BPLO officer can inspect the values and mark each section as Verified or Discrepancy.
 * Calls PUT /api/bplo/applications/review/:app_no on submit.
 */

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Save, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import useUIStore, { TOAST_TYPE } from '../../store/UIStore';
import { apiClient } from '../../utils/apiClient';

// =========================================
// Section Definitions
// =========================================

const SECTIONS = [
  { id: 'business_details', label: 'Business Details' },
  { id: 'location', label: 'Location' },
  { id: 'business_activities', label: 'Business Activities' },
  { id: 'financial_declaration', label: 'Financial Declaration' },
];

// =========================================
// Helper: format currency
// =========================================
const formatCurrency = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// =========================================
// Data Row Component
// =========================================
const DataRow = ({ label, value }) => (
  <div className="flex justify-between items-start gap-2 py-1.5">
    <span className="text-xs text-[hsl(var(--color-text-muted))] shrink-0">{label}</span>
    <span className="text-xs font-medium text-[hsl(var(--color-text))] text-right break-words">
      {value || '—'}
    </span>
  </div>
);

// =========================================
// Component
// =========================================

const DataReviewPanel = ({ applicationNo, applicationData, initialData = [], onChange, disabled = false }) => {
  const addToast = useUIStore((s) => s.addToast);
  const [reviews, setReviews] = useState({});
  const [remarks, setRemarks] = useState({});
  const [prevInitialData, setPrevInitialData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  // Extract business and activities from applicationData
  const business = applicationData?.businesses
    ? (Array.isArray(applicationData.businesses) ? applicationData.businesses[0] : applicationData.businesses)
    : null;
  const activities = applicationData?.activities || [];
  const appType = applicationData?.application_types?.name || '—';

  const checkAllVerified = useCallback(
    (currentReviews) => {
      const allVerified = SECTIONS.every((sec) => currentReviews[sec.id] === 'Verified');
      if (onChange) onChange(allVerified);
    },
    [onChange]
  );

  // Synchronize state with initialData without triggering cascading effect renders
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    if (initialData && initialData.length > 0) {
      const initialReviews = {};
      const initialRemarks = {};
      initialData.forEach((item) => {
        initialReviews[item.section] = item.status;
        if (item.remarks) initialRemarks[item.section] = item.remarks;
      });
      setReviews(initialReviews);
      setRemarks(initialRemarks);
    }
  }

  useEffect(() => {
    checkAllVerified(reviews);
  }, [reviews, checkAllVerified]);

  const handleStatusChange = (sectionId, status) => {
    const newReviews = { ...reviews, [sectionId]: status };
    setReviews(newReviews);
    setIsSaved(false);
    if (status === 'Verified') {
      const newRemarks = { ...remarks };
      delete newRemarks[sectionId];
      setRemarks(newRemarks);
    }
  };

  const handleRemarksChange = (sectionId, value) => {
    setRemarks((prev) => ({ ...prev, [sectionId]: value }));
    setIsSaved(false);
  };

  const handleSave = async () => {
    const payload = [];
    for (const sec of SECTIONS) {
      const status = reviews[sec.id];
      if (!status) {
        addToast({ message: `Please review section: ${sec.label}`, type: TOAST_TYPE.WARNING });
        return;
      }
      if (status === 'Discrepancy' && (!remarks[sec.id] || remarks[sec.id].trim() === '')) {
        addToast({ message: `Remarks required for discrepancy in: ${sec.label}`, type: TOAST_TYPE.ERROR });
        return;
      }
      payload.push({ section: sec.id, status, remarks: remarks[sec.id]?.trim() || '' });
    }

    setIsSubmitting(true);
    try {
      await apiClient.put(`/api/bplo/applications/review/${applicationNo}`, payload);
      addToast({ message: 'Data review saved successfully.', type: TOAST_TYPE.SUCCESS });
      setIsSaved(true);
    } catch (err) {
      addToast({ message: err.message || 'Failed to save data review.', type: TOAST_TYPE.ERROR });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSection((prev) => (prev === sectionId ? null : sectionId));
  };

  // ─── Section Data Renderers ───────────────────────────────────
  const renderSectionData = (sectionId) => {
    switch (sectionId) {
      case 'business_details':
        return (
          <div className="divide-y divide-border/50">
            <DataRow label="Application Type" value={appType} />
            <DataRow label="Business Name" value={business?.business_name} />
            <DataRow label="Trade Name" value={business?.trade_name} />
            <DataRow label="Organization Type" value={business?.organization_types?.name} />
            <DataRow label="DTI/SEC/CDA Reg. No." value={business?.dti_sec_cda_reg_no} />
            <DataRow label="Franchise" value={business?.is_franchise ? `Yes — ${business?.franchisor_name || 'N/A'}` : 'No'} />
          </div>
        );
      case 'location':
        return (
          <div className="divide-y divide-border/50">
            <DataRow label="Address" value={business?.address_line1} />
            <DataRow label="Barangay" value={business?.barangay} />
            <DataRow label="City / Municipality" value={business?.city || 'Liliw'} />
            <DataRow label="Province" value={business?.province || 'Laguna'} />
            <DataRow label="Reference Centroid" value={
              business?.latitude && business?.longitude
                ? `${business.latitude}, ${business.longitude}`
                : 'Assigned automatically'
            } />
          </div>
        );
      case 'business_activities':
        return activities.length > 0 ? (
          <div className="space-y-2">
            {activities.map((act, i) => (
              <div key={i} className="bg-[hsl(var(--color-surface-raised))] rounded px-3 py-2 border border-border/50">
                <p className="text-xs font-medium text-[hsl(var(--color-text))]">{act.name}</p>
                <div className="flex gap-4 mt-1">
                  <span className="text-[11px] text-[hsl(var(--color-text-muted))]">
                    Capital: {formatCurrency(act.capitalization)}
                  </span>
                  <span className="text-[11px] text-[hsl(var(--color-text-muted))]">
                    Gross Sales: {formatCurrency(act.gross_sales_prev_year)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[hsl(var(--color-text-muted))] italic">No activities declared.</p>
        );
      case 'financial_declaration': {
        if (activities.length === 0) {
          return <p className="text-xs text-[hsl(var(--color-text-muted))] italic">No financial data declared.</p>;
        }
        const totalCapital = activities.reduce((sum, a) => sum + parseFloat(a.capitalization || 0), 0);
        const totalGross = activities.reduce((sum, a) => sum + parseFloat(a.gross_sales_prev_year || 0), 0);
        return (
          <div className="divide-y divide-border/50">
            <DataRow label="Total Capitalization" value={formatCurrency(totalCapital)} />
            <DataRow label="Total Gross Sales (Prev. Year)" value={formatCurrency(totalGross)} />
            <DataRow label="Number of LOBs" value={`${activities.length}`} />
          </div>
        );
      }
      default:
        return null;
    }
  };

  const reviewedCount = SECTIONS.filter((sec) => reviews[sec.id]).length;
  const allReviewed = reviewedCount === SECTIONS.length;
  const allVerified = SECTIONS.every((sec) => reviews[sec.id] === 'Verified');

  return (
    <Card padding="none">
      <Card.Header>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[hsl(var(--color-text))]">Application Data Review</p>
            <span className="text-xs text-[hsl(var(--color-text-muted))]">
              ({reviewedCount}/{SECTIONS.length} reviewed)
            </span>
          </div>
          {allVerified && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
              <CheckCircle size={12} /> All Verified
            </span>
          )}
        </div>
      </Card.Header>

      <Card.Body className="!p-0">
        <div className="divide-y divide-border">
          {SECTIONS.map((sec) => {
            const status = reviews[sec.id];
            const isExpanded = expandedSection === sec.id;
            const hasRemarks = status === 'Discrepancy';

            return (
              <div key={sec.id} className="p-3 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection(sec.id)}
                    className="flex items-center gap-2 text-left flex-1 hover:opacity-80 transition-opacity"
                  >
                    {status === 'Verified' ? (
                      <CheckCircle size={16} className="text-green-600 shrink-0" />
                    ) : status === 'Discrepancy' ? (
                      <XCircle size={16} className="text-red-500 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-300 shrink-0" />
                    )}
                    <span className="text-xs font-medium text-[hsl(var(--color-text))]">{sec.label}</span>
                    {isExpanded ? (
                      <ChevronUp size={14} className="text-[hsl(var(--color-text-muted))]" />
                    ) : (
                      <ChevronDown size={14} className="text-[hsl(var(--color-text-muted))]" />
                    )}
                  </button>

                  {!disabled && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(sec.id, 'Verified')}
                        className={[
                          'px-2 py-1 text-xs font-medium rounded transition-all',
                          status === 'Verified'
                            ? 'bg-green-600 text-white shadow-sm'
                            : 'bg-surface-tint text-[hsl(var(--color-text-muted))] hover:bg-green-50 hover:text-green-700',
                        ].join(' ')}
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(sec.id, 'Discrepancy')}
                        className={[
                          'px-2 py-1 text-xs font-medium rounded transition-all',
                          status === 'Discrepancy'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-surface-tint text-[hsl(var(--color-text-muted))] hover:bg-red-50 hover:text-red-700',
                        ].join(' ')}
                      >
                        Discrepancy
                      </button>
                    </div>
                  )}

                  {disabled && status && (
                    <span
                      className={[
                        'px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded',
                        status === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
                      ].join(' ')}
                    >
                      {status}
                    </span>
                  )}
                </div>

                {isExpanded && (
                  <div className="mt-2.5 pt-2.5 border-t border-border/50 text-xs">
                    {renderSectionData(sec.id)}
                  </div>
                )}

                {hasRemarks && (
                  <div className="mt-2 pl-6">
                    <input
                      type="text"
                      disabled={disabled}
                      value={remarks[sec.id] || ''}
                      onChange={(e) => handleRemarksChange(sec.id, e.target.value)}
                      placeholder={`Explain discrepancy in ${sec.label}...`}
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-red-200 bg-red-50/50 text-red-900 placeholder:text-red-300 outline-none focus:ring-1 focus:ring-red-400"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card.Body>

      {!disabled && (
        <Card.Footer className="bg-[hsl(var(--color-surface-tint))]">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-[hsl(var(--color-text-muted))]">
              {isSaved ? 'Changes saved' : 'Unsaved changes'}
            </span>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Save size={14} />}
              onClick={handleSave}
              isLoading={isSubmitting}
              disabled={!allReviewed || isSubmitting}
            >
              Save Review
            </Button>
          </div>
        </Card.Footer>
      )}
    </Card>
  );
};

export default DataReviewPanel;
