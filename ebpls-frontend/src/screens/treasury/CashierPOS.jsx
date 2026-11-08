/**
 * CashierPOS.jsx — Treasury Module (Phase 6)
 * Dual-Mode Cashier Terminal:
 *   Tab 1: Over-the-Counter (OTC) POS — Cash & Manager Check
 *   Tab 2: Bank Transfer / GCash Proofs Queue — Side-by-side preview & verification
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Banknote, 
  CreditCard, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft,
  Smartphone,
  ExternalLink,
  Search,
  RefreshCw,
  Check,
  X,
  FileText
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import apiClient from '../../utils/apiClient';
import { STATUSES } from '../../utils/constants';

const CashierPOS = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const appNo = searchParams.get('app');
  const initialTab = searchParams.get('tab') === 'proofs' ? 'proofs' : (appNo ? 'otc' : 'proofs');

  // Active Tab: 'otc' | 'proofs'
  const [activeTab, setActiveTab] = useState(initialTab);

  // ─── TAB 1: OTC STATE ────────────────────────────────────────────────────────
  const [assessment, setAssessment] = useState(null);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);
  const [isProcessingOTC, setIsProcessingOTC] = useState(false);
  const [otcError, setOtcError] = useState(null);
  const [isOtcSuccess, setIsOtcSuccess] = useState(false);
  const [otcMethod, setOtcMethod] = useState('Cash'); 
  const [tendered, setTendered] = useState('');
  const [generatedOrNumber, setGeneratedOrNumber] = useState('');
  const [checkDetails, setCheckDetails] = useState({ number: '', bank: '' });

  // Quick Application Selector when no ?app= is provided
  const [payableApps, setPayableApps] = useState([]);
  const [isPayableLoading, setIsPayableLoading] = useState(false);
  const [appSearchTerm, setAppSearchTerm] = useState('');

  // ─── TAB 2: PROOF VERIFICATION STATE ────────────────────────────────────────
  const [pendingProofs, setPendingProofs] = useState([]);
  const [isProofsLoading, setIsProofsLoading] = useState(false);
  const [proofsError, setProofsError] = useState(null);
  const [selectedProof, setSelectedProof] = useState(null);
  const [proofSearchTerm, setProofSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL'); // 'ALL' | 'GCash' | 'Bank Transfer'

  // Action states for proof verification
  const [isVerifyingProof, setIsVerifyingProof] = useState(false);
  const [isRejectingProof, setIsRejectingProof] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState(null);

  // Synchronize Tab with URL query if updated
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setVerificationSuccess(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  // Fetch assessment if appNo is in query string
  useEffect(() => {
    if (appNo) {
      const fetchAssessment = async () => {
        try {
          setIsAssessmentLoading(true);
          setOtcError(null);
          const res = await apiClient.get(`/api/treasury/assess/${appNo}`);
          if (res.success) setAssessment(res.data);
        } catch (err) {
          setOtcError(err.message || 'Assessment data unavailable.');
        } finally {
          setIsAssessmentLoading(false);
        }
      };
      fetchAssessment();
    }
  }, [appNo]);

  // Fetch payable applications for quick OTC selector when no appNo is supplied
  useEffect(() => {
    if (!appNo && activeTab === 'otc') {
      const fetchPayableApps = async () => {
        try {
          setIsPayableLoading(true);
          const res = await apiClient.get('/api/treasury/queue');
          if (res.success) {
            const payable = (res.data || []).filter(
              (a) => a.status === STATUSES.FOR_PAYMENT || a.status === STATUSES.ASSESSED
            );
            setPayableApps(payable);
          }
        } catch (err) {
          console.error('[CashierPOS] Failed to fetch queue:', err);
        } finally {
          setIsPayableLoading(false);
        }
      };
      fetchPayableApps();
    }
  }, [appNo, activeTab]);

  // Fetch Pending Proofs for Tab 2
  const fetchPendingProofs = async () => {
    try {
      setIsProofsLoading(true);
      setProofsError(null);
      const res = await apiClient.get('/api/treasury/payments/pending-proofs');
      if (res.success) {
        setPendingProofs(res.data || []);
        if (res.data && res.data.length > 0) {
          // Keep current selection or default to first
          setSelectedProof((prev) => {
            if (prev) {
              const matched = res.data.find((p) => p.transaction_id === prev.transaction_id);
              return matched || res.data[0];
            }
            return res.data[0];
          });
        } else {
          setSelectedProof(null);
        }
      }
    } catch (err) {
      setProofsError(err.message || 'Failed to load pending deposit slips.');
    } finally {
      setIsProofsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const initProofs = async () => {
      try {
        const res = await apiClient.get('/api/treasury/payments/pending-proofs');
        if (cancelled) return;
        if (res.success) {
          setPendingProofs(res.data || []);
          if (res.data && res.data.length > 0) {
            setSelectedProof(res.data[0]);
          } else {
            setSelectedProof(null);
          }
        }
      } catch (err) {
        if (!cancelled) setProofsError(err.message || 'Failed to load pending deposit slips.');
      } finally {
        if (!cancelled) setIsProofsLoading(false);
      }
    };
    initProofs();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── TAB 1: OTC CONFIRMATION ────────────────────────────────────────────────
  const totalDue = Number(assessment?.total_amount || 0);
  const changeAmount = Math.max(0, parseFloat(tendered || 0) - totalDue);
  const isInsufficient = parseFloat(tendered || 0) < totalDue && tendered !== '';

  const handleConfirmOTC = async () => {
    try {
      setIsProcessingOTC(true);
      setOtcError(null);
      const res = await apiClient.post('/api/treasury/payments/otc', {
        application_no: appNo,
        amount_tendered: parseFloat(tendered),
        tendered_type: otcMethod,
        check_number: otcMethod === 'Manager Check' ? checkDetails.number : null,
        bank_name: otcMethod === 'Manager Check' ? checkDetails.bank : null
      });

      if (res.success) {
        setGeneratedOrNumber(res.data?.or_number || 'UNKNOWN');
        setIsOtcSuccess(true);
      }
    } catch (err) {
      setOtcError(err.message);
    } finally {
      setIsProcessingOTC(false);
    }
  };

  // ─── TAB 2: PROOF DECISION HANDLERS ─────────────────────────────────────────
  const handleVerifyProof = async () => {
    if (!selectedProof) return;
    try {
      setIsVerifyingProof(true);
      setProofsError(null);

      const res = await apiClient.put(`/api/treasury/payments/${selectedProof.transaction_id}/verify-proof`, {
        action: 'VERIFY'
      });

      if (res.success) {
        const orNumber = res.data?.or_number || res.data?.transaction?.or_number || 'ISSUED';
        setVerificationSuccess({
          application_no: selectedProof.application_no,
          business_name: selectedProof.business_name,
          or_number: orNumber
        });
        // Refresh queue
        await fetchPendingProofs();
      }
    } catch (err) {
      setProofsError(err.message || 'Failed to verify payment proof.');
    } finally {
      setIsVerifyingProof(false);
    }
  };

  const handleConfirmRejectProof = async () => {
    if (!selectedProof) return;
    if (!rejectionReason.trim()) {
      setProofsError('Please enter a rejection reason.');
      return;
    }

    try {
      setIsRejectingProof(true);
      setProofsError(null);

      const res = await apiClient.put(`/api/treasury/payments/${selectedProof.transaction_id}/verify-proof`, {
        action: 'REJECT',
        rejection_reason: rejectionReason.trim()
      });

      if (res.success) {
        setShowRejectModal(false);
        setRejectionReason('');
        await fetchPendingProofs();
      }
    } catch (err) {
      setProofsError(err.message || 'Failed to reject payment proof.');
    } finally {
      setIsRejectingProof(false);
    }
  };

  // Filter proofs in Tab 2
  const filteredProofs = pendingProofs.filter((p) => {
    const term = proofSearchTerm.toLowerCase();
    const matchesSearch = 
      (p.application_no || '').toLowerCase().includes(term) ||
      (p.business_name || '').toLowerCase().includes(term) ||
      (p.payment_reference_no || '').toLowerCase().includes(term);

    const matchesChannel = 
      channelFilter === 'ALL' || p.tendered_type === channelFilter;

    return matchesSearch && matchesChannel;
  });

  // Filter quick payable apps in Tab 1
  const filteredPayableApps = payableApps.filter((a) => {
    const term = appSearchTerm.toLowerCase();
    return (
      (a.application_no || '').toLowerCase().includes(term) ||
      (a.businesses?.business_name || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* HEADER & TABS NAVIGATION */}
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
            Municipal Treasury
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Cashier POS Terminal
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            Process physical Over-the-Counter cash payments or verify incoming Bank & GCash deposit slips.
          </p>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100 p-1.5">
          <button
            type="button"
            onClick={() => handleTabChange('proofs')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'proofs'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Smartphone size={15} />
            <span>Bank & GCash Proofs</span>
            {pendingProofs.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {pendingProofs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('otc')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'otc'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Banknote size={15} />
            <span>Over-the-Counter POS</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: BANK TRANSFER & GCASH PROOFS VERIFICATION QUEUE                */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'proofs' && (
        <div className="space-y-6 animate-in fade-in">
          {verificationSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">
                    Payment Verified for {verificationSuccess.business_name} ({verificationSuccess.application_no})
                  </p>
                  <p className="font-mono text-xs text-emerald-700">
                    Official Receipt Issued: <strong>{verificationSuccess.or_number}</strong> • Permit Released
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVerificationSuccess(null)}
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {proofsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 flex items-center gap-2 text-xs">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{proofsError}</span>
            </div>
          )}

          {/* TWO-COLUMN MASTER-DETAIL SPLIT */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* LEFT PANEL: PENDING PROOFS LIST (5 COLS) */}
            <div className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-sm lg:col-span-5 overflow-hidden">
              <div className="border-b border-zinc-200 bg-zinc-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900">Pending Deposit Slips</h3>
                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-mono text-zinc-700">
                      {filteredProofs.length}
                    </span>
                  </div>
                  <button
                    onClick={fetchPendingProofs}
                    disabled={isProofsLoading}
                    className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-md hover:bg-zinc-200 transition-colors"
                    title="Refresh Queue"
                  >
                    <RefreshCw size={14} className={isProofsLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                {/* Search & Channel Filter */}
                <div className="mt-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search ref no, app no, business..."
                      value={proofSearchTerm}
                      onChange={(e) => setProofSearchTerm(e.target.value)}
                      className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-1">
                    {['ALL', 'GCash', 'Bank Transfer'].map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setChannelFilter(ch)}
                        className={`flex-1 rounded-md py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                          channelFilter === ch
                            ? 'bg-zinc-900 text-white'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* List items */}
              <div className="divide-y divide-zinc-100 overflow-y-auto max-h-[620px]">
                {isProofsLoading && pendingProofs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2">
                    <Loader2 size={24} className="animate-spin text-zinc-400" />
                    <p className="text-xs text-zinc-500 font-mono">Loading pending proofs...</p>
                  </div>
                ) : filteredProofs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center p-6">
                    <CheckCircle2 size={32} className="text-zinc-300 mb-2" />
                    <p className="text-sm font-medium text-zinc-900">All caught up!</p>
                    <p className="text-xs text-zinc-500 mt-1">No pending deposit slips awaiting verification.</p>
                  </div>
                ) : (
                  filteredProofs.map((p) => {
                    const isSelected = selectedProof?.transaction_id === p.transaction_id;
                    return (
                      <button
                        key={p.transaction_id}
                        type="button"
                        onClick={() => setSelectedProof(p)}
                        className={`w-full p-4 text-left transition-all ${
                          isSelected
                            ? 'bg-zinc-100/90 border-l-4 border-l-zinc-900'
                            : 'hover:bg-zinc-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-[10px] text-zinc-500 font-medium">
                              {p.application_no}
                            </span>
                            <h4 className="text-xs font-semibold text-zinc-900 line-clamp-1">
                              {p.business_name}
                            </h4>
                            <p className="text-[11px] text-zinc-500 mt-0.5">{p.owner_name}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              p.tendered_type === 'GCash'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {p.tendered_type}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs border-t border-zinc-200/60 pt-2 font-mono">
                          <span className="text-[11px] text-zinc-500">Ref: {p.payment_reference_no}</span>
                          <span className="font-bold text-zinc-900">
                            ₱{Number(p.amount_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT PANEL: PREVIEW & REVIEW ACTIONS (7 COLS) */}
            <div className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-sm lg:col-span-7 overflow-hidden">
              {!selectedProof ? (
                <div className="flex flex-col items-center justify-center py-32 text-center p-8">
                  <FileText size={36} className="text-zinc-300 mb-3" />
                  <h3 className="text-base font-semibold text-zinc-900">No Proof Selected</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mt-1">
                    Select an application from the pending queue on the left to inspect the deposit slip and release the permit.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {/* Proof details header */}
                  <div className="border-b border-zinc-200 bg-zinc-50 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            {selectedProof.application_no}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              selectedProof.tendered_type === 'GCash'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {selectedProof.tendered_type}
                          </span>
                        </div>
                        <h2 className="mt-1 text-lg font-bold text-zinc-900">{selectedProof.business_name}</h2>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          Owner: <strong>{selectedProof.owner_name}</strong> • Address: {selectedProof.address}
                        </p>
                      </div>

                      <div className="rounded-lg border border-zinc-200 bg-white p-3 text-left sm:text-right">
                        <span className="block font-mono text-[9px] uppercase tracking-wider text-zinc-400">Total Assessed Due</span>
                        <span className="font-mono text-xl font-bold text-zinc-900">
                          ₱{Number(selectedProof.amount_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-xs font-mono">
                      <div>
                        <span className="block text-[10px] text-zinc-400 uppercase tracking-wider">Reference No</span>
                        <span className="font-bold text-zinc-900">{selectedProof.payment_reference_no}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 uppercase tracking-wider">Payment Date</span>
                        <span className="font-semibold text-zinc-800">{selectedProof.payment_date || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 uppercase tracking-wider">Channel</span>
                        <span className="font-semibold text-zinc-800">{selectedProof.tendered_type}</span>
                      </div>
                    </div>
                  </div>

                  {/* Document preview canvas */}
                  <div className="flex-1 p-5 bg-zinc-100/50 flex flex-col items-center justify-center min-h-[360px]">
                    {selectedProof.proof_url ? (
                      <div className="w-full flex flex-col items-center gap-3">
                        {selectedProof.proof_file_path?.toLowerCase().endsWith('.pdf') ? (
                          <div className="w-full h-[400px] rounded-lg border border-zinc-300 bg-white overflow-hidden shadow-inner flex flex-col items-center justify-center p-6 text-center">
                            <FileText size={48} className="text-zinc-400 mb-2" />
                            <p className="text-sm font-semibold text-zinc-800">PDF Deposit Slip Document</p>
                            <p className="text-xs text-zinc-500 mb-4">{selectedProof.proof_file_path.split('/').pop()}</p>
                            <a
                              href={selectedProof.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors"
                            >
                              <ExternalLink size={14} /> View PDF in New Tab
                            </a>
                          </div>
                        ) : (
                          <div className="relative w-full max-h-[420px] flex flex-col items-center justify-center rounded-lg border border-zinc-300 bg-white p-2 shadow-inner overflow-hidden">
                            <img
                              src={selectedProof.proof_url}
                              alt="Deposit Slip Proof"
                              className="max-h-[380px] w-auto object-contain rounded"
                            />
                            <div className="mt-2 w-full flex justify-end">
                              <a
                                href={selectedProof.proof_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:underline"
                              >
                                <ExternalLink size={13} /> Open Full Size Image
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center p-6 text-zinc-400">
                        <AlertCircle size={32} className="mx-auto mb-2 text-zinc-300" />
                        <p className="text-xs">Preview image unavailable. Storage link may have expired.</p>
                      </div>
                    )}
                  </div>

                  {/* Review Actions Footer */}
                  <div className="border-t border-zinc-200 bg-white p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setShowRejectModal(true)}
                      disabled={isVerifyingProof || isRejectingProof}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
                    >
                      <X size={15} /> Reject / Return Slip
                    </button>

                    <div className="w-full sm:w-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyProof}
                        disabled={isVerifyingProof || isRejectingProof}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {isVerifyingProof ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            <span>Confirming & Issuing OR…</span>
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            <span>Confirm Payment & Issue OR</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* REJECT PROOF MODAL */}
          {showRejectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
              <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle size={20} />
                    <h3 className="text-base font-bold text-zinc-900">Reject Payment Proof</h3>
                  </div>
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="text-xs text-zinc-600 leading-relaxed">
                  Provide specific remarks explaining why this deposit slip is rejected. The application will be returned to <strong>For Payment</strong> so the applicant can submit valid proof.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Rejection Reason / Remarks <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Reference number does not match bank records; deposit slip is blurry..."
                    className="w-full rounded-md border border-zinc-300 p-2 text-xs text-zinc-900 focus:border-red-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(false)}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRejectProof}
                    disabled={isRejectingProof || !rejectionReason.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isRejectingProof && <Loader2 size={13} className="animate-spin" />}
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: OVER-THE-COUNTER CASHIER POS REGISTER                           */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'otc' && (
        <div className="animate-in fade-in">
          {isAssessmentLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              <p className="text-zinc-500 text-xs font-mono">LOADING TERMINAL DATA…</p>
            </div>
          ) : isOtcSuccess ? (
            <div className="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm animate-in zoom-in fade-in duration-300">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Payment Recorded</h2>
              <div className="my-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Official Receipt Number</p>
                <p className="text-lg font-bold text-zinc-900 mt-1">{generatedOrNumber}</p>
              </div>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                The transaction has been posted. The digital E-Resibo and Business Permit are now unlocked for the applicant.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    setIsOtcSuccess(false);
                    setTendered('');
                    navigate(appNo ? `/treasury/cashier` : '/treasury/queue');
                  }}
                >
                  Process Another Payment
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => navigate('/treasury/queue')}
                >
                  Return to Treasury Queue
                </Button>
              </div>
            </div>
          ) : !appNo ? (
            /* Quick Application Selector if no ?app= is supplied */
            <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                  <Banknote size={24} />
                </div>
                <h2 className="text-lg font-bold text-zinc-900">Select Application for Over-the-Counter Payment</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Choose an application in <strong>For Payment</strong> status to record cash or manager check payment.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="text"
                  placeholder="Search application number or business name..."
                  value={appSearchTerm}
                  onChange={(e) => setAppSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto rounded-lg border border-zinc-100">
                {isPayableLoading ? (
                  <div className="py-12 text-center text-xs text-zinc-400">Loading payable applications...</div>
                ) : filteredPayableApps.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-400">No applications currently ready for OTC payment.</div>
                ) : (
                  filteredPayableApps.map((a) => (
                    <button
                      key={a.application_no}
                      type="button"
                      onClick={() => navigate(`/treasury/cashier?app=${a.application_no}&tab=otc`)}
                      className="w-full p-4 flex items-center justify-between hover:bg-zinc-50 text-left transition-colors"
                    >
                      <div>
                        <span className="font-mono text-[10px] text-zinc-500 font-medium">{a.application_no}</span>
                        <p className="text-xs font-bold text-zinc-900">{a.businesses?.business_name || 'Business'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge status={a.status} />
                        <span className="rounded-md bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white">
                          Select
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Cashier Terminal Register */
            <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/treasury/queue')}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900">OTC Cashier POS</h2>
                    <p className="font-mono text-xs font-semibold text-zinc-500">REF: {appNo}</p>
                  </div>
                </div>
                <Badge status={assessment?.status || STATUSES.FOR_PAYMENT} />
              </div>

              {otcError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{otcError}</span>
                </div>
              )}

              {/* Total Due Display */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-white">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                  Total Amount Due
                </p>
                <p className="font-mono text-4xl font-extrabold tracking-tight">
                  ₱{totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Payment Mode Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'Cash', icon: <Banknote size={17} /> },
                    { id: 'Manager Check', icon: <CreditCard size={17} /> },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setOtcMethod(m.id)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold border transition-all ${
                        otcMethod === m.id
                          ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      {m.icon} {m.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Tendered */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                  Amount Tendered (PHP)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={tendered}
                    onChange={(e) => setTendered(e.target.value)}
                    className={`w-full rounded-lg border py-3 pl-4 pr-4 text-right font-mono text-2xl font-bold outline-none transition-colors ${
                      isInsufficient
                        ? 'border-red-400 bg-red-50/50 text-red-900'
                        : 'border-zinc-300 text-zinc-900 focus:border-zinc-900'
                    }`}
                  />
                  {isInsufficient && (
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold uppercase tracking-wider text-red-600">
                      Insufficient Amount
                    </span>
                  )}
                </div>
              </div>

              {/* Change calculation */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                  Change to Return
                </span>
                <span
                  className={`font-mono text-2xl font-bold ${
                    isInsufficient ? 'text-zinc-300' : 'text-emerald-700'
                  }`}
                >
                  ₱{changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Manager Check Fields */}
              {otcMethod === 'Manager Check' && (
                <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 animate-in slide-in-from-top-2">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">Check Number</label>
                    <input
                      type="text"
                      placeholder="CHK-000000"
                      value={checkDetails.number}
                      onChange={(e) => setCheckDetails({ ...checkDetails, number: e.target.value })}
                      className="w-full rounded-md border border-zinc-300 bg-white p-2 font-mono text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">Issuing Bank</label>
                    <input
                      type="text"
                      placeholder="e.g. Land Bank, BDO, DBP"
                      value={checkDetails.bank}
                      onChange={(e) => setCheckDetails({ ...checkDetails, bank: e.target.value })}
                      className="w-full rounded-md border border-zinc-300 bg-white p-2 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Confirm OTC Button */}
              <div className="pt-2">
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  disabled={
                    isInsufficient ||
                    !tendered ||
                    (otcMethod === 'Manager Check' && (!checkDetails.number || !checkDetails.bank))
                  }
                  isLoading={isProcessingOTC}
                  onClick={handleConfirmOTC}
                >
                  Confirm OTC Payment & Issue Receipt
                </Button>
                <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                  Municipal Treasury of Liliw • Official Cashier POS
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CashierPOS;
