import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/apiClient';
import { API_ENDPOINTS } from '../../utils/constants';
import { Card, Button, Badge } from '../../components/ui';
import { RefreshCw, CheckCircle2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const CompletedQueue = () => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifyModal, setNotifyModal] = useState({ open: false, appNo: null, businessName: '' });
  const [notes, setNotes] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

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
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle2 className="text-green-600" />
            Completed Applications
          </h1>
          <p className="text-gray-500">Total: {applications.length}</p>
        </div>
        <Button onClick={fetchCompleted} disabled={isLoading} variant="outline" className="flex items-center gap-2">
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {error ? (
        <Card className="p-8 text-center text-red-600">
          <p>{error}</p>
          <Button onClick={fetchCompleted} className="mt-4" variant="outline">Try Again</Button>
        </Card>
      ) : isLoading ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Loading completed applications...</p>
        </Card>
      ) : applications.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No completed applications found.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Business Name</th>
                  <th className="px-4 py-3 font-semibold">Application No</th>
                  <th className="px-4 py-3 font-semibold">Completed Date</th>
                  <th className="px-4 py-3 font-semibold">Notified</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map(app => (
                  <tr key={app.application_no} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {app.businesses?.business_name || 'N/A'}
                      <div className="text-xs text-gray-500 font-normal">
                        {app.businesses?.taxpayers?.first_name} {app.businesses?.taxpayers?.last_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{app.application_no}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(app.submitted_at)}</td>
                    <td className="px-4 py-3">
                      {app.cert_notified_at ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle2 size={12} strokeWidth={3} />
                            Notified
                          </span>
                          <span className="text-xs text-gray-500">{formatDate(app.cert_notified_at)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button 
                        size="sm" 
                        onClick={() => openNotifyModal(app.application_no, app.businesses?.business_name)}
                        className={app.cert_notified_at ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : ""}
                        variant={app.cert_notified_at ? "ghost" : "primary"}
                      >
                        {app.cert_notified_at ? 'Re-notify' : 'Notify Applicant'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Notify Modal */}
      {notifyModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900">Notify Applicant</h3>
              <button onClick={closeNotifyModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="mb-4 text-sm text-gray-600 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                You are about to notify <strong>{notifyModal.businessName}</strong> ({notifyModal.appNo}) that their permit is ready for download.
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Notes / Instructions (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g., Please claim your physical permit at Window 3..."
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  rows={4}
                  maxLength={500}
                />
                <div className="text-right text-xs text-gray-500">
                  {notes.length}/500
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" onClick={closeNotifyModal} disabled={isSending}>
                Cancel
              </Button>
              <Button onClick={handleSendNotification} isLoading={isSending}>
                Send Notification
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletedQueue;
