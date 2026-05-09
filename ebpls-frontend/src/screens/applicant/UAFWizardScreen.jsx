// src/screens/applicant/UAFWizardScreen.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileEdit, MapPin, Store, FileText, CheckSquare, 
  ChevronRight, ChevronLeft, Check, Save, Loader2 
} from 'lucide-react';
import useApplicationStore from '../../store/applicationStore';
import useAutosave from '../../hooks/useAutosave';
import { formatDateTime } from '../../utils/formatters';
import { ROUTES, API_ENDPOINTS } from '../../utils/constants';
import apiClient from '../../utils/apiClient';

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

const Step1 = Step1_BasicInfo;
const Step2 = Step2_Location;
const Step3 = Step3_Activities;
const Step4 = Step4_Documents;
const Step5 = Step5_Review;

const UAFWizardScreen = () => {
  const navigate = useNavigate();
  
  const current_step = useApplicationStore((state) => state.current_step);
  const setStep = useApplicationStore((state) => state.setStep);
  const formData = useApplicationStore((state) => state.formData);
  const resetForm = useApplicationStore((state) => state.resetForm);
  const isAttestationAgreed = useApplicationStore((state) => state.formData.step5.attestation_agreed);
  
  const { isSaving, lastSavedAt } = useAutosave();

  const handleNext = () => {
    if (current_step < 5) setStep(current_step + 1);
  };

  const handleBack = () => {
    if (current_step > 1) setStep(current_step - 1);
  };

  const handleSubmit = async () => {
    try {
      // Flatten Zustand state to match your Zod Schema exactly
      const payload = {
        type_id: formData.step1.type_id,
        payment_mode_id: formData.step1.payment_mode_id || undefined,
        business_name: formData.step1.business_name,
        trade_name: formData.step1.trade_name || undefined,
        org_type_id: formData.step1.org_type_id,
        dti_sec_cda_reg_no: formData.step1.dti_sec_cda_reg_no || undefined,
        is_franchise: formData.step1.is_franchise,
        franchisor_name: formData.step1.franchisor_name || undefined,
        address_line1: formData.step2.address_line1,
        barangay: formData.step2.barangay,
        city: formData.step2.city,
        province: formData.step2.province,
        latitude: formData.step2.latitude,
        longitude: formData.step2.longitude,
      };

      // Send to Backend
      const response = await apiClient.post(API_ENDPOINTS.APPLICATIONS_SUBMIT, payload);
      
      if (response && response.success) {
        resetForm();
        navigate(`${ROUTES.APPLICANT_STATUS}?id=${response.data.application_no}`);
      }
    } catch (error) {
      alert(`Submission failed: ${error.message}`);
    }
  };

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
            const isActive = step.id === current_step;
            const Icon = step.icon;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                <div 
                  className={`
                    w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300
                    ${isCompleted ? 'bg-accent border-accent text-white' : isActive ? 'bg-white border-accent text-accent' : 'bg-[hsl(var(--color-surface-raised,0,0%,96%))] border-[hsl(var(--color-border,0,0%,80%))] text-[hsl(var(--color-border,0,0%,80%))]'}
                  `}
                >
                  {isCompleted ? <Check size={18} strokeWidth={3} /> : <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />}
                </div>
                <span className={`hidden sm:block text-xs font-semibold ${isActive || isCompleted ? 'text-[hsl(var(--color-text,0,0%,10%))]' : 'text-[hsl(var(--color-text-muted,0,0%,50%))]'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

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
          {current_step === 1 && <Step1 />}
          {current_step === 2 && <Step2 />}
          {current_step === 3 && <Step3 />}
          {current_step === 4 && <Step4 />}
          {current_step === 5 && <Step5 />}
        </div>

        <div className="p-6 border-t border-[hsl(var(--color-border,0,0%,90%))] bg-[hsl(var(--color-surface-raised,0,0%,98%))] flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            disabled={current_step === 1}
            className="px-5 py-2.5 flex items-center gap-2 text-sm font-semibold rounded-lg border border-[hsl(var(--color-border,0,0%,80%))] bg-white text-[hsl(var(--color-text,0,0%,10%))] hover:bg-[hsl(var(--color-surface-raised,0,0%,96%))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          {current_step === 5 ? (
            <button
              onClick={handleSubmit}
              disabled={!isAttestationAgreed}
              className="px-6 py-2.5 flex items-center gap-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-colors"
            >
              Submit Application
              <Check size={18} />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 flex items-center gap-2 text-sm font-semibold rounded-lg bg-accent text-white hover:bg-accent/90 shadow-md shadow-accent/20 transition-colors"
            >
              Next Step
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export default UAFWizardScreen;