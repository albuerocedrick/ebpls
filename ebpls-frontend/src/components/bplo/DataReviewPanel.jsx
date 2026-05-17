/**
 * DataReviewPanel.jsx — BPLO Module (Phase 4, Task 4.8)
 *
 * Shows the actual declared application data organized into four sections.
 * BPLO officer can see the values and mark each section as Verified or Discrepancy.
 * Calls PUT /api/bplo/applications/review/:app_no on submit.
 */

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Card from '../ui/Card';
import Button from '../ui/Button';
import useUIStore, { TOAST_TYPE } from '../../store/UIStore';
import { apiClient } from '../../utils/apiClient';

// Fix leaflet default marker icon
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  // Extract business and activities from applicationData
  const business = applicationData?.businesses
    ? (Array.isArray(applicationData.businesses) ? applicationData.businesses[0] : applicationData.businesses)
    : null;
  const activities = applicationData?.activities || [];
  const appType = applicationData?.application_types?.name || '—';

  // ─── Initialize from API data ─────────────────────────────────
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      const initialReviews = {};
      const initialRemarks = {};
      initialData.forEach((item) => {
        initialReviews[item.section] = item.status;
        if (item.remarks) initialRemarks[item.section] = item.remarks;
      });
      setReviews(initialReviews);
      setRemarks(initialRemarks);
      checkAllVerified(initialReviews);
    }
  }, [initialData]);

  const checkAllVerified = useCallback(
    (currentReviews) => {
      const allVerified = SECTIONS.every((sec) => currentReviews[sec.id] === 'Verified');
      if (onChange) onChange(allVerified);
    },
    [onChange]
  );

  const handleStatusChange = (sectionId, status) => {
    const newReviews = { ...reviews, [sectionId]: status };
    setReviews(newReviews);
    setIsSaved(false);
    if (status === 'Verified') {
      const newRemarks = { ...remarks };
      delete newRemarks[sectionId];
      setRemarks(newRemarks);
    }
    checkAllVerified(newReviews);
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
            <DataRow label="City" value={business?.city} />
            <DataRow label="Province" value={business?.province} />
            <DataRow label="Coordinates" value={
              business?.latitude && business?.longitude
                ? `${business.latitude}, ${business.longitude}`
                : 'Not pinned'
            } />
            {business?.latitude && business?.longitude ? (
              <div className="pt-2 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--color-text-muted))] mb-1.5">Map Pin</p>
                <div className="h-48 rounded-md overflow-hidden border border-border">
                  <MapContainer
                    center={[business.latitude, business.longitude]}
                    zoom={17}
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    dragging={false}
                    attributionControl={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[business.latitude, business.longitude]} icon={defaultIcon} />
                  </MapContainer>
                </div>
              </div>
            ) : null}
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
      case 'financial_declaration':
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
      default:
        return null;
    }
  };

  const reviewedCount = SECTIONS.filter((sec) => reviews[sec.id]).length;

  return (
    <Card className="flex flex-col overflow-hidden" padding="none">
      <Card.Header>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[hsl(var(--color-text))]">Data Review Panel</h3>
            <p className="text-xs text-[hsl(var(--color-text-muted))] mt-0.5">
              Verify declared data against submitted documents ({reviewedCount}/{SECTIONS.length} reviewed)
            </p>
          </div>
          {isSaved && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
        </div>
      </Card.Header>

      <Card.Body className="flex-1 overflow-y-auto !p-0">
        {SECTIONS.map((section) => {
          const status = reviews[section.id];
          const isVerified = status === 'Verified';
          const isDiscrepancy = status === 'Discrepancy';
          const isExpanded = expandedSection === section.id;

          return (
            <div
              key={section.id}
              className={[
                'border-b border-border last:border-b-0',
                isDiscrepancy ? 'bg-red-50/50' : isVerified ? 'bg-green-50/30' : '',
              ].join(' ')}
            >
              {/* Section Header — clickable to expand */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-tint transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  {isVerified && <CheckCircle size={14} className="text-green-600" />}
                  {isDiscrepancy && <XCircle size={14} className="text-red-500" />}
                  {!status && <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />}
                  <span className="text-sm font-medium text-[hsl(var(--color-text))]">{section.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {status && (
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${isVerified ? 'text-green-600' : 'text-red-500'}`}>
                      {status}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp size={14} className="text-[hsl(var(--color-text-muted))]" /> : <ChevronDown size={14} className="text-[hsl(var(--color-text-muted))]" />}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Declared Data */}
                  <div className="bg-white rounded-md border border-border p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--color-text-muted))] mb-2">
                      Declared Values
                    </p>
                    {applicationData ? renderSectionData(section.id) : (
                      <p className="text-xs text-[hsl(var(--color-text-muted))] italic">Loading data...</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {!disabled && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(section.id, 'Verified')}
                        className={[
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                          isVerified
                            ? 'bg-green-600 text-white shadow-sm'
                            : 'bg-white text-gray-600 border border-gray-300 hover:border-green-400 hover:text-green-600',
                        ].join(' ')}
                      >
                        <CheckCircle size={13} />
                        Verified
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(section.id, 'Discrepancy')}
                        className={[
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                          isDiscrepancy
                            ? 'bg-red-500 text-white shadow-sm'
                            : 'bg-white text-gray-600 border border-gray-300 hover:border-red-400 hover:text-red-500',
                        ].join(' ')}
                      >
                        <XCircle size={13} />
                        Discrepancy
                      </button>
                    </div>
                  )}

                  {/* Discrepancy Remarks */}
                  {isDiscrepancy && (
                    disabled ? (
                      <div className="p-2.5 rounded-md border border-red-200 bg-red-50 text-xs text-red-700">
                        <span className="font-semibold text-red-800">Discrepancy remarks:</span> {remarks[section.id] || 'No remarks provided.'}
                      </div>
                    ) : (
                      <textarea
                        className="w-full text-sm p-2.5 rounded-md border border-red-300 bg-white text-[hsl(var(--color-text))] outline-none focus:ring-1 focus:ring-red-400 resize-none"
                        placeholder="Describe the discrepancy (required)..."
                        rows={2}
                        value={remarks[section.id] || ''}
                        onChange={(e) => handleRemarksChange(section.id, e.target.value)}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Card.Body>

      {/* Footer */}
      {!disabled && (
        <div className="px-4 py-3 border-t border-border bg-surface-tint flex items-center justify-between">
          <span className="text-xs text-[hsl(var(--color-text-muted))]">
            {reviewedCount === SECTIONS.length
              ? SECTIONS.every((s) => reviews[s.id] === 'Verified')
                ? '✓ All sections verified'
                : 'Review complete — has discrepancies'
              : `${SECTIONS.length - reviewedCount} section(s) remaining`}
          </span>
          <Button
            onClick={handleSave}
            isLoading={isSubmitting}
            size="sm"
            leftIcon={<Save size={14} />}
            disabled={reviewedCount < SECTIONS.length}
          >
            Save Review
          </Button>
        </div>
      )}
    </Card>
  );
};

export default DataReviewPanel;
