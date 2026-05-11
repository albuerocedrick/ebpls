// src/screens/applicant/UAFWizardScreen.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FileEdit, MapPin, Store, FileText, CheckSquare, 
  ChevronRight, ChevronLeft, Check, Save, Loader2, AlertCircle, MessageSquare
} from 'lucide-react';
import useApplicationStore from '../../store/applicationStore';
import useAutosave from '../../hooks/useAutosave';
import { formatDateTime } from '../../utils/formatters';
import { ROUTES, API_ENDPOINTS } from '../../utils/constants';
import apiClient from '../../utils/apiClient';
import Button from '../../components/ui/Button';

import Step1_BasicInfo from './uaf-steps/Step1_BasicInfo';
import Step2_Location from './uaf-steps/Step2_Location';
import Step3_Activities from './uaf-steps/Step3_Activities';
import Step4_Documents from './uaf-steps/Step4_Documents';
import Step5_Review from './uaf-steps/Step5_Review';

const WIZARD_STEPS = [
  { id: 1, label: 'Business Info', icon: FileEdit },
  { id: 2, label: 'Location',      icon: MapPin },
  { id: 3, label: 'Activities',    icon: Store },
  { id: 4, label: 'Documents',     icon: FileText },
  { id: 5, label: 'Review',        icon: CheckSquare },
];

// -----------------------------------------------------------------
// Per-step validation rules
// Returns an array of human-readable error strings (empty = valid).
// -----------------------------------------------------------------
const validateStep = (step, formData) => {
  const errors = [];

  if (step === 1) {
    const s = formData.step1;
    if (!s.type_id)
      errors.push('Application Type is required.');
    if (!s.org_type_id)
      errors.push('Organization Type is required.');
    if (!s.business_name?.trim())
      errors.push('Business Name is required.');
    if (s.is_franchise && !s.franchisor_name?.trim())
      errors.push('Franchisor Name is required when the business is a franchise.');
  }

  if (step === 2) {
    const s = formData.step2;
    if (!s.address_line1?.trim())
      errors.push('Address Line 1 (Bldg. No. / Street) is required.');
    if (!s.barangay?.trim())
      errors.push('Barangay is required.');
  }

  if (step === 3) {
    const lobs = formData.step3.lineOfBusinesses || [];
    if (lobs.length === 0) {
      errors.push('At least one Line of Business must be declared.');
    } else {
      lobs.forEach((lob, i) => {
        if (!lob.name?.trim())
          errors.push(`Line of Business #${i + 1}: please select a business activity.`);
        if (!lob.capital_investment || Number(lob.capital_investment) <= 0)
          errors.push(`Line of Business #${i + 1}: Capital Investment must be greater than zero.`);
      });
    }
  }

  if (step === 4) {
    const s = formData.step4;
    // PATH B: applicant uploads their own clearance — must actually upload it
    if (!s.request_barangay_clearance) {
      const hasClearance = (s.documents || []).some((d) => d.doc_type === 'BARANGAY_CLEARANCE');
      if (!hasClearance)
        errors.push('Please upload your Barangay Business Clearance, or choose "Request via Municipality" instead.');
    }
  }

  return errors;
};

const UAFWizardScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editAppNo = searchParams.get('edit');
  const [stepErrors, setStepErrors] = useState([]);
  const [feedback, setFeedback] = useState(null); // BPLO remarks for returned apps
  const [editLoading, setEditLoading] = useState(!!editAppNo);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const current_step = useApplicationStore((state) => state.current_step);
  const setStep      = useApplicationStore((state) => state.setStep);
  const formData     = useApplicationStore((state) => state.formData);
  const resetForm    = useApplicationStore((state) => state.resetForm);
  const setFormField = useApplicationStore((state) => state.setFormField);
  const isAttestationAgreed = useApplicationStore((state) => state.formData.step5.attestation_agreed);

  const { isSaving, lastSavedAt } = useAutosave();

  // ─── Load existing application data when editing a returned app ──
  useEffect(() => {
    if (!editAppNo) return;

    const loadForEdit = async () => {
      try {
        const response = await apiClient.get(API_ENDPOINTS.APPLICATIONS_EDIT(editAppNo));
        const data = response.data || response;

        if (data) {
          // Pre-fill Step 1
          if (data.step1) {
            Object.entries(data.step1).forEach(([key, value]) => {
              if (value !== null && value !== undefined) {
                setFormField('step1', key, value);
              }
            });
          }
          // Pre-fill Step 2
          if (data.step2) {
            Object.entries(data.step2).forEach(([key, value]) => {
              if (value !== null && value !== undefined) {
                setFormField('step2', key, value);
              }
            });
          }
          // Pre-fill Step 3
          if (data.step3?.lineOfBusinesses?.length > 0) {
            setFormField('step3', 'lineOfBusinesses', data.step3.lineOfBusinesses);
          }
          // Store BPLO feedback
          if (data.feedback) {
            setFeedback(data.feedback);
          }
          if (data.return_remarks) {
            setFeedback((prev) => ({ ...prev, return_remarks: data.return_remarks }));
          }
        }
      } catch (err) {
        console.error('[UAFWizard] Failed to load application for edit:', err);
      } finally {
        setEditLoading(false);
      }
    };

    loadForEdit();
  }, [editAppNo, setFormField]);

  const handleNext = () => {
    const errors = validateStep(current_step, formData);
    if (errors.length > 0) {
      setStepErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setStepErrors([]);
    if (current_step < 5) setStep(current_step + 1);
  };

  const handleBack = () => {
    setStepErrors([]);
    if (current_step > 1) setStep(current_step - 1);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = {
        type_id: Number(formData.step1.type_id),
        payment_mode_id: formData.step1.payment_mode_id ? Number(formData.step1.payment_mode_id) : undefined,
        business_name: formData.step1.business_name,
        trade_name: formData.step1.trade_name || undefined,
        org_type_id: Number(formData.step1.org_type_id),
        dti_sec_cda_reg_no: formData.step1.dti_sec_cda_reg_no || undefined,
        is_franchise: formData.step1.is_franchise,
        franchisor_name: formData.step1.franchisor_name || undefined,
        // Phase 3C — tells the backend which clearance path to create
        request_barangay_clearance: formData.step4.request_barangay_clearance ?? false,
        // Uploaded documents — only include docs that have a valid file_path
        documents: (formData.step4.documents || [])
          .filter((doc) => doc.file_path && doc.doc_type)
          .map((doc) => ({
            doc_type: doc.doc_type,
            file_path: doc.file_path,
            file_name: doc.file_name || '',
          })),
        // Line of Business activities from Step 3
        activities: (formData.step3.lineOfBusinesses || [])
          .filter((lob) => lob.name)
          .map((lob) => ({
            name: lob.name,
            capitalization: parseFloat(lob.capital_investment) || 0,
            gross_sales_prev_year: 0,
            units: parseInt(lob.units) || 1,
          })),
        address_line1: formData.step2.address_line1,
        barangay: formData.step2.barangay,
        city: formData.step2.city,
        province: formData.step2.province,
        latitude: formData.step2.latitude,
        longitude: formData.step2.longitude,
      };

      const response = await apiClient.post(API_ENDPOINTS.APPLICATIONS_SUBMIT, payload);

      if (response && response.success) {
        resetForm();
        navigate(`${ROUTES.APPLICANT_STATUS}?id=${response.data.application_no}`);
      }
    } catch (error) {
      alert(`Submission failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (editLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 max-w-4xl mx-auto">
        <Loader2 size={32} className="animate-spin text-accent" />
        <p className="text-sm text-[hsl(var(--color-text-muted,0,0%,40%))]">Loading application data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">

      {/* Header & Autosave Status */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--color-text,0,0%,10%))]">Business Permit Application</h1>
          <p className="text-sm text-[hsl(var(--color-text-muted,0,0%,40%))] mt-1">
            Unified Application Form (UAF)
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-[hsl(var(--color-surface-raised,0,0%,96%))] border border-[hsl(var(--color-border,0,0%,90%))]">
          {isSaving ? (
            <>
              <Loader2 size={14} className="animate-spin text-accent" />
              <span className="text-[hsl(var(--color-text,0,0%,10%))]">Saving draft...</span>
            </>
          ) : lastSavedAt ? (
            <>
              <Check size={14} className="text-green-600" />
              <span className="text-[hsl(var(--color-text-muted,0,0%,40%))]">Saved {formatDateTime(lastSavedAt)}</span>
            </>
          ) : (
            <>
              <Save size={14} className="text-[hsl(var(--color-text-muted,0,0%,40%))]" />
              <span className="text-[hsl(var(--color-text-muted,0,0%,40%))]">Draft saved locally</span>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-[hsl(var(--color-surface,0,0%,100%))] border border-[hsl(var(--color-border,0,0%,90%))] rounded-xl p-4 sm:p-6 shadow-[var(--shadow-sm,0_1px_2px_0_rgba(0,0,0,0.05))]">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[hsl(var(--color-border,0,0%,90%))] z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-accent z-0 transition-all duration-300 ease-out"
            style={{ width: `${((current_step - 1) / (WIZARD_STEPS.length - 1)) * 100}%` }}
          />

          {WIZARD_STEPS.map((step) => {
            const isCompleted = step.id < current_step;
            const isActive    = step.id === current_step;
            const Icon        = step.icon;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                <div
                  className={`
                    w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300
                    ${isCompleted
                      ? 'bg-accent border-accent text-white'
                      : isActive
                        ? 'bg-white border-accent text-accent'
                        : 'bg-[hsl(var(--color-surface-raised,0,0%,96%))] border-[hsl(var(--color-border,0,0%,80%))] text-[hsl(var(--color-border,0,0%,80%))]'
                    }
                  `}
                >
                  {isCompleted
                    ? <Check size={18} strokeWidth={3} />
                    : <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  }
                </div>
                <span className={`hidden sm:block text-xs font-semibold ${isActive || isCompleted ? 'text-[hsl(var(--color-text,0,0%,10%))]' : 'text-[hsl(var(--color-text-muted,0,0%,50%))]'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline Validation Error Banner */}
      {stepErrors.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-900 mb-1">Please fix the following before continuing:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {stepErrors.map((err, i) => (
                <li key={i} className="text-xs text-red-800">{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* BPLO Feedback Banner — shown when editing a returned application */}
      {feedback && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <MessageSquare size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">BPLO Officer Remarks</p>
              {feedback.return_remarks && (
                <p className="text-sm text-amber-800 mt-1 bg-white/60 rounded px-3 py-2 border border-amber-200">
                  "{feedback.return_remarks}"
                </p>
              )}
              {feedback.data_reviews?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Data Discrepancies:</p>
                  <ul className="space-y-1">
                    {feedback.data_reviews.map((r, i) => (
                      <li key={i} className="text-xs text-amber-700 bg-white/60 rounded px-2 py-1.5 border border-amber-100">
                        <span className="font-medium capitalize">{r.section.replace(/_/g, ' ')}</span>: {r.remarks}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.doc_reviews?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Document Issues:</p>
                  <ul className="space-y-1">
                    {feedback.doc_reviews.map((d, i) => (
                      <li key={i} className="text-xs text-amber-700 bg-white/60 rounded px-2 py-1.5 border border-amber-100">
                        <span className="font-medium">{d.requirement}</span>: {d.remarks || `Marked as ${d.status}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[11px] text-amber-600 mt-3 italic">
                Please correct the issues above. Your previously submitted data is pre-filled below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Form Content Area */}
      <div className="bg-[hsl(var(--color-surface,0,0%,100%))] border border-[hsl(var(--color-border,0,0%,90%))] rounded-xl shadow-[var(--shadow-sm,0_1px_2px_0_rgba(0,0,0,0.05))] overflow-hidden flex flex-col min-h-[400px]">

        <div className="bg-[hsl(var(--color-surface-raised,0,0%,96%))] px-6 py-4 border-b border-[hsl(var(--color-border,0,0%,90%))] flex items-center gap-3">
          <div className="p-2 bg-accent/10 text-accent rounded-md">
            {React.createElement(WIZARD_STEPS[current_step - 1].icon, { size: 20 })}
          </div>
          <div>
            <h2 className="text-lg font-bold text-[hsl(var(--color-text,0,0%,10%))]">
              Step {current_step}: {WIZARD_STEPS[current_step - 1].label}
            </h2>
          </div>
        </div>

        <div className="p-6 flex-1">
          {current_step === 1 && <Step1_BasicInfo />}
          {current_step === 2 && <Step2_Location />}
          {current_step === 3 && <Step3_Activities />}
          {current_step === 4 && <Step4_Documents docFeedback={feedback?.doc_reviews} />}
          {current_step === 5 && <Step5_Review />}
        </div>

        <div className="p-6 border-t border-[hsl(var(--color-border,0,0%,90%))] bg-[hsl(var(--color-surface-raised,0,0%,98%))] flex items-center justify-between gap-4">
          <Button
            onClick={handleBack}
            disabled={current_step === 1}
            variant="secondary"
            leftIcon={<ChevronLeft size={18} />}
          >
            Previous
          </Button>
 
          {current_step === 5 ? (
            <Button
              onClick={handleSubmit}
              disabled={!isAttestationAgreed || isSubmitting}
              isLoading={isSubmitting}
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
              rightIcon={<Check size={18} />}
            >
              Submit Application
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              variant="primary"
              rightIcon={<ChevronRight size={18} />}
            >
              Next Step
            </Button>
          )}
        </div>
      </div>

    </div>
  );
};

export default UAFWizardScreen;