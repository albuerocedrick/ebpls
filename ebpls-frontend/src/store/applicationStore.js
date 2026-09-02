// src/store/applicationStore.js
import { create } from 'zustand';

/**
 * Empty schema perfectly aligned with DB migrations (businesses, applications).
 * Segmented by steps to make UI mapping and validation easier.
 */
const initialFormState = {
  step1: {
    // Reference: applications table & lookups
    type_id: '',               // New, Renewal, Additional
    // payment_mode_id removed — payment is always annual (migration 033)
    // Reference: businesses table
    business_name: '',
    trade_name: '',
    org_type_id: '',           // Sole Prop, Corp, etc.
    dti_sec_cda_reg_no: '',
    is_franchise: false,
    franchisor_name: '',
  },
  step2: {
    // Reference: businesses table physical address
    address_line1: '',
    barangay: '',
    city: 'Liliw',             // Enforced default based on DB schema
    province: 'Laguna',        // Enforced default based on DB schema
    latitude: null,            // Decimal (from Leaflet)
    longitude: null,           // Decimal (from Leaflet)
    is_renting: false,
    location_mismatch: false,
  },
  step3: {
    // Array to hold multiple Line of Business activities
    lineOfBusinesses: [],      // Expected: { id/name, capital_investment, etc. }
  },
  step4: {
    // Phase 3C — Barangay Clearance mode selection
    // true  = applicant requests the municipality to forward clearance to barangay
    // false = applicant will upload their own existing barangay clearance document
    request_barangay_clearance: false,
    // Array to hold uploaded document pre-signed URLs or path references
    documents: [],             // Expected: { requirement_id, file_path, file_name }
  },
  step5: {
    // Attestation and final review confirmation
    attestation_agreed: false,
  }
};

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
  'PaymentProcessing': { 
    label: 'Payment Processing', 
    color: 'purple',
    isAnimated: true 
  },
  'Paid': { label: 'Paid', color: 'emerald' },
  'Completed': { label: 'Completed', color: 'emerald' }
};

const useApplicationStore = create((set, get) => ({
  // Draft Metadata
  draft_id: null,
  current_step: 1,
  isSaving: false,
  lastSavedAt: null,

  // Dynamic reference data from lookups (not persisted in drafts)
  activityMetrics: {},

  // UAF Form Payload
  formData: JSON.parse(JSON.stringify(initialFormState)),

  // Actions
  setActivityMetrics: (map) => set({ activityMetrics: map }),
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
    current_step,
    formData: { ...initialFormState, ...formData }
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