import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/apiClient';
import { API_ENDPOINTS } from '../../utils/constants';
import { Card, Button, Badge } from '../../components/ui';
import { RefreshCw, CheckCircle2, X, Calendar, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const CompletedQueue = () => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifyModal, setNotifyModal] = useState({ open: false, appNo: null, businessName: '' });
  const [notes, setNotes] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED'

  const fetchCompleted = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(API_ENDPOINTS.BPLO_COMPLETED);
      setApplications(data || []);
    } catch (err) {
      console.error('Failed to fetch completed apps:', err);
      setError('Failed to load completed applications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompleted();
  }, []);

  const openNotifyModal = (appNo, businessName) => {
    setNotifyModal({ open: true, appNo, businessName });
    setNotes('');
  };

  const closeNotifyModal = () => {
    setNotifyModal({ open: false, appNo: null, businessName: '' });
    setNotes('');
  };

  const handleSendNotification = async () => {
    if (!notifyModal.appNo) return;
    setIsSending(true);
    try {
      await apiClient.post(API_ENDPOINTS.BPLO_NOTIFY_READY(notifyModal.appNo), {
        notes: notes.trim() || undefined
      });
      toast.success('Applicant notified successfully.');
      closeNotifyModal();
      fetchCompleted();
    } catch (err) {
      toast.error(err.message || 'Failed to send notification.');
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  // Compute validity status for each app
  const getValidityMeta = (app) => {
    const permit = Array.isArray(app.permits) ? app.permits[0] : app.permits;
    if (!permit || !permit.expires_at) {
      return { status: 'UNKNOWN', label: 'No Permit Issued', days: null, permitNo: '—' };
    }
    const expiresAt = new Date(permit.expires_at);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return { status: 'EXPIRED', label: 'Expired', days, permitNo: permit.permit_no, expiresAt };
    }
    if (days <= 30) {
      return { status: 'EXPIRING', label: `Expiring Soon (${days}d left)`, days, permitNo: permit.permit_no, expiresAt };
    }
    return { status: 'ACTIVE', label: `Active (${days}d left)`, days, permitNo: permit.permit_no, expiresAt };
  };

  // Filter applications by tab
  const filteredApplications = applications.filter((app) => {
    if (filterTab === 'ALL') return true;
    const meta = getValidityMeta(app);
    return meta.status === filterTab;
  });

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-zinc-900">
            <CheckCircle2 className="text-emerald-600" />
            Completed Applications & Issued Permits
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            Permitted establishments in Liliw with real-time validity window monitoring
          </p>
        </div>
        <Button onClick={fetchCompleted} disabled={isLoading} variant="outline" className="flex items-center gap-2">
          <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs (Revision 6 & 11) */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { key: 'ALL', label: 'All Completed', count: applications.length },
          { key: 'ACTIVE', label: 'Active Permits', count: applications.filter(a => getValidityMeta(a).status === 'ACTIVE').length },
          { key: 'EXPIRING', label: 'Expiring Soon (< 30d)', count: applications.filter(a => getValidityMeta(a).status === 'EXPIRING').length },
          { key: 'EXPIRED', label: 'Expired Permits', count: applications.filter(a => getValidityMeta(a).status === 'EXPIRED').length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filterTab === tab.key
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              filterTab === tab.key ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {error ? (
        <Card className="p-8 text-center text-red-600">
          <p>{error}</p>
          <Button onClick={fetchCompleted} className="mt-4" variant="outline">Try Again</Button>
        </Card>
      ) : isLoading ? (
        <Card className="p-8 text-center">
          <p className="text-zinc-500 text-xs">Loading completed applications and permits…</p>
        </Card>
      ) : filteredApplications.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-zinc-500 text-xs">No applications match the selected validity filter.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-700 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Business & Taxpayer</th>
                  <th className="px-4 py-3 font-semibold">Application No & BIN</th>
                  <th className="px-4 py-3 font-semibold">Permit Validity Window</th>
                  <th className="px-4 py-3 font-semibold">Applicant Notified</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredApplications.map(app => {
                  const validity = getValidityMeta(app);
                  return (
                    <tr key={app.application_no} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {app.businesses?.business_name || 'N/A'}
                        <div className="text-[11px] text-zinc-500 font-normal">
                          {app.businesses?.taxpayers?.first_name} {app.businesses?.taxpayers?.last_name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-zinc-800 font-semibold">{app.application_no}</span>
                        {app.businesses?.bin && (
                          <div className="font-mono text-[10px] text-zinc-500">
                            {app.businesses.bin}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-[10px] ${
                            validity.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : validity.status === 'EXPIRING'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : validity.status === 'EXPIRED'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-zinc-100 text-zinc-600'
                          }`}>
                            <Calendar size={11} />
                            {validity.label}
                          </span>
                          <div className="font-mono text-[11px] text-zinc-600">
                            {validity.permitNo} · Valid until Dec 31
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {app.cert_notified_at ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                              <CheckCircle2 size={11} strokeWidth={2.5} />
                              Notified
                            </span>
                            <span className="text-[10px] text-zinc-400">{formatDate(app.cert_notified_at)}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button 
                          size="sm" 
                          onClick={() => openNotifyModal(app.application_no, app.businesses?.business_name)}
                          className={app.cert_notified_at ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 text-xs" : "text-xs"}
                          variant={app.cert_notified_at ? "ghost" : "primary"}
                        >
                          {app.cert_notified_at ? 'Re-notify' : 'Notify Applicant'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Notify Modal */}
      {notifyModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <h3 className="font-bold text-base text-zinc-900">Notify Applicant</h3>
              <button onClick={closeNotifyModal} className="text-zinc-400 hover:text-zinc-600 p-1 rounded-md transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="mb-4 text-xs text-zinc-600 bg-blue-50/70 p-3 rounded-lg border border-blue-100">
                You are about to notify <strong>{notifyModal.businessName}</strong> ({notifyModal.appNo}) that their business permit is ready for download.
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700">
                  Notes / Instructions (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g., Please claim your physical permit plate and sticker at BPLO Window 3..."
                  className="w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-zinc-900 focus:outline-hidden"
                  rows={4}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-2">
              <Button onClick={closeNotifyModal} variant="ghost" disabled={isSending}>
                Cancel
              </Button>
              <Button onClick={handleSendNotification} disabled={isSending}>
                {isSending ? 'Sending…' : 'Send Notification'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletedQueue;
