// src/screens/treasury/RetirementAssess.jsx
// Treasury Officer — Assess & Record Payment for Business Retirements (Phase 7)

import React, { useState, useEffect } from 'react';
import { Building2, DollarSign, Loader2, CheckCircle, Clock, RefreshCw, Plus, Trash2 } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Assessed: 'bg-blue-100 text-blue-800',
  Paid: 'bg-green-100 text-green-800',
  Completed: 'bg-gray-100 text-gray-600',
};

const RetirementAssess = () => {
  const [retirements, setRetirements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Assess modal state
  const [assessingId, setAssessingId] = useState(null);
  const [lineItems, setLineItems] = useState([{ fee_type_id: 1, amount: '' }]);

  // Payment modal state
  const [payingId, setPayingId] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    or_number: '',
    amount_tendered: '',
    tendered_type: 'Cash',
    check_number: '',
    bank_name: '',
  });

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/api/retirement/queue');
      setRetirements(response.data || []);
    } catch (err) {
      toast.error('Failed to load retirement queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // --- ASSESS HANDLERS ---
  const openAssessModal = (id) => {
    setAssessingId(id);
    setLineItems([{ fee_type_id: 1, amount: '' }]);
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { fee_type_id: 2, amount: '' }]);
  };

  const removeLineItem = (idx) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateLineItem = (idx, field, value) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleAssess = async () => {
    const items = lineItems
      .filter((item) => item.amount && Number(item.amount) > 0)
      .map((item) => ({ fee_type_id: Number(item.fee_type_id), amount: Number(item.amount) }));

    if (items.length === 0) {
      toast.error('Add at least one fee with a valid amount.');
      return;
    }

    try {
      setActionLoading(assessingId);
      await apiClient.put(`/api/retirement/${assessingId}/assess`, { line_items: items });
      toast.success('Retirement assessed successfully.');
      setAssessingId(null);
      fetchQueue();
    } catch (err) {
      toast.error(err.message || 'Failed to assess.');
    } finally {
      setActionLoading(null);
    }
  };

  // --- PAYMENT HANDLERS ---
  const openPaymentModal = (id, totalAmount) => {
    setPayingId(id);
    setPaymentForm({
      or_number: '',
      amount_tendered: totalAmount ? String(totalAmount) : '',
      tendered_type: 'Cash',
      check_number: '',
      bank_name: '',
    });
  };

  const handlePayment = async () => {
    if (!paymentForm.or_number) {
      toast.error('OR number is required.');
      return;
    }
    if (!paymentForm.amount_tendered || Number(paymentForm.amount_tendered) <= 0) {
      toast.error('Valid amount tendered is required.');
      return;
    }
    if (paymentForm.tendered_type === 'Manager Check' && (!paymentForm.check_number || !paymentForm.bank_name)) {
      toast.error('Check number and bank name are required for Manager Check.');
      return;
    }

    try {
      setActionLoading(payingId);
      await apiClient.put(`/api/retirement/${payingId}/record-payment`, {
        or_number: paymentForm.or_number,
        amount_tendered: Number(paymentForm.amount_tendered),
        tendered_type: paymentForm.tendered_type,
        check_number: paymentForm.check_number || undefined,
        bank_name: paymentForm.bank_name || undefined,
      });
      toast.success('Payment recorded successfully.');
      setPayingId(null);
      fetchQueue();
    } catch (err) {
      toast.error(err.message || 'Failed to record payment.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Retirement Assessments</h1>
          <p className="text-sm text-gray-500 mt-1">Assess final taxes and record OTC payments for business retirements.</p>
        </div>
        <button
          onClick={fetchQueue}
          className="p-2.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-all"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : retirements.length === 0 ? (
        <div className="text-center py-12">
          <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">No retirement applications in queue.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {retirements.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg p-4 bg-white"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {item.businesses?.business_name || 'Unknown'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status]}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                    <span>Applicant: {item.submitter?.first_name} {item.submitter?.last_name}</span>
                    <span>Cessation: {formatDate(item.cessation_date)}</span>
                    <span>Gross Sales: ₱{Number(item.final_gross_sales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-sm text-gray-600">Reason: {item.reason}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {item.status === 'Pending' && (
                    <button
                      onClick={() => openAssessModal(item.id)}
                      className="px-4 py-2 rounded-2xl bg-gray-900 hover:bg-gray-800 text-gray-900 text-sm font-medium transition-colors flex items-center gap-1.5"
                    >
                      <DollarSign size={14} />
                      Assess
                    </button>
                  )}
                  {item.status === 'Assessed' && (
                    <button
                      onClick={() => openPaymentModal(item.id, item.final_gross_sales)}
                      className="px-4 py-2 rounded-2xl bg-green-600 hover:bg-green-700 text-gray-900 text-sm font-medium transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle size={14} />
                      Record Payment
                    </button>
                  )}
                  {item.status === 'Paid' && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle size={12} /> Paid — Awaiting Completion
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ASSESS MODAL */}
      {assessingId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Assess Retirement</h2>
            <p className="text-sm text-gray-500 mb-4">Add fee line items for the final tax computation.</p>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={item.fee_type_id}
                    onChange={(e) => updateLineItem(idx, 'fee_type_id', e.target.value)}
                    className="flex-1 px-2 py-2 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-4 focus:ring-gray-100 focus:border-gray-400 transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                  >
                    <option value="1" className="bg-gray-50 text-gray-900">Mayor&#39;s Permit Fee</option>
                    <option value="2" className="bg-gray-50 text-gray-900">Business Tax</option>
                    <option value="3" className="bg-gray-50 text-gray-900">Sanitary Inspection Fee</option>
                    <option value="4" className="bg-gray-50 text-gray-900">Zoning / Occupancy Fee</option>
                    <option value="5" className="bg-gray-50 text-gray-900">Garbage Collection Fee</option>
                    <option value="6" className="bg-gray-50 text-gray-900">Environmental Fee</option>
                    <option value="7" className="bg-gray-50 text-gray-900">Weight and Measures Fee</option>
                    <option value="8" className="bg-gray-50 text-gray-900">Fire Safety Inspection Fee</option>
                  </select>
                  <input
                    type="number"
                    placeholder="₱ Amount"
                    value={item.amount}
                    onChange={(e) => updateLineItem(idx, 'amount', e.target.value)}
                    className="w-28 px-2 py-2 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-4 focus:ring-gray-100 focus:border-gray-400 transition-all placeholder:text-gray-900/40"
                    min="0"
                    step="0.01"
                  />
                  {lineItems.length > 1 && (
                    <button onClick={() => removeLineItem(idx)} className="text-red-400 hover:text-red-300">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addLineItem}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Plus size={14} /> Add Line Item
            </button>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setAssessingId(null)}
                className="px-4 py-2 rounded-2xl border border-gray-200 text-gray-700 text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAssess}
                disabled={actionLoading === assessingId}
                className="px-4 py-2 rounded-2xl bg-gray-900 hover:bg-gray-800 text-gray-900 text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading === assessingId ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />}
                Confirm Assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {payingId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Record OTC Payment</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">OR Number</label>
                <input
                  type="text"
                  value={paymentForm.or_number}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, or_number: e.target.value }))}
                  placeholder="e.g. RET-2026-0001"
                  className="w-full px-3 py-2 rounded bg-gray-100 border border-gray-200 text-gray-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Amount Tendered (₱)</label>
                <input
                  type="number"
                  value={paymentForm.amount_tendered}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, amount_tendered: e.target.value }))}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 rounded bg-gray-100 border border-gray-200 text-gray-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Payment Type</label>
                <select
                  value={paymentForm.tendered_type}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, tendered_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded bg-gray-100 border border-gray-200 text-gray-900 text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="Manager Check">Manager Check</option>
                </select>
              </div>

              {paymentForm.tendered_type === 'Manager Check' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Check Number</label>
                    <input
                      type="text"
                      value={paymentForm.check_number}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, check_number: e.target.value }))}
                      className="w-full px-3 py-2 rounded bg-gray-100 border border-gray-200 text-gray-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={paymentForm.bank_name}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, bank_name: e.target.value }))}
                      className="w-full px-3 py-2 rounded bg-gray-100 border border-gray-200 text-gray-900 text-sm"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setPayingId(null)}
                className="px-4 py-2 rounded-2xl border border-gray-200 text-gray-700 text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={actionLoading === payingId}
                className="px-4 py-2 rounded-2xl bg-green-600 hover:bg-green-700 text-gray-900 text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading === payingId ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetirementAssess;
