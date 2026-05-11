// src/screens/applicant/uaf-steps/Step4_Documents.jsx

import React, { useState } from 'react';
import useApplicationStore from '../../../store/applicationStore';
import DocumentUploadPanel from '../../../components/shared/DocumentUploadPanel';
import { FileText, AlertCircle, Building2, CheckCircle2, Upload, MessageSquare } from 'lucide-react';

// Documents that every applicant must upload manually.
// 'Barangay Business Clearance' is intentionally excluded here — it is
// handled separately by the Phase 3C clearance toggle below.
const STANDARD_DOCUMENTS = [
  {
    id: 'DTI_SEC_CDA',
    name: 'DTI / SEC / CDA Registration',
    description: 'Proof of legal business registration with DTI (Sole Prop), SEC (Corp/Partnership), or CDA (Coop).',
  },
  {
    id: 'FIRE_SAFETY',
    name: 'Fire Safety Inspection Certificate',
    description: 'Issued by the Bureau of Fire Protection (BFP) after premises inspection.',
  },
  {
    id: 'SANITARY_PERMIT',
    name: 'Sanitary Permit',
    description: 'Issued by the Municipal Health Office after sanitary inspection.',
  },
  {
    id: 'ZONING_CLEARANCE',
    name: 'Zoning Clearance',
    description: 'Confirms business location complies with local zoning ordinances.',
  },
  {
    id: 'LEASE_TCT',
    name: 'Lease Contract / TCT',
    description: 'Proof of property ownership (TCT/OCT) or lease agreement if renting.',
  },
];

const Step4_Documents = ({ docFeedback }) => {
  const data = useApplicationStore((state) => state.formData.step4);
  const setFormField = useApplicationStore((state) => state.setFormField);

  // Global upload state to disable other panels when one is uploading
  const [isUploadingAny, setIsUploadingAny] = useState(false);

  const uploadedDocs = data.documents || [];
  const requestClearance = data.request_barangay_clearance ?? false;

  // ---------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------

  const handleClearanceToggle = (value) => {
    setFormField('step4', 'request_barangay_clearance', value);
    // If switching to "request via municipality", remove any previously
    // uploaded barangay clearance doc from the list so the payload stays clean.
    if (value === true) {
      const filteredDocs = uploadedDocs.filter((d) => d.doc_type !== 'BARANGAY_CLEARANCE');
      setFormField('step4', 'documents', filteredDocs);
    }
  };

  const handleDocumentUpload = (docId, fileMetadata) => {
    const existingIndex = uploadedDocs.findIndex((doc) => doc.doc_type === docId);
    const newDocs = [...uploadedDocs];
    const payload = { doc_type: docId, ...fileMetadata };

    if (existingIndex >= 0) {
      newDocs[existingIndex] = payload;
    } else {
      newDocs.push(payload);
    }
    setFormField('step4', 'documents', newDocs);
  };

  const handleDocumentRemove = (docId) => {
    const newDocs = uploadedDocs.filter((doc) => doc.doc_type !== docId);
    setFormField('step4', 'documents', newDocs);
  };

  const getUploadedFileMeta = (docId) =>
    uploadedDocs.find((doc) => doc.doc_type === docId) || null;

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* Information Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-blue-900">Documentary Requirements</h4>
          <p className="text-xs text-blue-800 mt-1">
            Upload clear, legible copies of all required documents. Allowed formats: PDF, JPG, PNG (max 5 MB each).
            These are reviewed by the BPLO Officer during verification.
          </p>
        </div>
      </div>

      {/* BPLO Document Feedback — shown when resubmitting a returned application */}
      {docFeedback && docFeedback.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <MessageSquare size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">Documents Needing Attention</p>
              <p className="text-xs text-amber-700 mt-1 mb-2">The BPLO officer flagged the following documents. Please re-upload corrected versions.</p>
              <ul className="space-y-1.5">
                {docFeedback.map((item, i) => (
                  <li key={i} className="text-xs bg-white/70 border border-amber-200 rounded px-3 py-2">
                    <span className="font-semibold text-amber-900">{item.requirement}</span>
                    {item.remarks && (
                      <span className="text-amber-700 ml-1">— {item.remarks}</span>
                    )}
                    {!item.remarks && (
                      <span className="text-amber-600 ml-1 italic">— Rejected, please re-upload</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase 3C — Barangay Business Clearance Toggle ── */}
      <div className="border-2 border-[hsl(var(--color-border,0,0%,85%))] rounded-xl overflow-hidden">

        {/* Section Header */}
        <div className="bg-[hsl(var(--color-surface-raised,0,0%,96%))] px-5 py-4 border-b border-[hsl(var(--color-border,0,0%,90%))] flex items-center gap-3">
          <div className="p-1.5 bg-accent/10 text-accent rounded-md">
            <Building2 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[hsl(var(--color-text,0,0%,10%))]">
              Barangay Business Clearance
            </h3>
            <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,45%))] mt-0.5">
              Choose how you will provide this required clearance.
            </p>
          </div>
        </div>

        {/* Two-option toggle */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* Option A — Request via Municipality */}
          <button
            type="button"
            onClick={() => handleClearanceToggle(true)}
            className={`relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer
              ${requestClearance
                ? 'border-accent bg-accent/5 shadow-sm shadow-accent/10'
                : 'border-[hsl(var(--color-border,0,0%,88%))] bg-white hover:border-accent/40 hover:bg-accent/3'
              }`}
          >
            {requestClearance && (
              <CheckCircle2
                size={18}
                className="absolute top-3 right-3 text-accent"
                aria-hidden="true"
              />
            )}
            <div className={`p-2 w-fit rounded-lg ${requestClearance ? 'bg-accent/15 text-accent' : 'bg-[hsl(var(--color-surface-raised,0,0%,94%))] text-[hsl(var(--color-text-muted,0,0%,40%))]'}`}>
              <Building2 size={18} />
            </div>
            <div>
              <p className={`text-sm font-bold ${requestClearance ? 'text-accent' : 'text-[hsl(var(--color-text,0,0%,15%))]'}`}>
                Request via Municipality
              </p>
              <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,45%))] mt-1 leading-relaxed">
                The Municipality of Liliw will forward your clearance request directly to your Barangay Hall.
                No upload needed — a Barangay Officer will process it once your application is received.
              </p>
            </div>
          </button>

          {/* Option B — Upload my own */}
          <button
            type="button"
            onClick={() => handleClearanceToggle(false)}
            className={`relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer
              ${!requestClearance
                ? 'border-accent bg-accent/5 shadow-sm shadow-accent/10'
                : 'border-[hsl(var(--color-border,0,0%,88%))] bg-white hover:border-accent/40 hover:bg-accent/3'
              }`}
          >
            {!requestClearance && (
              <CheckCircle2
                size={18}
                className="absolute top-3 right-3 text-accent"
                aria-hidden="true"
              />
            )}
            <div className={`p-2 w-fit rounded-lg ${!requestClearance ? 'bg-accent/15 text-accent' : 'bg-[hsl(var(--color-surface-raised,0,0%,94%))] text-[hsl(var(--color-text-muted,0,0%,40%))]'}`}>
              <Upload size={18} />
            </div>
            <div>
              <p className={`text-sm font-bold ${!requestClearance ? 'text-accent' : 'text-[hsl(var(--color-text,0,0%,15%))]'}`}>
                I Have My Own Clearance
              </p>
              <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,45%))] mt-1 leading-relaxed">
                You already have a valid Barangay Business Clearance. Upload it below and the BPLO Officer will
                verify your document during review.
              </p>
            </div>
          </button>

        </div>

        {/* Conditional upload panel — only shown when Option B is selected */}
        {!requestClearance && (
          <div className="px-5 pb-5">
            <DocumentUploadPanel
              title="Barangay Business Clearance"
              description="Upload the clearance issued by the Barangay where your business is located."
              value={getUploadedFileMeta('BARANGAY_CLEARANCE')}
              onChange={(meta) => handleDocumentUpload('BARANGAY_CLEARANCE', meta)}
              onRemove={() => handleDocumentRemove('BARANGAY_CLEARANCE')}
              disabled={isUploadingAny}
              onUploadStart={() => setIsUploadingAny(true)}
              onUploadEnd={() => setIsUploadingAny(false)}
            />
          </div>
        )}

        {/* Status chip shown when Option A is selected */}
        {requestClearance && (
          <div className="px-5 pb-5">
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-800 font-medium">
                Your clearance will be requested from the Barangay automatically.
                You will be notified if there are any issues.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Standard Document Uploads ── */}
      <div>
        <h3 className="text-sm font-bold text-[hsl(var(--color-text,0,0%,10%))] mb-3 flex items-center gap-2">
          <FileText size={16} className="text-accent" />
          Other Required Documents
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {STANDARD_DOCUMENTS.map((req) => (
            <DocumentUploadPanel
              key={req.id}
              title={req.name}
              description={req.description}
              value={getUploadedFileMeta(req.id)}
              onChange={(meta) => handleDocumentUpload(req.id, meta)}
              onRemove={() => handleDocumentRemove(req.id)}
              disabled={isUploadingAny}
              onUploadStart={() => setIsUploadingAny(true)}
              onUploadEnd={() => setIsUploadingAny(false)}
            />
          ))}
        </div>
      </div>

    </div>
  );
};

export default Step4_Documents;
