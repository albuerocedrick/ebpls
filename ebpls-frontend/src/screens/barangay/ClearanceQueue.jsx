/**
 * ClearanceQueue.jsx — Barangay Module
 * Pending clearance requests with issue/reject actions.
 * RBAC: Accessible by Barangay_Officer role only.
 *
 * View Details Modal Tabs:
 *   1. Application Info  — Business profile, owner info, application type
 *   2. Documents         — Tabbed document viewer: ID Front, ID Back, DTI, CTC, Lease/TCT
 *   3. Location Pin      — Interactive Leaflet map of the business pin
 */

import { useState, useEffect } from 'react';
import {
  ClipboardCheck, CheckCircle2, XCircle, Eye, MapPin,
  Building2, FileSearch, User, FileText, ChevronRight, AlertTriangle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geojsonData } from '../../utils/geoValidation';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import apiClient from '../../utils/apiClient';
import { toast } from 'react-hot-toast';
import { API_ENDPOINTS, BARANGAYS_LILIW } from '../../utils/constants';

// Fix for React-Leaflet missing default marker icon
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Helper: detect if URL points to an image
const isImageUrl = (url) => /\.(jpg|jpeg|png|gif|webp)/i.test(url || '');

// Requirement IDs (must match requirement_types table)
const REQ_IDS = {
  DTI_SEC_CDA:   1,
  CTC:           7,
  LEASE_TCT:     6,
  VALID_ID_FRONT: 17,
  VALID_ID_BACK:  19,
};

// Document tabs config for the Documents pane
const DOC_TABS = [
  { key: 'id_front',  label: "ID Front",       reqId: REQ_IDS.VALID_ID_FRONT },
  { key: 'id_back',   label: "ID Back",        reqId: REQ_IDS.VALID_ID_BACK  },
  { key: 'dti',       label: "DTI/SEC/CDA",    reqId: REQ_IDS.DTI_SEC_CDA    },
  { key: 'lease',     label: "Lease / TCT",    reqId: REQ_IDS.LEASE_TCT      },
];

// ─── Inline Document Viewer ───────────────────────────────────────────────────
const DocViewer = ({ url, loading, label }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
        <div className="w-6 h-6 rounded-full border-2 border-gray-300 border-t-blue-500 animate-spin" />
        <p className="text-xs text-gray-500">Loading {label}...</p>
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
        <FileSearch size={32} className="text-gray-300" />
        <p className="text-sm text-gray-400">{label} not uploaded.</p>
      </div>
    );
  }
  if (isImageUrl(url)) {
    return (
      <img
        src={url}
        alt={label}
        className="max-w-full max-h-[500px] object-contain mx-auto rounded border shadow-sm"
      />
    );
  }
  return (
    <object data={url} type="application/pdf" className="w-full h-[500px]">
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm text-gray-500">PDF cannot be displayed inline.</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
          Open PDF in new tab
        </a>
      </div>
    </object>
  );
};

// ─── Info Row ──────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value }) => (
  <div className="flex justify-between items-start gap-3 py-2 border-b border-gray-100 last:border-0">
    <span className="text-xs text-gray-500 shrink-0 w-36">{label}</span>
    <span className="text-xs font-medium text-gray-800 text-right">{value || '—'}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ClearanceQueue = () => {
  const [clearances, setClearances] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedClearance, setSelectedClearance] = useState(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [remarks, setRemarks] = useState('');

  // Modal tabs: 'info' | 'docs' | 'map'
  const [modalTab, setModalTab] = useState('info');

  // Document URLs keyed by DOC_TABS key
  const [docUrls, setDocUrls] = useState({});
  const [loadingDocs, setLoadingDocs] = useState({});
  const [activeDocTab, setActiveDocTab] = useState('id_front');

  // Barangay filter
  const [selectedBarangay, setSelectedBarangay] = useState('All Barangays');
  const [barangayList, setBarangayList] = useState(BARANGAYS_LILIW);
  const [selectedStatus, setSelectedStatus] = useState('Pending');

  // Bumped to force a refetch without writing state inside an effect.
  const [reloadKey, setReloadKey] = useState(0);

  const refetchClearances = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  // The fetch is inlined so nothing is set synchronously in the effect body.
  // `loading` starts true on mount and is set by refetchClearances afterwards.
  useEffect(() => {
    let cancelled = false;

    const fetchPendingClearances = async () => {
      try {
        const response = await apiClient.get('/api/barangay/clearances/pending', {
          params: { status: selectedStatus }
        });
        if (cancelled) return;
        const fetched = response.data?.data || response.data;
        setClearances(Array.isArray(fetched) ? fetched : []);
      } catch (err) {
        if (cancelled) return;
        console.error('Fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPendingClearances();
    return () => { cancelled = true; };
  }, [selectedStatus, reloadKey]);

  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.APPLICATIONS_BARANGAYS);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setBarangayList(res.data);
        }
      } catch (err) {
        console.warn('Failed to fetch dynamic barangay list, falling back to static constants.', err);
      }
    };
    fetchBarangays();
  }, []);

  const handleIssue = async (id) => {
    try {
      await apiClient.put(`/api/barangay/clearances/${id}/issue`);
      toast.success('Clearance Issued Successfully');
      refetchClearances();
    } catch {
      toast.error('Failed to issue clearance');
    }
  };

  const handleReject = async () => {
    if (!remarks.trim()) { toast.error('Remarks are mandatory for rejection.'); return; }
    try {
      await apiClient.put(`/api/barangay/clearances/${selectedClearance.id}/reject`, { remarks });
      toast.success('Clearance rejected successfully.');
      setIsRejectModalOpen(false);
      setRemarks('');
      refetchClearances();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject clearance.');
    }
  };

  // Load a single document URL on demand (when the tab is clicked)
  const loadDoc = async (tabKey, reqId, appNo) => {
    if (docUrls[tabKey] || loadingDocs[tabKey]) return; // already loaded or loading
    const docs = selectedClearance?.applications?.doc_verifications || [];
    const doc = docs.find((d) => d.requirement_id === reqId);
    if (!doc?.file_path) return; // not uploaded
    setLoadingDocs((p) => ({ ...p, [tabKey]: true }));
    try {
      const res = await apiClient.get(API_ENDPOINTS.BARANGAY_DOCUMENT_URL(appNo, reqId));
      const url = res.data?.fileUrl || res.fileUrl;
      if (url) setDocUrls((p) => ({ ...p, [tabKey]: url }));
    } catch (e) {
      console.warn('Could not load doc:', e.message);
    } finally {
      setLoadingDocs((p) => ({ ...p, [tabKey]: false }));
    }
  };

  const handleViewDetails = (clearance) => {
    setSelectedClearance(clearance);
    setIsViewModalOpen(true);
    setModalTab('info');
    setActiveDocTab('id_front');
    setDocUrls({});
    setLoadingDocs({});
  };

  const handleDocTabClick = (tabKey, reqId) => {
    setActiveDocTab(tabKey);
    loadDoc(tabKey, reqId, selectedClearance?.application_no);
  };

  const filteredClearances = clearances.filter((c) =>
    selectedBarangay === 'All Barangays'
      ? true
      : c.applications?.businesses?.barangay === selectedBarangay
  );

  // Derived data for the selected clearance modal
  const scApp  = selectedClearance?.applications;
  const scBiz  = scApp?.businesses;
  const scOwner = scBiz?.taxpayers;
  const scOrg   = scBiz?.organization_types?.name;
  const scAppType = scApp?.application_types?.name;
  const hasCoords = scBiz?.latitude && scBiz?.longitude;

  return (
    <div className="flex flex-col gap-6">

      {/* Header + Filter */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
            Barangay
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Clearance queue
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Review application details, documents, and location pins before issuing clearances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            fullWidth={false}
            size="sm"
            className="min-w-[140px]"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Issued">Issued</option>
            <option value="Rejected">Rejected</option>
          </Select>
          <Select
            value={selectedBarangay}
            onChange={(e) => setSelectedBarangay(e.target.value)}
            fullWidth={false}
            size="sm"
            className="min-w-[200px]"
          >
            <option value="All Barangays">All Barangays</option>
            {barangayList.map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
        </div>
      </div>

      {/* Stats. Same card shape and hover as the applicant dashboard's action
          cards: the border and surface lift, and the icon box inverts to
          zinc-900. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: 'Pending clearances', Icon: ClipboardCheck },
          { label: 'Action needed', Icon: CheckCircle2 },
        ].map(({ label, Icon }) => (
          <div
            key={label}
            className="group rounded-lg border border-zinc-200 bg-white p-5 transition-colors duration-200 ease-out hover:border-zinc-300 hover:bg-zinc-50 motion-reduce:transition-none"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums">
                  {loading ? '--' : filteredClearances.length}
                </p>
                <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-zinc-500 uppercase">
                  {label}
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors duration-200 ease-out group-hover:border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white motion-reduce:transition-none">
                <Icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Queue List */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="flex items-center gap-2.5 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
          <ClipboardCheck size={15} className="text-zinc-500" />
          <p className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
            {selectedStatus === 'All' ? 'All requests' : `${selectedStatus} requests`}
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">Loading clearances...</div>
          ) : filteredClearances.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              {selectedBarangay === 'All Barangays'
                ? `No ${selectedStatus === 'All' ? '' : selectedStatus.toLowerCase() + ' '}clearances found.`
                : `No ${selectedStatus === 'All' ? '' : selectedStatus.toLowerCase() + ' '}clearances found for ${selectedBarangay}.`}
            </div>
          ) : (
            filteredClearances.map((item) => {
                const biz = item.applications?.businesses;
                return (
                  <div key={item.id} className="px-4 py-3 hover:bg-surface-tint transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--color-text))]">
                          {biz?.business_name || `App No: ${item.application_no}`}
                        </p>
                        <p className="text-xs text-[hsl(var(--color-text-muted))] mt-0.5">
                          App: {item.application_no} · {biz?.barangay || '—'} · {item.clearance_types?.name || 'Business Clearance'}
                        </p>
                      </div>
                      <Badge status={item.status || 'Pending'} />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="secondary" size="sm" leftIcon={<Eye size={14} />} onClick={() => handleViewDetails(item)}>
                        View Details
                      </Button>
                      {item.status === 'Pending' && (
                        <>
                          <Button variant="primary" size="sm" leftIcon={<CheckCircle2 size={14} />} onClick={() => handleIssue(item.id)}>
                            Issue
                          </Button>
                          <Button variant="danger" size="sm" leftIcon={<XCircle size={14} />} onClick={() => { setSelectedClearance(item); setIsRejectModalOpen(true); }}>
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      {/* ── View Details Modal ─────────────────────────────────────── */}
      {isViewModalOpen && selectedClearance && (
        <div className="fixed inset-0 z-[300] flex items-start justify-center bg-black/60 backdrop-blur-sm px-4 py-6 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Building2 size={20} className="text-blue-600" />
                  {scBiz?.business_name || selectedClearance.application_no}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  App No: {selectedClearance.application_no} · {scBiz?.barangay}, {scBiz?.city}
                </p>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <XCircle size={24} />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b bg-white px-6">
              {[
                { key: 'info', label: 'Application Info', icon: <User size={14} /> },
                { key: 'docs', label: 'Documents',        icon: <FileText size={14} /> },
                { key: 'map',  label: 'Location Pin',     icon: <MapPin size={14} /> },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setModalTab(tab.key)}
                  className={[
                    'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    modalTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* ── Tab: Application Info ─────────────────────────────── */}
            {modalTab === 'info' && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[60vh]">
                {/* Business Profile */}
                <div className="bg-gray-50 rounded-lg border p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Business Profile</h3>
                  <InfoRow label="Application Type"    value={scAppType} />
                  <InfoRow label="Business Name"       value={scBiz?.business_name} />
                  <InfoRow label="Trade Name"          value={scBiz?.trade_name} />
                  <InfoRow label="Organization Type"   value={scOrg} />
                  <InfoRow label="DTI/SEC/CDA Reg. No" value={scBiz?.dti_sec_cda_reg_no} />
                  <InfoRow label="Franchise"           value={scBiz?.is_franchise ? `Yes — ${scBiz?.franchisor_name || 'N/A'}` : 'No'} />
                </div>

                {/* Owner Info */}
                <div className="bg-gray-50 rounded-lg border p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Owner / Applicant</h3>
                  <InfoRow label="Full Name" value={
                    scOwner
                      ? `${scOwner.first_name} ${scOwner.middle_name ? scOwner.middle_name + ' ' : ''}${scOwner.last_name}`
                      : null
                  } />
                  <InfoRow label="Contact No." value={scOwner?.contact_no} />
                </div>

                {/* Location */}
                <div className="bg-gray-50 rounded-lg border p-4 md:col-span-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Business Location</h3>
                  <div className="grid grid-cols-2 gap-x-6">
                    <InfoRow label="Address"    value={scBiz?.address_line1} />
                    <InfoRow label="Barangay"   value={scBiz?.barangay} />
                    <InfoRow label="City"       value={scBiz?.city} />
                    <InfoRow label="Province"   value={scBiz?.province} />
                    <InfoRow label="Coordinates" value={hasCoords ? `${scBiz.latitude}, ${scBiz.longitude}` : 'Not pinned'} />
                  </div>
                  {scApp?.location_mismatch && (
                    <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2">
                      <AlertTriangle size={16} className="text-red-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-800">
                        <strong className="font-semibold text-red-900">System Flag:</strong> The pinned location falls outside {scBiz?.barangay}. Please verify before issuing.
                      </p>
                    </div>
                  )}
                  {hasCoords && (
                    <button
                      onClick={() => setModalTab('map')}
                      className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:underline"
                    >
                      <MapPin size={12} /> View on Map <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab: Documents ────────────────────────────────────── */}
            {modalTab === 'docs' && (
              <div className="flex flex-col overflow-y-auto max-h-[60vh]">
                {/* Document sub-tabs */}
                <div className="flex gap-1 px-4 pt-3 pb-0 flex-wrap border-b bg-gray-50">
                  {DOC_TABS.map((dt) => {
                    const uploaded = (scApp?.doc_verifications || []).some(
                      (d) => d.requirement_id === dt.reqId && d.file_path
                    );
                    return (
                      <button
                        key={dt.key}
                        onClick={() => handleDocTabClick(dt.key, dt.reqId)}
                        className={[
                          'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md border-b-2 transition-all',
                          activeDocTab === dt.key
                            ? 'border-blue-600 text-blue-600 bg-white'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                        ].join(' ')}
                      >
                        {dt.label}
                        {uploaded
                          ? <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          : <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />}
                      </button>
                    );
                  })}
                </div>

                {/* Viewer area */}
                <div className="flex-1 p-4 min-h-[400px] bg-gray-50">
                  {(() => {
                    const tab = DOC_TABS.find((t) => t.key === activeDocTab);
                    return (
                      <DocViewer
                        url={docUrls[activeDocTab]}
                        loading={!!loadingDocs[activeDocTab]}
                        label={tab?.label || activeDocTab}
                      />
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ── Tab: Map ──────────────────────────────────────────── */}
            {modalTab === 'map' && (
              <div className="flex flex-col overflow-hidden max-h-[60vh]">
                {hasCoords ? (
                  <>
                    {scApp?.location_mismatch && (
                      <div className="px-4 py-2 bg-red-50 border-b text-xs text-red-800 flex items-center gap-2">
                        <AlertTriangle size={14} className="text-red-600 shrink-0" />
                        <span><strong>System Flag:</strong> Location pin falls outside {scBiz?.barangay}.</span>
                      </div>
                    )}
                    <div className="px-4 py-2 bg-blue-50 border-b text-xs text-blue-700">
                      📍 Declared address: <strong>{scBiz.address_line1}, {scBiz.barangay}</strong> · Coords: {scBiz.latitude}, {scBiz.longitude}
                    </div>
                    <div className="flex-1 min-h-[450px] relative z-0">
                      <MapContainer 
                        center={[scBiz.latitude, scBiz.longitude]} 
                        zoom={15} 
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%', minHeight: '450px' }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <GeoJSON 
                          data={geojsonData} 
                          style={{ color: '#3b82f6', weight: 2, fillOpacity: 0.1 }} 
                          onEachFeature={(feature, layer) => {
                            const name = feature.properties?.name || feature.properties?.ADM4_EN;
                            if (name) {
                              layer.bindTooltip(name, {
                                permanent: true,
                                direction: 'center',
                                className: '!bg-transparent !border-none !shadow-none text-[10px] font-bold text-blue-900 drop-shadow-md'
                              });
                            }
                          }}
                        />
                        <Marker position={[scBiz.latitude, scBiz.longitude]} icon={defaultIcon} />
                      </MapContainer>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <MapPin size={36} className="text-gray-300" />
                    <p className="text-sm text-gray-500 text-center">No location pin was provided by the applicant.</p>
                    <p className="text-xs text-gray-400">Declared address: {scBiz?.address_line1}, {scBiz?.barangay || '—'}</p>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center rounded-b-xl">
              <p className="text-xs text-gray-400">
                Clearance Type: {selectedClearance.clearance_types?.name || 'Business Clearance'}
              </p>
              <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection Modal ────────────────────────────────────────── */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[310] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Reject Clearance Request</h2>
            <p className="text-sm text-gray-600 mb-4">
              You are rejecting clearance for App No: <strong>{selectedClearance?.application_no}</strong>.
              Please provide remarks below. This will be emailed to the applicant.
            </p>
            <textarea
              className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              rows="4"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="State the specific reason for rejection..."
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => { setIsRejectModalOpen(false); setRemarks(''); }} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleReject} variant="danger">
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClearanceQueue;