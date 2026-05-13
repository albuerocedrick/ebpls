// src/screens/bplo/RetirementQueue.jsx
// BPLO Retirement Queue — Phase 7

import React, { useState, useEffect } from 'react';
import { Building2, CheckCircle, Clock, Loader2, AlertTriangle, User, Calendar, RefreshCw, XCircle } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Assessed: 'bg-blue-100 text-blue-800',
  Paid: 'bg-green-100 text-green-800',
  Completed: 'bg-gray-100 text-gray-600',
};

const RetirementQueue = () => {
  const [retirements, setRetirements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter] = useState('');

  // Complete Retirement Modal
  const [completingItem, setCompletingItem] = useState(null);

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      const params = filter ? `?status=${filter}` : '';
      const response = await apiClient.get(`/api/retirement/queue${params}`);
      setRetirements(response.data || []);
    } catch (err) {
      toast.error('Failed to load retirement queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [filter]);

  const handleAcknowledge = async (id) => {
    try {
      setActionLoading(id);
      await apiClient.put(`/api/retirement/${id}/acknowledge`);
      toast.success('Retirement acknowledged and forwarded to Treasury.');
      fetchQueue();
    } catch (err) {
      toast.error(err.message || 'Failed to acknowledge.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async () => {
    if (!completingItem) return;
    try {
      setActionLoading(completingItem.id);
      await apiClient.put(`/api/retirement/${completingItem.id}/complete`);
      toast.success('Business retirement completed.');
      setCompletingItem(null);
      fetchQueue();
    } catch (err) {
      toast.error(err.message || 'Failed to complete retirement.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[hsl(var(--color-text))]">
            Business Retirement Queue
          </h1>
          <p className="text-sm text-[hsl(var(--color-text-muted))]">
            Review and process business retirement applications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[hsl(var(--color-border))] bg-[hsl(var(--color-surface))] text-sm text-[hsl(var(--color-text))]"
          >
            <option value="">All Active</option>
            <option value="Pending">Pending</option>
            <option value="Assessed">Assessed</option>
            <option value="Paid">Paid</option>
            <option value="Completed">Completed</option>
          </select>
          <button
            onClick={fetchQueue}
            className="p-2 rounded-lg border border-[hsl(var(--color-border))] hover:bg-[hsl(var(--color-surface-alt))] transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[hsl(var(--color-text-muted))]" />
        </div>
      ) : retirements.length === 0 ? (
        <div className="text-center py-12">
          <Building2 size={40} className="mx-auto text-[hsl(var(--color-border))] mb-3" />
          <p className="text-[hsl(var(--color-text-muted))]">No retirement applications found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {retirements.map((item) => (
            <div
              key={item.id}
              className="border border-[hsl(var(--color-border))] rounded-lg p-4 bg-[hsl(var(--color-surface))] hover:shadow-sm transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                {/* Left: Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-[hsl(var(--color-text-muted))]" />
                    <span className="font-semibold text-[hsl(var(--color-text))]">
                      {item.businesses?.business_name || 'Unknown Business'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                      {item.status}
                    </span>
                  </div>

                  {item.businesses?.trade_name && (
                    <p className="text-xs text-[hsl(var(--color-text-muted))] ml-6">
                      Trade: {item.businesses.trade_name}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-[hsl(var(--color-text-muted))]">
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      {item.submitter?.first_name} {item.submitter?.last_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Cessation: {formatDate(item.cessation_date)}
                    </span>
                    <span>
                      Amount Due: ₱{Number(item.final_gross_sales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <p className="text-sm text-[hsl(var(--color-text))] mt-1">
                    <span className="font-medium">Reason:</span> {item.reason}
                  </p>

                  {item.acknowledged_at && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle size={12} />
                      Acknowledged on {formatDate(item.acknowledged_at)}
                    </p>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col gap-2 sm:items-end">
                  {item.status === 'Pending' && !item.acknowledged_at && (
                    <button
                      onClick={() => handleAcknowledge(item.id)}
                      disabled={actionLoading === item.id}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {actionLoading === item.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle size={14} />
                      )}
                      Acknowledge
                    </button>
                  )}

                  {item.status === 'Paid' && (
                    <button
                      onClick={() => setCompletingItem(item)}
                      disabled={actionLoading === item.id}
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {actionLoading === item.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle size={14} />
                      )}
                      Complete Retirement
                    </button>
                  )}

                  {item.status === 'Assessed' && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <Clock size={12} />
                      Awaiting OTC Payment
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* COMPLETE RETIREMENT MODAL */}
      {completingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Complete Retirement</h2>
                <p className="text-sm text-gray-500">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-gray-500" />
                  <span className="font-semibold text-gray-900">
                    {completingItem.businesses?.business_name}
                  </span>
                </div>
                {completingItem.businesses?.trade_name && (
                  <p className="text-sm text-gray-500 ml-6">
                    Trade Name: {completingItem.businesses.trade_name}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-sm text-gray-600 ml-6">
                  <span>Applicant: {completingItem.submitter?.first_name} {completingItem.submitter?.last_name}</span>
                  <span>Cessation: {formatDate(completingItem.cessation_date)}</span>
                </div>
              </div>

              <div className="border border-red-200 bg-red-50 rounded-lg p-3">
                <p className="text-sm text-red-800 font-medium flex items-center gap-2">
                  <XCircle size={16} />
                  By completing this retirement:
                </p>
                <ul className="text-sm text-red-700 mt-2 ml-6 list-disc space-y-1">
                  <li>The business will be permanently marked as <strong>retired</strong></li>
                  <li>No further permit applications can be filed for this business</li>
                  <li>The applicant will receive a retirement confirmation email</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setCompletingItem(null)}
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={actionLoading === completingItem.id}
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === completingItem.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                Yes, Complete Retirement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetirementQueue;
