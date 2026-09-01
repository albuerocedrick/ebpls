/**
 * SplitScreenVerifier.jsx — BPLO Module (Phase 4, Tasks 4.9 & 4.10)
 *
 * Three-panel layout:
 *   - Left pane: Document viewer with zoom controls
 *   - Top-right pane: Document verification checklist with dropdown status selector
 *   - Bottom-right pane: DataReviewPanel
 *
 * @policy  DESKTOP-FIRST. Three-panel split on lg+, stacked on mobile.
 * @policy  Document viewer uses <object> for PDF (Chrome-friendly) and <img> for images.
 * @policy  Status selection via dropdown for better UX.
 */

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  FileSearch,
  CheckSquare,
  XSquare,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Clock,
  MinusCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  Check,
  Eye,
  Save,
  MapPin,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for React-Leaflet missing default marker icon
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { apiClient } from '../../utils/apiClient';
import { API_ENDPOINTS, ROUTES, APP_STATUS } from '../../utils/constants';
import useUIStore, { TOAST_TYPE } from '../../store/UIStore';
import DataReviewPanel from '../../components/bplo/DataReviewPanel';

// =========================================
// Document Verification Status Constants
// =========================================

const DOC_STATUS = Object.freeze({
  PENDING: 'Pending',
  YES: 'Yes',
  NO: 'No',
  NOT_NEEDED: 'Not Needed',
  AWAITING_ISSUANCE: 'Awaiting Issuance',
});

const PASS_STATUSES = [DOC_STATUS.YES, DOC_STATUS.NOT_NEEDED];

// Dropdown options for BPLO officer
const STATUS_OPTIONS = [
  { value: DOC_STATUS.PENDING, label: 'Pending' },
  { value: DOC_STATUS.YES, label: 'Yes' },
  { value: DOC_STATUS.NO, label: 'No' },
  { value: DOC_STATUS.NOT_NEEDED, label: 'Not needed' },
];

// =========================================
// Status Icon Mapping
// =========================================

const iconForStatus = (status) => {
  switch (status) {
    case DOC_STATUS.YES:
      return <CheckCircle2 size={16} className="shrink-0 text-zinc-900" />;
    case DOC_STATUS.NOT_NEEDED:
      return <MinusCircle size={16} className="shrink-0 text-zinc-400" />;
    case DOC_STATUS.NO:
      return <XCircle size={16} className="shrink-0 text-zinc-600" />;
    case DOC_STATUS.AWAITING_ISSUANCE:
      return <Clock size={16} className="shrink-0 text-zinc-500" />;
    default:
      return <AlertCircle size={16} className="shrink-0 text-zinc-300" />;
  }
};

// Progression by fill weight, not hue — consistent with StatusBadge.
const statusBgColor = (status) => {
  switch (status) {
    case DOC_STATUS.YES: return 'bg-zinc-900 text-white';
    case DOC_STATUS.NO: return 'bg-zinc-800 text-zinc-100';
    case DOC_STATUS.NOT_NEEDED: return 'bg-zinc-200 text-zinc-700';
    case DOC_STATUS.AWAITING_ISSUANCE: return 'bg-zinc-100 text-zinc-600';
    default: return 'bg-zinc-100 text-zinc-500';
  }
};

/**
 * Inline status dropdown for the verification checklist.
 *
 * @policy  Mirrors components/ui/Select: rounded-md trigger, hairline border
 *          that darkens to zinc-900 when open, zinc-900 selected row with a
 *          check, and a panel offset 6px below the trigger. It stays a separate
 *          component because it renders as a compact pill inside a table row
 *          rather than a labelled form field.
 * @policy  The panel is position:fixed so it escapes the scrolling checklist
 *          pane; its coordinates are measured from the trigger on open.
 */
const StatusDropdown = ({ disabled, value, onChange, options, statusBgColor: getBgColor, label }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const panelHeight = options.length * 34 + 8;
      const flipUp = window.innerHeight - rect.bottom < panelHeight + 12;
      setCoords({
        right: window.innerWidth - rect.right,
        ...(flipUp
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
      });
    }
    setOpen(!open);
  };

  const currentLabel = options.find((o) => o.value === value)?.label || value;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        aria-expanded={open}
        aria-label={`Status for ${label}`}
        className={[
          'relative cursor-pointer rounded-md border pr-7 pl-2.5 py-1',
          'font-mono text-[10px] tracking-[0.08em] uppercase',
          'transition-colors duration-200 ease-out motion-reduce:transition-none',
          'focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none',
          getBgColor(value),
          open ? 'border-zinc-900' : 'border-transparent',
          disabled ? 'cursor-not-allowed opacity-70' : '',
        ].join(' ')}
      >
        {currentLabel}
        <ChevronDown
          size={11}
          className={`absolute top-1/2 right-2 -translate-y-1/2 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && coords && (
        <div
          className="fixed z-[100] min-w-[160px] rounded-md border border-zinc-200 bg-white py-1 shadow-[0_16px_32px_-16px_rgba(24,24,27,0.35)] duration-150 animate-in fade-in slide-in-from-top-1"
          style={coords}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={[
                  'mx-1 flex items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm font-medium',
                  'transition-colors duration-150 motion-reduce:transition-none',
                  isSelected ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900',
                ].join(' ')}
                style={{ width: 'calc(100% - 8px)' }}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={14} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// =========================================
// Default Checklist
// =========================================

const INITIAL_CHECKLIST = [
  { requirementId: 1, label: 'DTI / SEC / CDA Registration', status: DOC_STATUS.PENDING },
  { requirementId: 2, label: 'Barangay Business Clearance', status: DOC_STATUS.PENDING },
  { requirementId: 3, label: 'Fire Safety Inspection Certificate', status: DOC_STATUS.PENDING },
  { requirementId: 4, label: 'Sanitary Permit', status: DOC_STATUS.PENDING },
  { requirementId: 5, label: 'Zoning Clearance', status: DOC_STATUS.PENDING },
  { requirementId: 6, label: 'Lease Contract / TCT', status: DOC_STATUS.PENDING },
  { requirementId: 7, label: 'Community Tax Certificate (CTC)', status: DOC_STATUS.PENDING },
  { requirementId: 17, label: "Owner's Valid ID (Front)", status: DOC_STATUS.PENDING },
  { requirementId: 19, label: "Owner's Valid ID (Back)", status: DOC_STATUS.PENDING },
];

// =========================================
// Helper: detect if URL points to an image
// =========================================
const isImageUrl = (url) => {
  if (!url) return false;
  // Supabase signed URLs contain the file path before query params
  const urlWithoutQuery = url.split('?')[0];
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(urlWithoutQuery);
};

// =========================================
// Component
// =========================================

const SplitScreenVerifier = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { appNo } = useParams();
  const addToast = useUIStore((s) => s.addToast);

  const isAdminView = location.pathname.startsWith('/admin');

  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [docViewerUrls, setDocViewerUrls] = useState([]);
  const [docViewerIndex, setDocViewerIndex] = useState(0);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [leftPaneMode, setLeftPaneMode] = useState('doc'); // 'doc' | 'map'
  const [remarks, setRemarks] = useState('');
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [isDataReviewVerified, setIsDataReviewVerified] = useState(false);
  const [barangayStatus, setBarangayStatus] = useState(null);
  const [initialDataReviews, setInitialDataReviews] = useState([]);
  const [applicationMeta, setApplicationMeta] = useState(null);
  const [applicationData, setApplicationData] = useState(null); // Full app data for DataReviewPanel

  // Derived: currently selected doc object
  const selectedDoc = useMemo(
    () => checklist.find((item) => item.requirementId === selectedDocId) || null,
    [checklist, selectedDocId]
  );

  // ─── Fetch application details on mount ───────────────────────
  useEffect(() => {
    const fetchApplicationDetails = async () => {
      if (!appNo) return;
      try {
        // Transition to Under Review when officer opens the verifier
        if (!isAdminView) {
          await apiClient.put(`/api/bplo/applications/start-review/${appNo}`).catch(() => {});
        }

        const response = await apiClient.get(`/api/bplo/applications/${appNo}`);
        const data = response.data || response;

        if (data?.checklist && data.checklist.length > 0) {
          setChecklist(data.checklist);
        }
        if (data?.data_reviews) {
          setInitialDataReviews(data.data_reviews);
        }
        if (data?.brgy_clearance) {
          setBarangayStatus(data.brgy_clearance.status);
        }
        if (data?.businesses) {
          setApplicationMeta(
            Array.isArray(data.businesses) ? data.businesses[0] : data.businesses
          );
        }
        // Store full application data for the DataReviewPanel
        setApplicationData(data);
      } catch (err) {
        console.error('[SplitScreenVerifier] Failed to load application details:', err);
        const msg = err.message || 'Failed to load application details.';
        addToast({ message: msg, type: TOAST_TYPE.ERROR });
      }
    };

    fetchApplicationDetails();
  }, [appNo, addToast, isAdminView]);

  // ─── Guard Logic (Task 4.10) ──────────────────────────────────
  const canVerify = useMemo(() => {
    const isChecklistValid = checklist.every((item) => PASS_STATUSES.includes(item.status));
    const isDataValid = isDataReviewVerified;
    const isBarangayValid = !barangayStatus || barangayStatus === 'Issued';
    return isChecklistValid && isDataValid && isBarangayValid;
  }, [checklist, isDataReviewVerified, barangayStatus]);

  const canReturn = remarks.trim().length > 0;

  // ─── Status change via dropdown ───────────────────────────────
  const handleStatusChange = useCallback((requirementId, newStatus) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.requirementId === requirementId
          ? { ...item, status: newStatus, remarks: newStatus === DOC_STATUS.NO ? (item.remarks || '') : null }
          : item
      )
    );
  }, []);

  // ─── Checklist remarks handler (for rejected documents) ───────
  const handleChecklistRemarks = useCallback((requirementId, value) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.requirementId === requirementId
          ? { ...item, remarks: value }
          : item
      )
    );
  }, []);

  const handleViewDoc = useCallback(async (requirementId) => {
    setSelectedDocId(requirementId);
    setDocViewerUrls([]);
    setDocViewerIndex(0);
    setZoomLevel(100);

    const item = checklist.find((i) => i.requirementId === requirementId);
    if (!item) return;

    // If the item already has fileUrls from the initial load, use them
    if (item.fileUrls && item.fileUrls.length > 0) {
      setDocViewerUrls(item.fileUrls);
      setDocViewerIndex(0);
      return;
    } else if (item.fileUrl) {
      setDocViewerUrls([item.fileUrl]);
      setDocViewerIndex(0);
      return;
    }

    // If no file path exists, no document was uploaded
    if (!item.filePath) return;

    // Fetch a fresh signed URL
    if (!appNo) return;

    setIsLoadingDoc(true);
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.BPLO_DOCUMENT_URL(appNo, requirementId)
      );
      const data = response.data || response;
      if (data?.fileUrls && data.fileUrls.length > 0) {
        setDocViewerUrls(data.fileUrls);
        setDocViewerIndex(0);
      } else if (data?.fileUrl) {
        setDocViewerUrls([data.fileUrl]);
        setDocViewerIndex(0);
      }
    } catch (err) {
      console.warn('[SplitScreenVerifier] Could not load document URL:', err.message);
    } finally {
      setIsLoadingDoc(false);
    }
  }, [appNo, checklist]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 25, 50));
  const handleZoomReset = () => setZoomLevel(100);

  // ─── Save checklist progress without approving ────────────────
  const [isSavingProgress, setIsSavingProgress] = useState(false);

  const handleSaveProgress = async () => {
    if (!appNo) return;
    setIsSavingProgress(true);
    try {
      await apiClient.put(`/api/bplo/applications/save-checklist/${appNo}`, {
        checklist: checklist.map((item) => ({
          requirementId: item.requirementId,
          status: item.status,
          remarks: item.remarks || null,
        })),
      });
      addToast({ message: 'Checklist progress saved.', type: TOAST_TYPE.SUCCESS });
    } catch (err) {
      addToast({ message: err.message || 'Failed to save progress.', type: TOAST_TYPE.ERROR });
    } finally {
      setIsSavingProgress(false);
    }
  };

  const handleVerify = async () => {
    if (!appNo) {
      addToast({ message: 'Missing application number in route.', type: TOAST_TYPE.ERROR });
      return;
    }
    if (!canVerify) {
      addToast({ message: 'All guard conditions must pass before verification.', type: TOAST_TYPE.WARNING });
      return;
    }

    setIsSubmittingVerify(true);
    try {
      await apiClient.put(API_ENDPOINTS.BPLO_VERIFY(appNo), {
        checklist: checklist.map((item) => ({
          requirementId: item.requirementId,
          status: item.status,
          remarks: item.remarks || null,
        })),
      });
      addToast({ message: `Application ${appNo} verified successfully.`, type: TOAST_TYPE.SUCCESS });
      navigate(ROUTES.BPLO_DASHBOARD);
    } catch (err) {
      addToast({ message: err.message || 'Failed to verify application.', type: TOAST_TYPE.ERROR });
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  const handleReturn = async () => {
    if (!appNo) {
      addToast({ message: 'Missing application number in route.', type: TOAST_TYPE.ERROR });
      return;
    }
    if (!canReturn) {
      addToast({ message: 'Remarks are required before returning an application.', type: TOAST_TYPE.WARNING });
      return;
    }

    setIsSubmittingReturn(true);
    try {
      await apiClient.put(API_ENDPOINTS.BPLO_RETURN(appNo), { remarks: remarks.trim() });
      addToast({ message: `Application ${appNo} returned to applicant.`, type: TOAST_TYPE.SUCCESS });
      navigate(ROUTES.BPLO_DASHBOARD);
    } catch (err) {
      addToast({ message: err.message || 'Failed to return application.', type: TOAST_TYPE.ERROR });
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const docViewerUrl = docViewerUrls[docViewerIndex] || null;

  // ─── Barangay Badge Helper ────────────────────────────────────
  const barangayBadgeStatus = useMemo(() => {
    if (!barangayStatus) return null;
    switch (barangayStatus) {
      case 'Issued': return APP_STATUS.VERIFIED;
      case 'Rejected': return APP_STATUS.RETURNED;
      default: return APP_STATUS.PENDING;
    }
  }, [barangayStatus]);

  // ─── Render Checklist Helper ──────────────────────────────────
  const renderChecklistItem = (item) => {
    const isLocked = item.status === DOC_STATUS.AWAITING_ISSUANCE;
    const isSelected = selectedDocId === item.requirementId;
    const showRemarks = item.status === DOC_STATUS.NO;
    return (
      <div
        key={item.requirementId}
        className={[
          'px-4 py-2.5 transition-colors',
          isSelected ? 'bg-[hsl(var(--color-accent-subtle))]' : '',
        ].join(' ')}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          {iconForStatus(item.status)}

          {/* Label */}
          <div className="flex-1 min-w-0 flex flex-col">
            <span className="text-sm text-[hsl(var(--color-text))] truncate">
              {item.label}
            </span>
            {item.conditionDescription && (
              <span className="text-[10px] text-gray-400 truncate mt-0.5 font-medium">
                Required for: {item.conditionDescription}
              </span>
            )}
          </div>

          {/* View button */}
          <button
            type="button"
            onClick={() => handleViewDoc(item.requirementId)}
            className="p-1.5 rounded hover:bg-surface-tint transition-colors shrink-0"
            aria-label={`View ${item.label}`}
            title="View document"
          >
            <Eye size={14} className="text-accent" />
          </button>

          {/* Status dropdown */}
          {isLocked ? (
            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded shrink-0">
              Awaiting Issuance
            </span>
          ) : (
            <StatusDropdown
              disabled={isAdminView}
              value={item.status}
              onChange={(val) => handleStatusChange(item.requirementId, val)}
              options={STATUS_OPTIONS}
              statusBgColor={statusBgColor}
              label={item.label}
            />
          )}
        </div>

        {/* Remarks input — shown when document is marked "No" */}
        {showRemarks && (
          <div className="mt-2 ml-7">
            <input
              type="text"
              value={item.remarks || ''}
              onChange={(e) => handleChecklistRemarks(item.requirementId, e.target.value)}
              placeholder="Reason for rejection (required)..."
              className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-200 bg-gray-50 text-[hsl(var(--color-text))] outline-none focus:ring-1 focus:ring-gray-300 placeholder:text-gray-400"
            />
          </div>
        )}
      </div>
    );
  };

  const standardRequirements = checklist.filter(item => !item.conditionDescription);
  const conditionalRequirements = checklist.filter(item => item.conditionDescription);

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link to={isAdminView ? '/admin/applications' : ROUTES.BPLO_DASHBOARD} className="flex items-center gap-1 text-sm text-accent hover:opacity-80 transition-opacity">
          <ChevronLeft size={16} /> {isAdminView ? 'Application Explorer' : 'Dashboard'}
        </Link>
        <span className="text-[hsl(var(--color-text-muted))] text-sm">/</span>
        <span className="text-sm text-[hsl(var(--color-text-muted))]">
          {isAdminView ? 'Inspect' : 'Verify'} {appNo || 'Select an application'}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-[hsl(var(--color-text))]">Document Verification</h1>
          {barangayStatus && (
            <Badge status={barangayBadgeStatus} label={`Brgy: ${barangayStatus}`} size="md" withRing />
          )}
        </div>
        <Badge status={APP_STATUS.UNDER_REVIEW} />
      </div>

      {applicationMeta && (
        <p className="text-sm text-[hsl(var(--color-text-muted))]">
          {applicationMeta.business_name}
          {applicationMeta.trade_name ? ` (${applicationMeta.trade_name})` : ''}
          {' — '}{applicationMeta.barangay}, {applicationMeta.city}
        </p>
      )}

      {/* THREE-PANEL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[600px]">

        {/* LEFT PANE: Document Viewer / Map View */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <Card padding="none" className="flex-1 flex flex-col">
            <Card.Header>
              <div className="flex items-center justify-between">
                {/* Tab switcher */}
                <div className="flex bg-[hsl(var(--color-surface-tint))] p-1 rounded-lg gap-1">
                  <button
                    onClick={() => setLeftPaneMode('doc')}
                    className={[
                      'flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all',
                      leftPaneMode === 'doc'
                        ? 'bg-white shadow-sm text-[hsl(var(--color-text))]'
                        : 'text-[hsl(var(--color-text-muted))] hover:text-[hsl(var(--color-text))]',
                    ].join(' ')}
                  >
                    <FileSearch size={13} /> Documents
                  </button>
                  <button
                    onClick={() => setLeftPaneMode('map')}
                    className={[
                      'flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all',
                      leftPaneMode === 'map'
                        ? 'bg-white shadow-sm text-[hsl(var(--color-text))]'
                        : 'text-[hsl(var(--color-text-muted))] hover:text-[hsl(var(--color-text))]',
                    ].join(' ')}
                  >
                    <MapPin size={13} /> Location Pin
                  </button>
                </div>
                {/* Zoom controls (only in doc mode) */}
                {leftPaneMode === 'doc' && (
                  <div className="flex items-center gap-1">
                    <button onClick={handleZoomOut} className="p-1.5 rounded hover:bg-surface-tint transition-colors" aria-label="Zoom out">
                      <ZoomOut size={14} className="text-[hsl(var(--color-text-muted))]" />
                    </button>
                    <span className="text-xs font-mono text-[hsl(var(--color-text-muted))] min-w-[3rem] text-center">{zoomLevel}%</span>
                    <button onClick={handleZoomIn} className="p-1.5 rounded hover:bg-surface-tint transition-colors" aria-label="Zoom in">
                      <ZoomIn size={14} className="text-[hsl(var(--color-text-muted))]" />
                    </button>
                    <button onClick={handleZoomReset} className="p-1.5 rounded hover:bg-surface-tint transition-colors" aria-label="Reset zoom">
                      <RotateCcw size={14} className="text-[hsl(var(--color-text-muted))]" />
                    </button>
                  </div>
                )}
              </div>
            </Card.Header>

            {/* MAP VIEW */}
            {leftPaneMode === 'map' ? (
              <div className="flex-1 flex flex-col">
                {applicationMeta?.latitude && applicationMeta?.longitude ? (
                  <>
                    <div className="px-4 py-2 bg-[hsl(var(--color-surface-tint))] border-b border-border">
                      <p className="text-xs text-[hsl(var(--color-text-muted))]">
                        Declared address: <span className="font-medium text-[hsl(var(--color-text))]">{applicationMeta.address_line1}, {applicationMeta.barangay}</span>
                      </p>
                      <p className="text-[11px] text-[hsl(var(--color-text-muted))] mt-0.5">
                        Coordinates: {applicationMeta.latitude}, {applicationMeta.longitude}
                      </p>
                    </div>
                    <div className="flex-1 min-h-[450px]">
                      <MapContainer
                        center={[applicationMeta.latitude, applicationMeta.longitude]}
                        zoom={17}
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%', minHeight: '450px' }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker
                          position={[applicationMeta.latitude, applicationMeta.longitude]}
                          icon={defaultIcon}
                        />
                      </MapContainer>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 px-6">
                    <MapPin size={32} className="text-[hsl(var(--color-text-muted))] opacity-40" />
                    <p className="text-sm text-[hsl(var(--color-text-muted))] text-center">
                      No location pin provided by the applicant.
                    </p>
                    <p className="text-xs text-[hsl(var(--color-text-muted))] text-center">
                      The declared address is: <span className="font-medium">{applicationMeta?.address_line1 || '—'}, {applicationMeta?.barangay || '—'}</span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* DOCUMENT VIEWER */
              <Card.Body className="flex-1 overflow-auto p-2">
                <div
                  className="min-h-[450px] bg-surface-tint rounded-md border border-border flex items-center justify-center overflow-hidden"
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
                >
                  {isLoadingDoc ? (
                    <div className="flex flex-col items-center gap-2 py-12">
                      <div className="w-6 h-6 rounded-full border-2 border-border border-t-accent animate-spin" />
                      <p className="text-xs text-[hsl(var(--color-text-muted))]">Loading document...</p>
                    </div>
                  ) : docViewerUrl ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                      {isImageUrl(docViewerUrl) ? (
                        <img
                          key={docViewerUrl}
                          src={docViewerUrl}
                          alt={selectedDoc?.label || 'Document'}
                          className="max-w-full h-auto object-contain flex-1 min-h-[450px]"
                        />
                      ) : (
                        <object
                          key={docViewerUrl}
                          data={docViewerUrl}
                          type="application/pdf"
                          className="w-full min-h-[550px]"
                          aria-label={selectedDoc?.label || 'PDF Document'}
                        >
                          <div className="flex flex-col items-center gap-3 py-12 px-6">
                            <FileSearch size={32} className="text-[hsl(var(--color-text-muted))]" />
                            <p className="text-sm text-[hsl(var(--color-text))] text-center">PDF cannot be displayed inline.</p>
                            <a
                              href={docViewerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-accent underline underline-offset-2 hover:opacity-80"
                            >
                              Open PDF in new tab
                            </a>
                          </div>
                        </object>
                      )}
                      {docViewerUrls.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white px-3 py-1.5 rounded-full flex items-center gap-3 backdrop-blur-sm z-10 text-sm">
                          <button 
                            onClick={() => setDocViewerIndex(prev => Math.max(0, prev - 1))}
                            disabled={docViewerIndex === 0}
                            className="p-1 hover:bg-white/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="font-medium font-mono text-xs">File {docViewerIndex + 1} of {docViewerUrls.length}</span>
                          <button 
                            onClick={() => setDocViewerIndex(prev => Math.min(docViewerUrls.length - 1, prev + 1))}
                            disabled={docViewerIndex === docViewerUrls.length - 1}
                            className="p-1 hover:bg-white/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transform rotate-180"
                          >
                            <ChevronLeft size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : selectedDoc ? (
                    <div className="text-center px-6 py-12">
                      <FileSearch size={32} className="text-[hsl(var(--color-text-muted))] mx-auto mb-3" />
                      <p className="text-sm font-medium text-[hsl(var(--color-text))]">{selectedDoc.label}</p>
                      <p className="text-xs text-[hsl(var(--color-text-muted))] mt-1">No document uploaded for this requirement.</p>
                    </div>
                  ) : (
                    <div className="text-center px-6 py-12">
                      <Eye size={28} className="text-[hsl(var(--color-text-muted))] mx-auto mb-3 opacity-40" />
                      <p className="text-sm text-[hsl(var(--color-text-muted))]">Click the eye icon on a document to preview it here.</p>
                    </div>
                  )}
                </div>
              </Card.Body>
            )}
          </Card>
        </div>

        {/* RIGHT PANES */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* TOP-RIGHT: Document Verification Checklist with Dropdown */}
          <Card padding="none">
            <Card.Header>
              <p className="text-sm font-semibold text-[hsl(var(--color-text))]">
                Document Verification Checklist
              </p>
            </Card.Header>
            <Card.Body className="!p-0">
              <div className="flex flex-col">
                <div className="divide-y divide-border">
                  {standardRequirements.map((item) => renderChecklistItem(item))}
                </div>
                
                {conditionalRequirements.length > 0 && (
                  <div className="px-4 py-2 bg-gray-50 border-y border-border">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conditional Requirements</p>
                  </div>
                )}
                
                <div className="divide-y divide-border">
                  {conditionalRequirements.map((item) => renderChecklistItem(item))}
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* BOTTOM-RIGHT: Data Review Panel */}
          <DataReviewPanel
            applicationNo={appNo}
            applicationData={applicationData}
            initialData={initialDataReviews}
            onChange={setIsDataReviewVerified}
            disabled={isAdminView}
          />
        </div>
      </div>

      {/* FOOTER */}
      <Card variant="tinted" padding="md">
        <div className="flex flex-col gap-3">
          {/* Guard status summary */}
          <div className="flex flex-wrap gap-3 text-xs">
            <span className={`flex items-center gap-1 ${checklist.every((i) => PASS_STATUSES.includes(i.status)) ? 'text-green-600' : 'text-[hsl(var(--color-text-muted))]'}`}>
              {checklist.every((i) => PASS_STATUSES.includes(i.status)) ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              Documents
            </span>
            <span className={`flex items-center gap-1 ${isDataReviewVerified ? 'text-green-600' : 'text-[hsl(var(--color-text-muted))]'}`}>
              {isDataReviewVerified ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              Data Review
            </span>
            {barangayStatus && (
              <span className={`flex items-center gap-1 ${barangayStatus === 'Issued' ? 'text-green-600' : 'text-[hsl(var(--color-text-muted))]'}`}>
                {barangayStatus === 'Issued' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                Brgy Clearance
              </span>
            )}
          </div>

          {isAdminView ? (
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-md flex items-center justify-center">
              <p className="text-sm text-gray-600 font-medium">
                You are viewing this application in Read-Only Administrator Mode. Actions are disabled.
              </p>
            </div>
          ) : (
            <>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                placeholder="Required when returning application: explain missing/incorrect documents or data."
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-[hsl(var(--color-text))] outline-none focus:ring-2 focus:ring-accent resize-none"
                aria-label="Return remarks"
              />

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="secondary" fullWidth leftIcon={<Save size={16} />} onClick={handleSaveProgress} isLoading={isSavingProgress} disabled={!appNo}>
                  Save Progress
                </Button>
                <Button variant="primary" fullWidth leftIcon={<CheckSquare size={16} />} onClick={handleVerify} isLoading={isSubmittingVerify} disabled={!appNo || !canVerify}>
                  Approve Application
                </Button>
                <Button variant="danger" fullWidth leftIcon={<XSquare size={16} />} onClick={handleReturn} isLoading={isSubmittingReturn} disabled={!appNo || !canReturn}>
                  Return with Remarks
                </Button>
              </div>

              <p className="text-xs text-[hsl(var(--color-text-muted))] text-center mt-1">
                Approve is enabled only when all documents are verified, all data sections are reviewed, and barangay clearance (if applicable) is issued.
              </p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SplitScreenVerifier;
