// src/screens/applicant/RetirementForm.jsx
// Business Retirement Submission Form — Phase 7

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Calendar, DollarSign, FileText, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { ROUTES } from '../../utils/constants';
import toast from 'react-hot-toast';

const RetirementForm = () => {
  const navigate = useNavigate();

  // State
  const [businesses, setBusinesses] = useState([]);
  const [isLoadingBiz, setIsLoadingBiz] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    business_id: '',
    reason: '',
    cessation_date: '',
    final_gross_sales: '',
  });
  const [errors, setErrors] = useState({});

  // Fetch applicant's active (non-retired) businesses
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        setIsLoadingBiz(true);
        const response = await apiClient.get('/api/retirement/my-businesses');
        setBusinesses(response.data || []);
      } catch (err) {
        // Fallback: try fetching from applications endpoint
        try {
          const fallback = await apiClient.get('/api/applications/my-businesses');
          setBusinesses(fallback.data || []);
        } catch {
          console.warn('Could not fetch businesses');
          setBusinesses([]);
        }
      } finally {
        setIsLoadingBiz(false);
      }
    };
    fetchBusinesses();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!formData.business_id) newErrors.business_id = 'Please select a business.';
    if (!formData.reason.trim()) newErrors.reason = 'Reason for retirement is required.';
    if (!formData.cessation_date) newErrors.cessation_date = 'Cessation date is required.';
    
    // Cessation date cannot be in the future
    if (formData.cessation_date && new Date(formData.cessation_date) > new Date()) {
      newErrors.cessation_date = 'Cessation date cannot be in the future.';
    }

    if (formData.final_gross_sales && Number(formData.final_gross_sales) < 0) {
      newErrors.final_gross_sales = 'Gross sales cannot be negative.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        business_id: formData.business_id,
        reason: formData.reason.trim(),
        cessation_date: formData.cessation_date,
        final_gross_sales: Number(formData.final_gross_sales) || 0,
      };

      await apiClient.post('/api/retirement/submit', payload);
      toast.success('Retirement application submitted successfully.');
      navigate(ROUTES.APPLICANT_DASHBOARD);
    } catch (err) {
      toast.error(err.message || 'Failed to submit retirement application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get today's date in YYYY-MM-DD format for max attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(ROUTES.APPLICANT_DASHBOARD)}
          className="flex items-center gap-1 text-sm text-[hsl(var(--color-text-muted))] hover:text-[hsl(var(--color-text))] transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-[hsl(var(--color-text))]">
          Business Retirement Application
        </h1>
        <p className="text-sm text-[hsl(var(--color-text-muted))] mt-1">
          Submit a request to officially retire/close a registered business.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex gap-3">
        <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Important:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Final taxes will be computed based on your declared gross sales.</li>
            <li>Payment is via OTC (Cash or Manager Check) at the Treasury window.</li>
            <li>Once completed, the business will be permanently marked as retired.</li>
          </ul>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Business Selection */}
        <div>
          <label htmlFor="business_id" className="block text-sm font-medium text-[hsl(var(--color-text))] mb-1.5">
            <Building2 size={14} className="inline mr-1" />
            Select Business to Retire
          </label>
          {isLoadingBiz ? (
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--color-text-muted))]">
              <Loader2 size={14} className="animate-spin" /> Loading businesses...
            </div>
          ) : businesses.length === 0 ? (
            <p className="text-sm text-[hsl(var(--color-text-muted))]">
              No active businesses found. You can only retire businesses you own that are not already retired.
            </p>
          ) : (
            <select
              id="business_id"
              name="business_id"
              value={formData.business_id}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-lg border border-[hsl(var(--color-border))] bg-[hsl(var(--color-surface))] text-[hsl(var(--color-text))] text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="">-- Select a business --</option>
              {businesses.map((biz) => (
                <option key={biz.business_id} value={biz.business_id}>
                  {biz.business_name} {biz.trade_name ? `(${biz.trade_name})` : ''}
                </option>
              ))}
            </select>
          )}
          {errors.business_id && (
            <p className="text-xs text-red-500 mt-1">{errors.business_id}</p>
          )}
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-[hsl(var(--color-text))] mb-1.5">
            <FileText size={14} className="inline mr-1" />
            Reason for Retirement
          </label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            rows={4}
            placeholder="e.g., Business closure due to relocation, financial reasons, owner decision..."
            className="w-full px-3 py-2.5 rounded-lg border border-[hsl(var(--color-border))] bg-[hsl(var(--color-surface))] text-[hsl(var(--color-text))] text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
          />
          {errors.reason && (
            <p className="text-xs text-red-500 mt-1">{errors.reason}</p>
          )}
        </div>

        {/* Cessation Date */}
        <div>
          <label htmlFor="cessation_date" className="block text-sm font-medium text-[hsl(var(--color-text))] mb-1.5">
            <Calendar size={14} className="inline mr-1" />
            Date Business Stopped Operating
          </label>
          <input
            type="date"
            id="cessation_date"
            name="cessation_date"
            value={formData.cessation_date}
            onChange={handleChange}
            max={today}
            className="w-full px-3 py-2.5 rounded-lg border border-[hsl(var(--color-border))] bg-[hsl(var(--color-surface))] text-[hsl(var(--color-text))] text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          {errors.cessation_date && (
            <p className="text-xs text-red-500 mt-1">{errors.cessation_date}</p>
          )}
        </div>

        {/* Final Gross Sales */}
        <div>
          <label htmlFor="final_gross_sales" className="block text-sm font-medium text-[hsl(var(--color-text))] mb-1.5">
            <DollarSign size={14} className="inline mr-1" />
            Final Gross Sales (PHP)
          </label>
          <input
            type="number"
            id="final_gross_sales"
            name="final_gross_sales"
            value={formData.final_gross_sales}
            onChange={handleChange}
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full px-3 py-2.5 rounded-lg border border-[hsl(var(--color-border))] bg-[hsl(var(--color-surface))] text-[hsl(var(--color-text))] text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <p className="text-xs text-[hsl(var(--color-text-muted))] mt-1">
            This will be used by Treasury to compute your final tax liability.
          </p>
          {errors.final_gross_sales && (
            <p className="text-xs text-red-500 mt-1">{errors.final_gross_sales}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting || businesses.length === 0}
            className="w-full py-3 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Retirement Application'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RetirementForm;
