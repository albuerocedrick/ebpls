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
import useApplicableRequirements from '../../hooks/useApplicableRequirements';
import useBarangayLookup from '../../hooks/useBarangayLookup';
import { validateWizardStep, buildSubmissionPayload } from '../../utils/uafForm';

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
  const loadDraft = useApplicationStore((state) => state.loadDraft);
  const barangays = useApplicationStore((state) => state.barangays);
  const isAttestationAgreed = useApplicationStore((state) => state.formData.step5.attestation_agreed);
  const activityMetrics = useApplicationStore((state) => state.activityMetrics);

  const { isSaving, lastSavedAt } = useAutosave();
  const { requirements, loading: requirementsLoading, error: requirementsError } = useApplicableRequirements();
  useBarangayLookup();

  // ─── Load existing application data when editing a returned app ──
  useEffect(() => {
    if (!editAppNo) return;

    const loadForEdit = async () => {
      try {
        const response = await apiClient.get(API_ENDPOINTS.APPLICATIONS_EDIT(editAppNo));
        const data = response.data || response;

        if (data) {
          loadDraft(null, 1, data);
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
  }, [editAppNo, loadDraft]);

  const handleNext = () => {
    if (current_step === 4 && (requirementsLoading || requirementsError)) {
      setStepErrors([requirementsError || 'Wait for document requirements to load.']);
      return;
    }
    const errors = validateWizardStep(current_step, formData, requirements, activityMetrics, barangays);
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
      const errors = [1, 2, 3, 4].flatMap(step => validateWizardStep(step, formData, requirements, activityMetrics, barangays));
      if (requirementsLoading || requirementsError) errors.push(requirementsError || 'Wait for document requirements to load.');
      if (!formData.step5.attestation_agreed) errors.push('Please agree to the applicant attestation.');
      if (errors.length) { setStepErrors(errors); return; }
      const payload = buildSubmissionPayload(formData, requirements, editAppNo);

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
      <div className="mx-auto flex min-h-[400px] max-w-4xl flex-col items-center justify-center gap-4">
        <Loader2 size={24} className="animate-spin text-zinc-300" />
        <p className="text-sm text-zinc-500">Loading application data…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">

      {/* Header & Autosave Status */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
            Unified application form
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">
            Business permit application
          </h1>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-[10px] tracking-[0.08em] uppercase">
          {isSaving ? (
            <>
              <Loader2 size={13} className="animate-spin text-zinc-400" />
              <span className="text-zinc-600">Saving draft…</span>
            </>
          ) : lastSavedAt ? (
            <>
              <Check size={13} className="text-zinc-900" />
              <span className="text-zinc-600">Saved {formatDateTime(lastSavedAt)}</span>
            </>
          ) : (
            <>
              <Save size={13} className="text-zinc-400" />
              <span className="text-zinc-600">Draft saved locally</span>
            </>
          )}
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 sm:p-7">
        <div className="relative flex items-center justify-between">
          {/* Background track — aligned to center of circles */}
          <div className="absolute top-[18px] right-0 left-0 z-0 h-px bg-zinc-200 sm:top-[22px]" />
          {/* Active track */}
          <div
            className="absolute top-[18px] left-0 z-0 h-px bg-zinc-900 transition-all duration-500 ease-out motion-reduce:transition-none sm:top-[22px]"
            style={{ width: `${((current_step - 1) / (WIZARD_STEPS.length - 1)) * 100}%` }}
          />

          {WIZARD_STEPS.map((step) => {
            const isCompleted = step.id < current_step;
            const isActive    = step.id === current_step;
            const Icon        = step.icon;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-2.5">
                <div
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-300 ease-out motion-reduce:transition-none sm:h-11 sm:w-11',
                    isCompleted
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : isActive
                        ? 'border-zinc-900 bg-white text-zinc-900'
                        : 'border-zinc-200 bg-white text-zinc-300',
                  ].join(' ')}
                >
                  {isCompleted
                    ? <Check size={16} strokeWidth={3} />
                    : <Icon size={16} strokeWidth={isActive ? 2.5 : 1.5} />
                  }
                </div>
                <span className={[
                  'hidden font-mono text-[10px] tracking-[0.08em] uppercase transition-colors duration-300 motion-reduce:transition-none sm:block',
                  isActive ? 'text-zinc-900' : isCompleted ? 'text-zinc-600' : 'text-zinc-400',
                ].join(' ')}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline Validation Error Banner */}
      {stepErrors.length > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-zinc-300 bg-zinc-50 p-4 duration-200 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={17} className="mt-0.5 shrink-0 text-zinc-600" />
          <div>
            <p className="mb-2 font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
              Fix the following before continuing
            </p>
            <ul className="list-inside list-disc space-y-0.5">
              {stepErrors.map((err, i) => (
                <li key={i} className="text-xs text-zinc-700">{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* BPLO Feedback Banner — shown when editing a returned application */}
      {feedback && (
        <div className="rounded-md border border-zinc-300 bg-zinc-50 p-4">
          <div className="flex items-start gap-3">
            <MessageSquare size={17} className="mt-0.5 shrink-0 text-zinc-600" />
            <div className="flex-1">
              <p className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
                BPLO officer remarks
              </p>
              {feedback.return_remarks && (
                <p className="mt-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-700">
                  &ldquo;{feedback.return_remarks}&rdquo;
                </p>
              )}
              {feedback.data_reviews?.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">
                    Data discrepancies
                  </p>
                  <ul className="space-y-1">
                    {feedback.data_reviews.map((r, i) => (
                      <li key={i} className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700">
                        <span className="font-medium capitalize">{r.section.replace(/_/g, ' ')}</span>: {r.remarks}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.doc_reviews?.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">
                    Document issues
                  </p>
                  <ul className="space-y-1">
                    {feedback.doc_reviews.map((d, i) => (
                      <li key={i} className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700">
                        <span className="font-medium">{d.requirement}</span>: {d.remarks || `Marked as ${d.status}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                Correct the issues above. Your previously submitted data is pre-filled below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Form Content Area */}
      <div className="flex min-h-[400px] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white">

        <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600">
            {React.createElement(WIZARD_STEPS[current_step - 1].icon, { size: 17 })}
          </div>
          <div>
            <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
              Step {current_step} of {WIZARD_STEPS.length}
            </span>
            <h2 className="mt-1 text-base font-semibold tracking-tight text-zinc-900">
              {WIZARD_STEPS[current_step - 1].label}
            </h2>
          </div>
        </div>

        <div className="flex-1 p-6">
          {current_step === 1 && <Step1_BasicInfo />}
          {current_step === 2 && <Step2_Location />}
          {current_step === 3 && <Step3_Activities />}
          {current_step === 4 && <Step4_Documents docFeedback={feedback?.doc_reviews} />}
          {current_step === 5 && <Step5_Review />}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-zinc-200 bg-zinc-50 p-5">
          <Button
            onClick={handleBack}
            disabled={current_step === 1}
            variant="secondary"
            leftIcon={<ChevronLeft size={17} />}
          >
            Previous
          </Button>

          {current_step === 5 ? (
            <Button
              onClick={handleSubmit}
              disabled={!isAttestationAgreed || isSubmitting}
              isLoading={isSubmitting}
              variant="primary"
              rightIcon={<Check size={17} />}
            >
              Submit application
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              variant="primary"
              rightIcon={<ChevronRight size={17} />}
            >
              Next step
            </Button>
          )}
        </div>
      </div>

    </div>
  );
};

export default UAFWizardScreen;
