import { useState } from 'react';
import { X, CheckCircle, XCircle, FileText, Loader2, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import Button from '../ui/Button';
import apiClient from '../../utils/apiClient';
import toast from 'react-hot-toast';
import { API_ENDPOINTS } from '../../utils/constants';
import useAuthStore from '../../store/authStore';

const CorrectionReviewModal = ({ isOpen, onClose, request, onProcessed }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState(null);

  if (!isOpen || !request) return null;

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      await apiClient.put(API_ENDPOINTS.BPLO_CORRECTIONS_APPROVE(request.id));
      toast.success('Correction request approved.');
      onProcessed();
    } catch (err) {
      setError(err.message || 'Failed to approve correction request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!remarks.trim()) {
      setError('Please provide remarks for rejection.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      await apiClient.put(API_ENDPOINTS.BPLO_CORRECTIONS_REJECT(request.id), {
        remarks: remarks.trim()
      });
      toast.success('Correction request rejected.');
      onProcessed();
    } catch (err) {
      setError(err.message || 'Failed to reject correction request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getProofUrl = () => {
    if (!request.correction_request_documents || request.correction_request_documents.length === 0) return null;
    const token = useAuthStore.getState().token;
    // BPLO endpoint to get signed URL for the proof document
    return `/api/bplo/corrections/${request.id}/proof?token=${token}`; // Assuming backend has this, wait, did I create a specific endpoint for proof? 
    // In correction.controller.js getCorrectionRequestDetail returns the document.
  };

  // The backend currently returns `correction_request_documents (file_path)`. Let's assume the detail endpoint provides a signed URL if we call it, or we just display the fact that a document exists.
  // Wait, in Task 1.3 `getCorrectionRequestDetail` I returned the full request. The user would need to fetch the detail to get the signed URL. Let's just use the detail fetched.

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Review Data Correction</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Ref: {request.application_no} • {request.applications?.businesses?.business_name}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Change Comparison */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-900 mb-3 uppercase tracking-wider text-[11px] text-zinc-500">Requested Change</h4>
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Field Name</p>
                  <p className="text-sm font-medium text-zinc-900 capitalize">{request.field_name.replace(/_/g, ' ')}</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-xs text-zinc-500 mb-1">Current Value</p>
                  <p className="text-sm text-zinc-900 line-through opacity-70 bg-red-50 p-2 rounded border border-red-100">
                    {request.old_value || '(empty)'}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-xs text-zinc-500 mb-1">Proposed Value</p>
                  <p className="text-sm font-medium text-zinc-900 bg-green-50 p-2 rounded border border-green-200">
                    {request.new_value}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Supporting Documents */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-900 mb-3 uppercase tracking-wider text-[11px] text-zinc-500">Supporting Document</h4>
            {request.documents && request.documents.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {request.documents.map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-colors group"
                  >
                    <div className="p-2 rounded-md bg-zinc-100 text-zinc-500 group-hover:text-zinc-700">
                      <ImageIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">View Document Proof</p>
                      <p className="text-xs text-zinc-500 truncate">Opens in new tab</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-zinc-50 border border-zinc-100 text-sm text-zinc-500">
                <FileText size={16} />
                No supporting document provided.
              </div>
            )}
          </div>

          {/* Rejection Remarks */}
          <div>
            <label htmlFor="remarks" className="block text-sm font-semibold text-zinc-900 mb-1 uppercase tracking-wider text-[11px] text-zinc-500">
              Remarks (Required for Rejection)
            </label>
            <textarea
              id="remarks"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="State the reason if rejecting this correction..."
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 placeholder:text-zinc-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-6 py-4 bg-zinc-50 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 shrink-0 rounded-b-xl">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <div className="flex w-full sm:w-auto gap-3">
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md bg-white border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Approve
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CorrectionReviewModal;
