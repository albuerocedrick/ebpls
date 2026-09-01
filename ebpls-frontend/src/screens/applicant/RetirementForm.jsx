// src/screens/applicant/RetirementForm.jsx
// Business Retirement Submission Form — Phase 7

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Calendar, DollarSign, FileText, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import Select from '../../components/ui/Select';
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
      } catch {
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
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(ROUTES.APPLICANT_DASHBOARD)}
          className="group mb-5 flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors duration-200 hover:text-zinc-900 motion-reduce:transition-none"
        >
          <ArrowLeft
            size={14}
            className="transition-transform duration-300 ease-out group-hover:-translate-x-0.5 motion-reduce:transition-none"
          />
          Back to dashboard
        </button>
        <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
          Business retirement
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Retire a business
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Submit a request to officially retire or close a registered business.
        </p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 flex gap-3 rounded-md border border-zinc-300 bg-zinc-50 p-4">
        <AlertCircle size={17} className="mt-0.5 shrink-0 text-zinc-600" />
        <div className="text-sm text-zinc-700">
          <p className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
            Before you submit
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed">
            <li>Final taxes are computed from your declared gross sales.</li>
            <li>Payment is over-the-counter (cash or manager&apos;s check) at the Treasury window.</li>
            <li>Once completed, the business is permanently marked as retired.</li>
          </ul>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Business Selection */}
        <div>
          <label htmlFor="business_id" className="mb-2 block font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">
            <Building2 size={12} className="mr-1.5 inline" />
            Select business to retire
          </label>
          {isLoadingBiz ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 size={14} className="animate-spin" /> Loading businesses…
            </div>
          ) : businesses.length === 0 ? (
            <p className="text-sm leading-relaxed text-zinc-500">
              No active businesses found. You can only retire businesses you own that are not already retired.
            </p>
          ) : (
            <Select
              id="business_id"
              name="business_id"
              value={formData.business_id}
              onChange={handleChange}
              error={errors.business_id}
            >
              <option value="">— Select a business —</option>
              {businesses.map((biz) => (
                <option key={biz.business_id} value={biz.business_id}>
                  {biz.business_name} {biz.trade_name ? `(${biz.trade_name})` : ''}
                </option>
              ))}
            </Select>
          )}
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="mb-2 block font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">
            <FileText size={12} className="mr-1.5 inline" />
            Reason for retirement
          </label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            rows={4}
            placeholder="e.g., closure due to relocation, financial reasons, owner decision…"
            className="w-full resize-none rounded-md border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 transition-colors duration-200 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none motion-reduce:transition-none"
          />
          {errors.reason && (
            <p className="mt-1.5 text-xs text-zinc-700">{errors.reason}</p>
          )}
        </div>

        {/* Cessation Date */}
        <div>
          <label htmlFor="cessation_date" className="mb-2 block font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">
            <Calendar size={12} className="mr-1.5 inline" />
            Date business stopped operating
          </label>
          <input
            type="date"
            id="cessation_date"
            name="cessation_date"
            value={formData.cessation_date}
            onChange={handleChange}
            max={today}
            className="w-full rounded-md border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 tabular-nums transition-colors duration-200 focus:border-zinc-900 focus:outline-none motion-reduce:transition-none"
          />
          {errors.cessation_date && (
            <p className="mt-1.5 text-xs text-zinc-700">{errors.cessation_date}</p>
          )}
        </div>

        {/* Final Gross Sales */}
        <div>
          <label htmlFor="final_gross_sales" className="mb-2 block font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">
            <DollarSign size={12} className="mr-1.5 inline" />
            Final gross sales (PHP)
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
            className="w-full rounded-md border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 tabular-nums transition-colors duration-200 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none motion-reduce:transition-none"
          />
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
            Treasury uses this to compute your final tax liability.
          </p>
          {errors.final_gross_sales && (
            <p className="mt-1.5 text-xs text-zinc-700">{errors.final_gross_sales}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting || businesses.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Submitting…
              </>
            ) : (
              'Submit retirement application'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RetirementForm;
