// src/store/applicationStore.js
import { create } from 'zustand';

import { initialFormState, normalizeDraftFormData } from '../utils/uafForm';

/**
 * STATUS_METADATA: Centralized UI config for application statuses.
 * Added 'PaymentProcessing' for Phase 5.
 */
export const STATUS_METADATA = {
  'Draft': { label: 'Draft', color: 'gray' },
  'Pending': { label: 'Pending', color: 'yellow' },
  'Under Review': { label: 'Under Review', color: 'blue' },
  'Returned': { label: 'Returned', color: 'red' },
  'Verified': { label: 'Verified', color: 'emerald' },
  'For Assessment': { label: 'For Assessment', color: 'cyan' },
  'Assessed': { label: 'Assessed', color: 'indigo' },
  'For Payment': { label: 'For Payment', color: 'orange' },
  'PaymentVerificationPending': {
    label: 'Payment Verification Pending',
    color: 'amber',
    isAnimated: true
  },
  'PaymentProcessing': { 
    label: 'Payment Processing', 
    color: 'purple',
    isAnimated: true 
  },
  'Paid': { label: 'Paid', color: 'emerald' },
  'Completed': { label: 'Completed', color: 'emerald' }
};

const useApplicationStore = create((set) => ({
  // Draft Metadata
  draft_id: null,
  current_step: 1,
  isSaving: false,
  lastSavedAt: null,

  // Dynamic reference data from lookups (not persisted in drafts)
  activityMetrics: {},
  barangays: [],
  barangaysLoading: false,
  barangaysError: null,

  // UAF Form Payload
  formData: JSON.parse(JSON.stringify(initialFormState)),

  // Actions
  setActivityMetrics: (map) => set({ activityMetrics: map }),
  setBarangayLookup: (barangays, barangaysLoading, barangaysError) => set({ barangays, barangaysLoading, barangaysError }),
  setLocation: (barangay) => set(state => ({ formData: {
    ...state.formData,
    step2: { ...state.formData.step2, barangay: barangay.name, city: 'Liliw', province: 'Laguna',
      latitude: Number(barangay.latitude), longitude: Number(barangay.longitude), location_mismatch: false }
  } })),
  setStep: (stepNumber) => set({ current_step: stepNumber }),

  /**
   * Updates a specific field within a specific step's form data.
   * @param {string} stepKey e.g., 'step1', 'step2'
   * @param {string} field e.g., 'business_name'
   * @param {any} value
   */
  setFormField: (stepKey, field, value) => set((state) => ({
    formData: {
      ...state.formData,
      [stepKey]: {
        ...state.formData[stepKey],
        [field]: value
      }
    }
  })),

  /**
   * Used by DraftResumePrompt to restore a session from the backend.
   */
  loadDraft: (draft_id, current_step, formData) => set({
    draft_id,
    current_step: Math.max(1, Math.min(5, Number(current_step) || 1)),
    formData: normalizeDraftFormData(formData)
  }),

  /**
   * UI feedback states for useAutosave hook
   */
  setSavingState: (isSaving) => set({ isSaving }),
  setLastSavedAt: (timestamp) => set({ lastSavedAt: timestamp }),

  /**
   * Clears the store after successful submission or manual discard.
   */
  resetForm: () => set({
    draft_id: null,
    current_step: 1,
    isSaving: false,
    lastSavedAt: null,
    formData: JSON.parse(JSON.stringify(initialFormState)),
  })
}));

export default useApplicationStore;