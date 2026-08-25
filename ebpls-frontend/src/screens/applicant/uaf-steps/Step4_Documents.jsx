// src/screens/applicant/uaf-steps/Step4_Documents.jsx

import { useState } from 'react';
import useApplicationStore from '../../../store/applicationStore';
import DocumentUploadPanel from '../../../components/shared/DocumentUploadPanel';
import { FileText, AlertCircle, Building2, CheckCircle2, Upload, MessageSquare, Loader2 } from 'lucide-react';
import useApplicableRequirements from '../../../hooks/useApplicableRequirements';

const Step4_Documents = ({ docFeedback }) => {
  const step4Data = useApplicationStore((state) => state.formData.step4);
  const step1Data = useApplicationStore((state) => state.formData.step1);
  const setFormField = useApplicationStore((state) => state.setFormField);

  const [isUploadingAny, setIsUploadingAny] = useState(false);
  
  const { requirements, loading, error } = useApplicableRequirements();

  const uploadedDocs = step4Data.documents || [];
  const requestClearance = step4Data.request_barangay_clearance ?? false;

  // ---------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------

  const brgyReq = requirements.find(r => r.name === 'Barangay Business Clearance');

  const handleClearanceToggle = (value) => {
    setFormField('step4', 'request_barangay_clearance', value);
    if (value === true && brgyReq) {
      const filteredDocs = uploadedDocs.filter((d) => d.requirement_id !== brgyReq.id);
      setFormField('step4', 'documents', filteredDocs);
    }
  };

  const handleDocumentUpload = (reqId, fileMetadata) => {
    const existingIndex = uploadedDocs.findIndex((doc) => doc.requirement_id === reqId);
    const newDocs = [...uploadedDocs];
    
    let payload;
    if (Array.isArray(fileMetadata)) {
       payload = { requirement_id: reqId, files: fileMetadata };
    } else {
       payload = { requirement_id: reqId, ...fileMetadata };
    }

    if (existingIndex >= 0) {
      newDocs[existingIndex] = payload;
    } else {
      newDocs.push(payload);
    }
    setFormField('step4', 'documents', newDocs);
  };

  const handleDocumentRemove = (reqId) => {
    const newDocs = uploadedDocs.filter((doc) => doc.requirement_id !== reqId);
    setFormField('step4', 'documents', newDocs);
  };

  const getUploadedFileMeta = (reqId) => {
    const doc = uploadedDocs.find((doc) => doc.requirement_id === reqId);
    if (!doc) return null;
    return doc.files ? doc.files : doc;
  };

  // ---------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------

  const requiredDocs = requirements.filter(r => !r.is_conditional && r.name !== 'Barangay Business Clearance');
  const additionalDocs = requirements.filter(r => r.is_conditional && r.name !== 'Barangay Business Clearance');

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* Information Banners */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4">
          <AlertCircle size={17} className="mt-0.5 shrink-0 text-zinc-500" />
          <div>
            <h4 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
              Documentary requirements
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              All requirements must be photocopied. Allowed formats: PDF, JPG, PNG (max 5 MB each).
            </p>
          </div>
        </div>

        {step1Data.type_id === 1 && (
          <div className="flex items-start gap-3 rounded-md border border-zinc-200 bg-white p-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-zinc-500" />
            <p className="text-xs leading-relaxed text-zinc-600">
              All new applicants are subject to inspection.
            </p>
          </div>
        )}
      </div>

      {/* BPLO Document Feedback */}
      {docFeedback && docFeedback.length > 0 && (
        <div className="rounded-md border border-zinc-300 bg-zinc-50 p-4">
          <div className="flex items-start gap-3">
            <MessageSquare size={17} className="mt-0.5 shrink-0 text-zinc-600" />
            <div className="flex-1">
              <p className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
                Documents needing attention
              </p>
              <p className="mt-2 mb-2.5 text-xs leading-relaxed text-zinc-600">
                The BPLO officer flagged the following documents. Re-upload corrected versions.
              </p>
              <ul className="space-y-1.5">
                {docFeedback.map((item, i) => (
                  <li key={i} className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs">
                    <span className="font-medium text-zinc-900">{item.requirement}</span>
                    {item.remarks ? (
                      <span className="ml-1 text-zinc-600">— {item.remarks}</span>
                    ) : (
                      <span className="ml-1 text-zinc-500">— rejected, please re-upload</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase 3C — Barangay Business Clearance Toggle ── */}
      {brgyReq && (
        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600">
              <Building2 size={16} />
            </div>
            <div>
              <h3 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
                Barangay Business Clearance
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Choose how you will provide this required clearance.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleClearanceToggle(true)}
              aria-pressed={requestClearance}
              className={`relative flex cursor-pointer flex-col gap-2 rounded-md border p-4 text-left transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none
                ${requestClearance
                  ? 'border-zinc-900 bg-zinc-50'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                }`}
            >
              {requestClearance && <CheckCircle2 size={16} className="absolute top-3 right-3 text-zinc-900" />}
              <div className={`w-fit rounded-md border p-2 ${requestClearance ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-500'}`}>
                <Building2 size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  Request via municipality
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  The Municipality forwards your clearance request directly to your Barangay Hall.
                  No upload needed.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleClearanceToggle(false)}
              aria-pressed={!requestClearance}
              className={`relative flex cursor-pointer flex-col gap-2 rounded-md border p-4 text-left transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none
                ${!requestClearance
                  ? 'border-zinc-900 bg-zinc-50'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                }`}
            >
              {!requestClearance && <CheckCircle2 size={16} className="absolute top-3 right-3 text-zinc-900" />}
              <div className={`w-fit rounded-md border p-2 ${!requestClearance ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-500'}`}>
                <Upload size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  I have my own clearance
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  You already have a valid Barangay Clearance. Upload it below.
                </p>
              </div>
            </button>
          </div>

          {!requestClearance && (
            <div className="px-5 pb-5">
              <DocumentUploadPanel
                title={brgyReq.name}
                description={brgyReq.description}
                maxFiles={brgyReq.max_files}
                value={getUploadedFileMeta(brgyReq.id)}
                onChange={(meta) => handleDocumentUpload(brgyReq.id, meta)}
                onRemove={() => handleDocumentRemove(brgyReq.id)}
                disabled={isUploadingAny}
                onUploadStart={() => setIsUploadingAny(true)}
                onUploadEnd={() => setIsUploadingAny(false)}
                feedback={docFeedback?.find(f => f.requirement === brgyReq.name)?.remarks}
              />
            </div>
          )}

          {requestClearance && (
            <div className="px-5 pb-5">
              <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
                <CheckCircle2 size={15} className="shrink-0 text-zinc-600" />
                <p className="text-xs text-zinc-600">
                  Your clearance will be requested from the Barangay automatically.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Dynamic Checklists ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white p-12">
          <Loader2 size={24} className="mb-4 animate-spin text-zinc-300" />
          <p className="text-sm text-zinc-500">Loading your requirements…</p>
        </div>
      ) : error ? (
        <div className="rounded-md border border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-700">
          {error}
        </div>
      ) : (
        <>
          {/* ── Required Documents ── */}
          {requiredDocs.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
                <FileText size={14} className="text-zinc-500" />
                Required documents
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {requiredDocs.map((req) => {
                  const specificFeedback = docFeedback?.find(f => f.requirement === req.name);
                  return (
                    <DocumentUploadPanel
                      key={req.id}
                      title={req.name}
                      description={req.description}
                      maxFiles={req.max_files}
                      value={getUploadedFileMeta(req.id)}
                      onChange={(meta) => handleDocumentUpload(req.id, meta)}
                      onRemove={() => handleDocumentRemove(req.id)}
                      disabled={isUploadingAny}
                      onUploadStart={() => setIsUploadingAny(true)}
                      onUploadEnd={() => setIsUploadingAny(false)}
                      feedback={specificFeedback?.remarks || (specificFeedback ? 'Document needs attention' : null)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Additional Requirements ── */}
          {additionalDocs.length > 0 && (
            <div className="mt-2">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
                <FileText size={14} className="text-zinc-500" />
                Additional requirements
                <span className="text-zinc-400">(based on your business)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {additionalDocs.map((req) => {
                  const specificFeedback = docFeedback?.find(f => f.requirement === req.name);
                  // Render condition_description as part of the description
                  const combinedDesc = req.condition_description 
                    ? `[${req.condition_description.toUpperCase()}] ${req.description || ''}`
                    : req.description;

                  return (
                    <DocumentUploadPanel
                      key={req.id}
                      title={req.name}
                      description={combinedDesc}
                      maxFiles={req.max_files}
                      value={getUploadedFileMeta(req.id)}
                      onChange={(meta) => handleDocumentUpload(req.id, meta)}
                      onRemove={() => handleDocumentRemove(req.id)}
                      disabled={isUploadingAny}
                      onUploadStart={() => setIsUploadingAny(true)}
                      onUploadEnd={() => setIsUploadingAny(false)}
                      feedback={specificFeedback?.remarks || (specificFeedback ? 'Document needs attention' : null)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default Step4_Documents;
