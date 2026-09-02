import React, { useState, useEffect } from 'react';
import { PenTool, CheckCircle, Loader2, RefreshCw, XCircle, FileText, AlertCircle } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import toast from 'react-hot-toast';
import { API_ENDPOINTS } from '../../utils/constants';
import CorrectionReviewModal from '../../components/bplo/CorrectionReviewModal';

const CorrectionQueue = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Review Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(API_ENDPOINTS.BPLO_CORRECTIONS_PENDING);
      setRequests(response.data || []);
    } catch (err) {
      toast.error('Failed to load pending correction requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleReviewClick = async (id) => {
    try {
      setIsDetailLoading(true);
      const res = await apiClient.get(API_ENDPOINTS.BPLO_CORRECTIONS_DETAIL(id));
      if (res.success) {
        setSelectedRequest(res.data);
      } else {
        toast.error('Failed to load request details.');
      }
    } catch (err) {
      toast.error('Failed to load request details.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleModalClose = () => {
    setSelectedRequest(null);
  };

  const handleModalProcessed = () => {
    setSelectedRequest(null);
    fetchQueue(); // Refresh queue
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Data Correction Queue
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve pending data corrections submitted by applicants.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchQueue}
            className="p-2.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition-all text-gray-500 hover:text-gray-900"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <PenTool size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400">No pending correction requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-gray-100 rounded-3xl p-5 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] transition-all duration-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                {/* Left: Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <PenTool size={16} className="text-gray-400" />
                    <span className="font-bold text-gray-900">
                      {item.applications?.businesses?.business_name || 'Unknown Business'}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-semibold bg-yellow-100 text-yellow-800">
                      {item.status}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 text-sm text-gray-600 pl-6">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 w-24">Application No:</span>
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{item.application_no}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 w-24">Field to Correct:</span>
                      <span className="capitalize bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium border border-blue-100">
                        {item.field_name.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-gray-400 line-through text-xs px-2 py-0.5 rounded bg-gray-50 border border-gray-100">{item.old_value || '(empty)'}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-gray-900 bg-green-50 px-2 py-0.5 rounded border border-green-100 text-xs">{item.new_value}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 pl-6 flex items-center gap-1">
                    Submitted on {formatDate(item.created_at)}
                  </p>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col gap-2 sm:items-end self-center sm:self-start mt-4 sm:mt-0">
                  <button
                    onClick={() => handleReviewClick(item.id)}
                    disabled={isDetailLoading}
                    className="px-5 py-2.5 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                  >
                    {isDetailLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <FileText size={14} />
                    )}
                    Review Correction
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <CorrectionReviewModal
        isOpen={!!selectedRequest}
        onClose={handleModalClose}
        request={selectedRequest}
        onProcessed={handleModalProcessed}
      />
    </div>
  );
};

export default CorrectionQueue;
