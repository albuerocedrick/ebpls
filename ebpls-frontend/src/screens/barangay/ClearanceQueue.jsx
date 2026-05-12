/**
 * ClearanceQueue.jsx — Barangay Module
 * Pending clearance requests with issue/reject actions.
 * Phase 6: Built with real data from GET /api/barangay/clearances/pending.
 * RBAC: Accessible by Barangay_Officer role only.
 */

import React, { useState, useEffect } from 'react';
import { ClipboardCheck, CheckCircle2, XCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import apiClient from '../../utils/apiClient';
import { toast } from 'react-hot-toast';

const ClearanceQueue = () => {
  const [clearances, setClearances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClearance, setSelectedClearance] = useState(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [remarks, setRemarks] = useState('');

  // Fetch pending clearances on mount
  useEffect(() => {
    fetchPendingClearances();
  }, []);

  // Inside your ClearanceQueue.jsx

const fetchPendingClearances = async () => {
    try {
        // 1. Ask the backend for the data
        const response = await apiClient.get('/api/barangay/clearances/pending');
        
        // 2. Safely unpack the data 
        const fetchedData = response.data?.data || response.data;
        
        // 3. Ensure it is ALWAYS an array (prevents map() crashes)
        setClearances(Array.isArray(fetchedData) ? fetchedData : []); 
        
    } catch (error) {
        console.error("Fetch error:", error);
    } finally {
        // 4. CRITICAL: Tell the UI to stop spinning, whether it succeeded or failed!
        setLoading(false); 
    }
};

  const handleIssue = async (id) => {
    try {
      await apiClient.put(`/api/barangay/clearances/${id}/issue`);
      toast.success('Clearance Issued Successfully');
      fetchPendingClearances(); // Refresh the queue to remove the issued item
    } catch (error) {
      console.error(error);
      toast.error('Failed to issue clearance');
    }
  };

 const handleReject = async () => {
    // 1. FRONTEND VALIDATION
    if (!remarks || remarks.trim() === "") {
        toast.error("Remarks are mandatory for rejection.");
        return; 
    }

    try {
        // 2. THE ACTUAL API CALL (Using the correct state variable: selectedClearance.id)
        await apiClient.put(`/api/barangay/clearances/${selectedClearance.id}/reject`, { 
            remarks: remarks 
        });

        // 3. THE SUCCESS NOTIFICATION
        toast.success("Clearance rejected successfully.");

        // 4. CLOSE THE MODAL & CLEAR TEXT (Using the correct state setters)
        setIsRejectModalOpen(false); 
        setRemarks(''); // This empties the box for the next time you open it

        // 5. REFRESH THE TABLE DATA
        fetchPendingClearances();

    } catch (error) {
        toast.error(error.response?.data?.message || "Failed to reject clearance.");
    }
  };

  return (
    <div className="flex flex-col gap-6 relative">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--color-text))]">Clearance Queue</h1>
        <p className="text-sm text-[hsl(var(--color-text-muted))] mt-1">
          Review and issue barangay clearances for pending applications.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Pending Clearances', value: clearances.length, color: 'text-[hsl(var(--color-status-pending))]' },
          { label: 'Action Needed', value: clearances.length, color: 'text-[hsl(var(--color-status-verified))]' },
        ].map((stat) => (
          <Card key={stat.label} padding="md" className="text-center">
            <p className={`text-3xl font-bold ${stat.color}`}>{loading ? '-' : stat.value}</p>
            <p className="text-xs text-[hsl(var(--color-text-muted))] mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Queue */}
      <Card padding="none">
        <Card.Header>
          <div className="flex items-center gap-2">
            <ClipboardCheck size={16} className="text-[hsl(var(--color-text-muted))]" />
            <p className="text-sm font-semibold text-[hsl(var(--color-text))]">Pending Requests</p>
          </div>
        </Card.Header>
        <Card.Body className="!p-0">
          <div className="divide-y divide-border">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-[hsl(var(--color-text-muted))]">
                Loading clearances...
              </div>
            ) : clearances.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[hsl(var(--color-text-muted))]">
                No pending clearances found.
              </div>
            ) : (
              clearances.map((item) => (
                <div key={item.id} className="px-4 py-3 hover:bg-surface-tint transition-colors duration-150">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--color-text))]">
                        {/* Fallback to application_no if your backend hasn't joined the business name yet */}
                        App No: {item.application_no}
                      </p>
                      <p className="text-xs text-[hsl(var(--color-text-muted))] mt-0.5">
                        Clearance ID: {item.id} &middot; Type: {item.clearance_types?.name || 'Barangay Clearance'}
                      </p>
                    </div>
                    {/* Ensure your Badge component can handle the backend status format */}
                    <Badge status={item.status || 'Pending'} />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      variant="primary" 
                      size="sm" 
                      leftIcon={<CheckCircle2 size={14} />} 
                      onClick={() => handleIssue(item.id)}
                    >
                      Issue Clearance
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm" 
                      leftIcon={<XCircle size={14} />} 
                      onClick={() => {
                        setSelectedClearance(item);
                        setIsRejectModalOpen(true);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card.Body>
        <Card.Footer>
          <p className="text-xs text-[hsl(var(--color-text-muted))] text-center">
            Phase 6 fully wired.
          </p>
        </Card.Footer>
      </Card>

      {/* Rejection Modal (Built using standard Tailwind overlay to ensure compatibility) */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Reject Clearance Request</h2>
            <p className="text-sm text-gray-600 mb-4">
              You are rejecting clearance for App No: <strong>{selectedClearance?.application_no}</strong>. 
              Please provide the required remarks below. This will be emailed to the applicant.
            </p>
            <textarea 
              className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              rows="4"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="State the specific reason for rejection..."
            />
            <div className="flex justify-end gap-2">
              <Button 
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRemarks('');
                }} 
                variant="secondary"
              >
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