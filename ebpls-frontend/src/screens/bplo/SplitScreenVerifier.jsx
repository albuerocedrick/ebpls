/**
 * SplitScreenVerifier.jsx — BPLO Module (Phase 4 Overhaul)
 *
 * Map-free, desktop-first BPLO verification interface:
 *   - Left pane: Dedicated Document Viewer with zoom & multi-file navigation
 *   - Right pane:
 *       1. High-Visibility Address & Zoning Jurisdiction Card
 *       2. Inter-Office Regulatory Clearances Section (MHO, BFP, MPDO)
 *       3. Document Verification Checklist (including uploaded Barangay Clearance)
 *       4. Data Review Panel
 *   - Footer: Binary review actions [Approve & Forward to Treasury] vs [Disapprove / Return with Remarks]
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
  MinusCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  Check,
  Eye,
  Save,
  Building2,
  MapPin,
  Home,
  ShieldCheck,
  Compass,
} from 'lucide-react';
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
});

const PASS_STATUSES = [DOC_STATUS.YES, DOC_STATUS.NOT_NEEDED, 'Verified'];

// Dropdown options for BPLO officer
const STATUS_OPTIONS = [
  { value: DOC_STATUS.PENDING, label: 'Pending' },
  { value: DOC_STATUS.YES, label: 'Verified' },
  { value: DOC_STATUS.NO, label: 'Rejected' },
  { value: DOC_STATUS.NOT_NEEDED, label: 'Not needed' },
];

// =========================================
// Status Icon Mapping
// =========================================

const iconForStatus = (status) => {
  switch (status) {
    case DOC_STATUS.YES:
    case 'Verified':
      return <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />;
    case DOC_STATUS.NOT_NEEDED:
      return <MinusCircle size={16} className="shrink-0 text-zinc-400" />;
    case DOC_STATUS.NO:
    case 'Returned':
      return <XCircle size={16} className="shrink-0 text-red-600" />;
    default:
      return <AlertCircle size={16} className="shrink-0 text-amber-500" />;
  }
};

const statusBgColor = (status) => {
  switch (status) {
    case DOC_STATUS.YES:
    case 'Verified':
      return 'bg-zinc-900 text-white';
    case DOC_STATUS.NO:
    case 'Returned':
      return 'bg-red-700 text-white';
    case DOC_STATUS.NOT_NEEDED:
      return 'bg-zinc-200 text-zinc-700';
    default:
      return 'bg-zinc-100 text-zinc-600';
  }
};

/**
 * Inline status dropdown for the verification checklist.
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

  const currentOption = options.find((o) => o.value === value || (value === 'Verified' && o.value === DOC_STATUS.YES));
  const currentLabel = currentOption ? currentOption.label : value;

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
            const isSelected = opt.value === value || (value === 'Verified' && opt.value === DOC_STATUS.YES);
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
  { requirementId: 6, label: 'Contract of Lease', status: DOC_STATUS.PENDING },
  { requirementId: 7, label: 'Community Tax Certificate (CTC)', status: DOC_STATUS.PENDING },
  { requirementId: 17, label: "Owner's Valid ID (Front)", status: DOC_STATUS.PENDING },
  { requirementId: 19, label: "Owner's Valid ID (Back)", status: DOC_STATUS.PENDING },
];

// Helper: detect if URL points to an image
const isImageUrl = (url) => {
  if (!url) return false;
  const urlWithoutQuery = url.split('?')[0];
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(urlWithoutQuery);
};

// Agency helper for regulatory clearances
const getRegulatoryAgency = (label = '') => {
  const l = label.toLowerCase();
  if (l.includes('sanitary') || l.includes('health')) {
    return { code: 'MHO', name: 'Municipal Health Office', policy: 'Endorsed for Joint Inspection' };
  }
  if (l.includes('fire safety') || l.includes('fsic')) {
    return { code: 'BFP', name: 'Bureau of Fire Protection', policy: 'Verified from Upload / Subject to Post-Audit' };
  }
  if (l.includes('zoning')) {
    return { code: 'MPDO', name: 'Zoning & Land Use', policy: 'Locational & Ordinance Compliance' };
  }
  return null;
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
  const [remarks, setRemarks] = useState('');
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [isDataReviewVerified, setIsDataReviewVerified] = useState(false);
  const [initialDataReviews, setInitialDataReviews] = useState([]);
  const [applicationData, setApplicationData] = useState(null);

  // Derived: Business & Zone metadata
  const business = useMemo(() => {
    if (!applicationData?.businesses) return null;
    return Array.isArray(applicationData.businesses)
      ? applicationData.businesses[0]
      : applicationData.businesses;
  }, [applicationData]);

  const zone = applicationData?.zone || null;

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
        setApplicationData(data);
      } catch (err) {
        console.error('[SplitScreenVerifier] Failed to load application details:', err);
        const msg = err.message || 'Failed to load application details.';
        addToast({ message: msg, type: TOAST_TYPE.ERROR });
      }
    };

    fetchApplicationDetails();
  }, [appNo, addToast, isAdminView]);

  // ─── Binary Guard Logic ───────────────────────────────────────
  const canVerify = useMemo(() => {
    const isChecklistValid = checklist.every((item) => PASS_STATUSES.includes(item.status));
    const isDataValid = isDataReviewVerified;
    return isChecklistValid && isDataValid;
  }, [checklist, isDataReviewVerified]);

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

    if (item.fileUrls && item.fileUrls.length > 0) {
      setDocViewerUrls(item.fileUrls);
      setDocViewerIndex(0);
      return;
    } else if (item.fileUrl) {
      setDocViewerUrls([item.fileUrl]);
      setDocViewerIndex(0);
      return;
    }

    if (!item.filePath) return;
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

  // ─── Save checklist progress without finalizing ───────────────
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

  // ─── Binary Decision 1: Approve & Forward to Treasury ─────────
  const handleVerify = async () => {
    if (!appNo) {
      addToast({ message: 'Missing application number in route.', type: TOAST_TYPE.ERROR });
      return;
    }
    if (!canVerify) {
      addToast({ message: 'All checklist items and data review sections must be verified.', type: TOAST_TYPE.WARNING });
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
      addToast({ message: `Application ${appNo} approved. Fees assessed and forwarded to Treasury.`, type: TOAST_TYPE.SUCCESS });
      navigate(ROUTES.BPLO_DASHBOARD);
    } catch (err) {
      addToast({ message: err.message || 'Failed to verify application.', type: TOAST_TYPE.ERROR });
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  // ─── Binary Decision 2: Disapprove / Return with Remarks ──────
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
      addToast({ message: `Application ${appNo} returned to applicant with remarks.`, type: TOAST_TYPE.SUCCESS });
      navigate(ROUTES.BPLO_DASHBOARD);
    } catch (err) {
      addToast({ message: err.message || 'Failed to return application.', type: TOAST_TYPE.ERROR });
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const docViewerUrl = docViewerUrls[docViewerIndex] || null;

  // ─── Render Checklist Item ────────────────────────────────────
  const renderChecklistItem = (item, agencyMeta = null) => {
    const isSelected = selectedDocId === item.requirementId;
    const showRemarks = item.status === DOC_STATUS.NO || item.status === 'Returned';
    return (
      <div
        key={item.requirementId}
        className={[
          'px-4 py-2.5 transition-colors border-b border-border/60 last:border-b-0',
          isSelected ? 'bg-[hsl(var(--color-accent-subtle))]' : '',
        ].join(' ')}
      >
        <div className="flex items-center gap-3">
          {iconForStatus(item.status)}

          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-[hsl(var(--color-text))] truncate">
                {item.label}
              </span>
              {agencyMeta && (
                <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-zinc-700 border border-zinc-200">
                  {agencyMeta.code}
                </span>
              )}
            </div>
            {agencyMeta?.policy && (
              <span className="text-[11px] text-zinc-500 mt-0.5">
                {agencyMeta.policy}
              </span>
            )}
            {item.conditionDescription && !agencyMeta && (
              <span className="text-[10px] text-zinc-400 truncate mt-0.5 font-medium">
                Required for: {item.conditionDescription}
              </span>
            )}
          </div>

          {/* View document button */}
          <button
            type="button"
            onClick={() => handleViewDoc(item.requirementId)}
            className="p-1.5 rounded hover:bg-surface-tint transition-colors shrink-0"
            aria-label={`View ${item.label}`}
            title="View document"
          >
            <Eye size={15} className="text-accent" />
          </button>

          {/* Status dropdown */}
          <StatusDropdown
            disabled={isAdminView}
            value={item.status}
            onChange={(val) => handleStatusChange(item.requirementId, val)}
            options={STATUS_OPTIONS}
            statusBgColor={statusBgColor}
            label={item.label}
          />
        </div>

        {/* Remarks input — shown when document is marked "No" */}
        {showRemarks && (
          <div className="mt-2 ml-7">
            <input
              type="text"
              value={item.remarks || ''}
              onChange={(e) => handleChecklistRemarks(item.requirementId, e.target.value)}
              placeholder="Reason for rejection (sent to applicant)..."
              className="w-full text-xs px-2.5 py-1.5 rounded border border-red-200 bg-red-50 text-red-900 outline-none focus:ring-1 focus:ring-red-400 placeholder:text-red-400"
            />
          </div>
        )}
      </div>
    );
  };

  // Partition checklist into Regulatory Clearances vs Standard & Conditional
  const regulatoryItems = checklist.filter((item) => getRegulatoryAgency(item.label));
  const standardItems = checklist.filter((item) => !getRegulatoryAgency(item.label) && !item.conditionDescription);
  const conditionalItems = checklist.filter((item) => !getRegulatoryAgency(item.label) && item.conditionDescription);

  return (
    <div className="flex flex-col gap-5 duration-200 animate-in fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          to={isAdminView ? '/admin/applications' : ROUTES.BPLO_DASHBOARD}
          className="flex items-center gap-1 text-sm text-accent hover:opacity-80 transition-opacity"
        >
          <ChevronLeft size={16} /> {isAdminView ? 'Application Explorer' : 'Dashboard'}
        </Link>
        <span className="text-[hsl(var(--color-text-muted))] text-sm">/</span>
        <span className="text-sm text-[hsl(var(--color-text-muted))]">
          {isAdminView ? 'Inspect' : 'Verify'} {appNo || 'Select an application'}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[hsl(var(--color-text))]">BPLO Split-Screen Verifier</h1>
          {zone && (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white">
              <Compass size={12} />
              {zone.name}
            </span>
          )}
        </div>
        <Badge status={APP_STATUS.UNDER_REVIEW} />
      </div>

      {/* SPLIT-SCREEN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 min-h-[640px]">

        {/* LEFT PANE: Dedicated Document Viewer */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <Card padding="none" className="flex-1 flex flex-col">
            <Card.Header>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
                  <FileSearch size={15} />
                  <span>Document Viewer</span>
                  {selectedDoc && (
                    <span className="text-zinc-500 font-normal truncate max-w-[180px]">
                      — {selectedDoc.label}
                    </span>
                  )}
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 rounded hover:bg-surface-tint transition-colors"
                    aria-label="Zoom out"
                    title="Zoom out"
                  >
                    <ZoomOut size={14} className="text-zinc-500" />
                  </button>
                  <span className="text-xs font-mono text-zinc-500 min-w-[3rem] text-center">
                    {zoomLevel}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 rounded hover:bg-surface-tint transition-colors"
                    aria-label="Zoom in"
                    title="Zoom in"
                  >
                    <ZoomIn size={14} className="text-zinc-500" />
                  </button>
                  <button
                    onClick={handleZoomReset}
                    className="p-1.5 rounded hover:bg-surface-tint transition-colors"
                    aria-label="Reset zoom"
                    title="Reset zoom"
                  >
                    <RotateCcw size={14} className="text-zinc-500" />
                  </button>
                </div>
              </div>
            </Card.Header>

            <Card.Body className="flex-1 overflow-auto p-2">
              <div
                className="min-h-[480px] bg-zinc-50 rounded-md border border-border flex items-center justify-center overflow-hidden"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
              >
                {isLoadingDoc ? (
                  <div className="flex flex-col items-center gap-2 py-12">
                    <div className="w-6 h-6 rounded-full border-2 border-border border-t-accent animate-spin" />
                    <p className="text-xs text-zinc-500">Loading document...</p>
                  </div>
                ) : docViewerUrl ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    {isImageUrl(docViewerUrl) ? (
                      <img
                        key={docViewerUrl}
                        src={docViewerUrl}
                        alt={selectedDoc?.label || 'Document'}
                        className="max-w-full h-auto object-contain flex-1 min-h-[480px]"
                      />
                    ) : (
                      <object
                        key={docViewerUrl}
                        data={docViewerUrl}
                        type="application/pdf"
                        className="w-full min-h-[580px]"
                        aria-label={selectedDoc?.label || 'PDF Document'}
                      >
                        <div className="flex flex-col items-center gap-3 py-12 px-6">
                          <FileSearch size={32} className="text-zinc-400" />
                          <p className="text-sm text-zinc-800 text-center">PDF cannot be displayed inline.</p>
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
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 text-white px-3 py-1.5 rounded-full flex items-center gap-3 backdrop-blur-sm z-10 text-sm">
                        <button
                          onClick={() => setDocViewerIndex((prev) => Math.max(0, prev - 1))}
                          disabled={docViewerIndex === 0}
                          className="p-1 hover:bg-white/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Previous file"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="font-medium font-mono text-xs">
                          File {docViewerIndex + 1} of {docViewerUrls.length}
                        </span>
                        <button
                          onClick={() => setDocViewerIndex((prev) => Math.min(docViewerUrls.length - 1, prev + 1))}
                          disabled={docViewerIndex === docViewerUrls.length - 1}
                          className="p-1 hover:bg-white/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transform rotate-180"
                          aria-label="Next file"
                        >
                          <ChevronLeft size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : selectedDoc ? (
                  <div className="text-center px-6 py-12">
                    <FileSearch size={32} className="text-zinc-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-zinc-900">{selectedDoc.label}</p>
                    <p className="text-xs text-zinc-500 mt-1">No file was uploaded for this requirement.</p>
                  </div>
                ) : (
                  <div className="text-center px-6 py-12">
                    <Eye size={28} className="text-zinc-400 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-zinc-500">Click the eye icon on any document to inspect it here.</p>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* RIGHT PANES: Address & Zoning Card + Checklists + Data Review */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* 1. High-Visibility Address & Zoning Jurisdiction Card */}
          <Card padding="md" className="border-l-4 border-l-zinc-900 bg-white shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-zinc-900 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      {business?.business_name || 'Business Location & Jurisdiction'}
                    </h3>
                    {business?.trade_name && (
                      <p className="text-xs text-zinc-500">Trade: {business.trade_name}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {zone && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                      <Compass size={12} />
                      {zone.name} ({zone.foot_traffic_level} Traffic)
                    </span>
                  )}
                  {business?.tenancy_type && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800 border border-zinc-200">
                      <Home size={12} />
                      {business.tenancy_type}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1 border-t border-zinc-100">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-0.5">
                    Declared Address
                  </p>
                  <p className="font-medium text-zinc-900">
                    {business?.address_line1 ? `${business.address_line1}, ` : ''}
                    {business?.barangay || '—'}, {business?.city || 'Liliw'}, {business?.province || 'Laguna'}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
                    <MapPin size={11} className="shrink-0 text-zinc-400" />
                    Reference Centroid: {business?.latitude && business?.longitude ? `${business.latitude}, ${business.longitude}` : 'Automated Liliw Centroid'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-0.5">
                    Covered Units / Stalls
                  </p>
                  {Array.isArray(business?.stall_unit_numbers) && business.stall_unit_numbers.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {business.stall_unit_numbers.map((stall, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-medium text-zinc-800 border border-zinc-200"
                        >
                          Unit {stall}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-600 font-medium">Single Establishment / No stall numbers declared</p>
                  )}
                  {zone?.fee_multiplier && (
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Multiplier: <strong className="text-zinc-900">{zone.fee_multiplier}×</strong> (base regulatory fees)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* 2. Inter-Office Regulatory Clearances (MHO, BFP, MPDO) */}
          {regulatoryItems.length > 0 && (
            <Card padding="none" className="border border-zinc-200">
              <Card.Header className="bg-zinc-50/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-zinc-900" />
                    <p className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                      Inter-Office Regulatory Clearances (One-Stop-Shop)
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">MHO · BFP · Zoning</span>
                </div>
              </Card.Header>
              <Card.Body className="!p-0">
                <div className="flex flex-col">
                  {regulatoryItems.map((item) => renderChecklistItem(item, getRegulatoryAgency(item.label)))}
                </div>
              </Card.Body>
            </Card>
          )}

          {/* 3. Document Verification Checklist */}
          <Card padding="none">
            <Card.Header>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-900">
                  Standard Documentary Requirements
                </p>
                <span className="text-xs text-zinc-500">Includes physical Barangay Clearance upload</span>
              </div>
            </Card.Header>
            <Card.Body className="!p-0">
              <div className="flex flex-col">
                <div className="divide-y divide-border">
                  {standardItems.map((item) => renderChecklistItem(item))}
                </div>

                {conditionalItems.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-zinc-50 border-y border-border">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Tenancy & Conditional Requirements
                      </p>
                    </div>
                    <div className="divide-y divide-border">
                      {conditionalItems.map((item) => renderChecklistItem(item))}
                    </div>
                  </>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* 4. Data Review Panel */}
          <DataReviewPanel
            applicationNo={appNo}
            applicationData={applicationData}
            initialData={initialDataReviews}
            onChange={setIsDataReviewVerified}
            disabled={isAdminView}
          />
        </div>
      </div>

      {/* FOOTER: Binary Actions */}
      <Card variant="tinted" padding="md">
        <div className="flex flex-col gap-3">
          {/* Status summary */}
          <div className="flex flex-wrap gap-4 text-xs font-medium">
            <span
              className={`flex items-center gap-1.5 ${
                checklist.every((i) => PASS_STATUSES.includes(i.status))
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {checklist.every((i) => PASS_STATUSES.includes(i.status)) ? (
                <CheckCircle2 size={14} />
              ) : (
                <AlertCircle size={14} />
              )}
              Documents: {checklist.every((i) => PASS_STATUSES.includes(i.status)) ? 'All Verified' : 'Pending Review'}
            </span>
            <span
              className={`flex items-center gap-1.5 ${
                isDataReviewVerified ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {isDataReviewVerified ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              Data Review: {isDataReviewVerified ? 'All Sections Verified' : 'Sections Incomplete'}
            </span>
          </div>

          {isAdminView ? (
            <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-md flex items-center justify-center">
              <p className="text-sm text-zinc-600 font-medium">
                You are viewing this application in Read-Only Administrator Mode. Actions are disabled.
              </p>
            </div>
          ) : (
            <>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Required for returning / disapproving: specify deficient or illegible documents..."
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 resize-none placeholder:text-zinc-400"
                aria-label="Return remarks"
              />

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Button
                  variant="secondary"
                  leftIcon={<Save size={16} />}
                  onClick={handleSaveProgress}
                  isLoading={isSavingProgress}
                  disabled={!appNo}
                >
                  Save Progress
                </Button>

                <Button
                  variant="primary"
                  fullWidth
                  leftIcon={<CheckSquare size={16} />}
                  onClick={handleVerify}
                  isLoading={isSubmittingVerify}
                  disabled={!appNo || !canVerify}
                >
                  Approve & Forward to Treasury
                </Button>

                <Button
                  variant="danger"
                  fullWidth
                  leftIcon={<XSquare size={16} />}
                  onClick={handleReturn}
                  isLoading={isSubmittingReturn}
                  disabled={!appNo || !canReturn}
                >
                  Disapprove / Return with Remarks
                </Button>
              </div>

              <p className="text-xs text-zinc-500 text-center mt-0.5">
                Approving automatically triggers background fee calculation, assigns status <strong>Assessed</strong>, and forwards the file to Treasury.
              </p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SplitScreenVerifier;
