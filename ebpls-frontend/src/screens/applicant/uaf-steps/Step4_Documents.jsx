// src/screens/applicant/uaf-steps/Step4_Documents.jsx

import React, { useState, useEffect } from 'react';
import useApplicationStore from '../../../store/applicationStore';
import DocumentUploadPanel from '../../../components/shared/DocumentUploadPanel';
import { FileText, AlertCircle, Building2, CheckCircle2, Upload, MessageSquare, Loader2 } from 'lucide-react';
import apiClient from '../../../utils/apiClient';

const Step4_Documents = ({ docFeedback }) => {
  const step4Data = useApplicationStore((state) => state.formData.step4);
  const step1Data = useApplicationStore((state) => state.formData.step1);
  const step2Data = useApplicationStore((state) => state.formData.step2);
  const step3Data = useApplicationStore((state) => state.formData.step3);
  const setFormField = useApplicationStore((state) => state.setFormField);

  const [isUploadingAny, setIsUploadingAny] = useState(false);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const uploadedDocs = step4Data.documents || [];
  const requestClearance = step4Data.request_barangay_clearance ?? false;

  // ---------------------------------------------------------------
  // Fetch Requirements
  // ---------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    const fetchRequirements = async () => {
      const type_id = step1Data.type_id;
      const org_type_id = step1Data.org_type_id;
      const is_renting = step2Data.is_renting ?? false;
      const activity_names = (step3Data.lineOfBusinesses || []).map(b => b.name).join(',');

      if (!type_id || !org_type_id) {
        if (isMounted) setRequirements([]);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          type_id,
          org_type_id,
          is_renting: is_renting.toString()
        });
        
        if (activity_names) {
          params.append('activity_names', activity_names);
        }

        const res = await apiClient.get(`/api/applications/requirements?${params.toString()}`);
        
        if (isMounted) {
          if (res.success) {
            setRequirements(res.data);
          } else {
            setError(res.message || 'Failed to load requirements');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Network error loading requirements. Please check your connection.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchRequirements();
    return () => { isMounted = false; };
  }, [step1Data.type_id, step1Data.org_type_id, step2Data.is_renting, step3Data.lineOfBusinesses]);

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
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-blue-900">Documentary Requirements</h4>
            <p className="text-xs text-blue-800 mt-1">
              All requirements must be photocopied. Allowed formats: PDF, JPG, PNG (max 5 MB each).
            </p>
          </div>
        </div>
        
        {step1Data.type_id === 1 && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start gap-3">
            <AlertCircle size={18} className="text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-indigo-800 mt-0.5">
              Note: All new applicants are subject to inspection.
            </p>
          </div>
        )}
      </div>

      {/* BPLO Document Feedback */}
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
                    {item.remarks ? (
                      <span className="text-amber-700 ml-1">— {item.remarks}</span>
                    ) : (
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
      {brgyReq && (
        <div className="border-2 border-[hsl(var(--color-border,0,0%,85%))] rounded-xl overflow-hidden">
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

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleClearanceToggle(true)}
              className={`relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer
                ${requestClearance
                  ? 'border-accent bg-accent/5 shadow-sm shadow-accent/10'
                  : 'border-[hsl(var(--color-border,0,0%,88%))] bg-white hover:border-accent/40 hover:bg-accent/3'
                }`}
            >
              {requestClearance && <CheckCircle2 size={18} className="absolute top-3 right-3 text-accent" />}
              <div className={`p-2 w-fit rounded-lg ${requestClearance ? 'bg-accent/15 text-accent' : 'bg-[hsl(var(--color-surface-raised,0,0%,94%))] text-[hsl(var(--color-text-muted,0,0%,40%))]'}`}>
                <Building2 size={18} />
              </div>
              <div>
                <p className={`text-sm font-bold ${requestClearance ? 'text-accent' : 'text-[hsl(var(--color-text,0,0%,15%))]'}`}>
                  Request via Municipality
                </p>
                <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,45%))] mt-1 leading-relaxed">
                  The Municipality will forward your clearance request directly to your Barangay Hall.
                  No upload needed.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleClearanceToggle(false)}
              className={`relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer
                ${!requestClearance
                  ? 'border-accent bg-accent/5 shadow-sm shadow-accent/10'
                  : 'border-[hsl(var(--color-border,0,0%,88%))] bg-white hover:border-accent/40 hover:bg-accent/3'
                }`}
            >
              {!requestClearance && <CheckCircle2 size={18} className="absolute top-3 right-3 text-accent" />}
              <div className={`p-2 w-fit rounded-lg ${!requestClearance ? 'bg-accent/15 text-accent' : 'bg-[hsl(var(--color-surface-raised,0,0%,94%))] text-[hsl(var(--color-text-muted,0,0%,40%))]'}`}>
                <Upload size={18} />
              </div>
              <div>
                <p className={`text-sm font-bold ${!requestClearance ? 'text-accent' : 'text-[hsl(var(--color-text,0,0%,15%))]'}`}>
                  I Have My Own Clearance
                </p>
                <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,45%))] mt-1 leading-relaxed">
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
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-800 font-medium">
                  Your clearance will be requested from the Barangay automatically.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Dynamic Checklists ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-gray-200">
          <Loader2 size={32} className="text-accent animate-spin mb-4" />
          <p className="text-sm font-medium text-gray-700">Loading your requirements...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
          {error}
        </div>
      ) : (
        <>
          {/* ── Required Documents ── */}
          {requiredDocs.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[hsl(var(--color-text,0,0%,10%))] mb-3 flex items-center gap-2">
                <FileText size={16} className="text-accent" />
                Required Documents
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
              <h3 className="text-sm font-bold text-[hsl(var(--color-text,0,0%,10%))] mb-3 flex items-center gap-2">
                <FileText size={16} className="text-accent" />
                Additional Requirements 
                <span className="text-xs font-normal text-gray-500">(Based on Your Business)</span>
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
