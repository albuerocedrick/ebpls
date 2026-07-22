// src/screens/applicant/uaf-steps/Step5_Review.jsx

import React from 'react';
import useApplicationStore from '../../../store/applicationStore';
import { CheckSquare, AlertTriangle, FileText, Building2, MapPin, Store, CheckCircle2, Upload, Loader2, AlertCircle } from 'lucide-react';
import useApplicableRequirements from '../../../hooks/useApplicableRequirements';

const Step5_Review = () => {
  const formData = useApplicationStore((state) => state.formData);
  const setFormField = useApplicationStore((state) => state.setFormField);

  const { step1, step2, step3, step4, step5 } = formData;
  const requestClearance = step4.request_barangay_clearance ?? false;

  const { requirements, loading: reqLoading } = useApplicableRequirements();

  // Helper to get uploaded files for a specific requirement_id
  const getUploadedFiles = (reqId) => {
    const doc = step4.documents?.find((d) => d.requirement_id === reqId);
    if (!doc) return [];
    if (doc.files && Array.isArray(doc.files)) return doc.files;
    return [doc];
  };

  const getBarangayClearanceDoc = () => {
    const brgyReq = requirements.find(r => r.name === 'Barangay Business Clearance');
    if (!brgyReq) return null;
    const files = getUploadedFiles(brgyReq.id);
    return files.length > 0 ? files[0] : null;
  };

  const barangayClearanceDoc = getBarangayClearanceDoc();

  const handleAttestation = (e) => {
    setFormField('step5', 'attestation_agreed', e.target.checked);
  };

  const getApplicationTypeName = (id) => {
    const types = { 1: 'New', 2: 'Renewal', 3: 'Additional Line of Business' };
    return types[id] || 'Not Specified';
  };

  const getOrgTypeName = (id) => {
    const types = { 1: 'Sole Proprietorship', 2: 'Partnership', 3: 'Corporation', 4: 'Cooperative' };
    return types[id] || 'Not Specified';
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Warning Banner */}
      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
        <AlertTriangle size={20} className="text-orange-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-orange-900">Final Review Before Submission</h4>
          <p className="text-xs text-orange-800 mt-1">
            Please review your application details carefully. Once submitted, your application will be locked for BPLO review. Any false or misleading information may result in the rejection of your application or revocation of your permit.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Basic Info Summary */}
        <div className="border border-[hsl(var(--color-border,0,0%,90%))] rounded-lg overflow-hidden bg-[hsl(var(--color-surface,0,0%,100%))]">
          <div className="bg-[hsl(var(--color-surface-raised,0,0%,96%))] px-4 py-3 border-b border-[hsl(var(--color-border,0,0%,90%))] flex items-center gap-2">
            <Building2 size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-[hsl(var(--color-text,0,0%,10%))]">Business Identity</h3>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <p className="text-[10px] text-[hsl(var(--color-text-muted,0,0%,50%))] uppercase font-semibold">Business Name</p>
              <p className="text-sm font-medium text-[hsl(var(--color-text,0,0%,10%))]">{step1.business_name || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-[hsl(var(--color-text-muted,0,0%,50%))] uppercase font-semibold">Application Type</p>
                <p className="text-sm font-medium text-[hsl(var(--color-text,0,0%,10%))]">{getApplicationTypeName(step1.type_id)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[hsl(var(--color-text-muted,0,0%,50%))] uppercase font-semibold">Org Type</p>
                <p className="text-sm font-medium text-[hsl(var(--color-text,0,0%,10%))]">{getOrgTypeName(step1.org_type_id)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Location Summary */}
        <div className="border border-[hsl(var(--color-border,0,0%,90%))] rounded-lg overflow-hidden bg-[hsl(var(--color-surface,0,0%,100%))]">
          <div className="bg-[hsl(var(--color-surface-raised,0,0%,96%))] px-4 py-3 border-b border-[hsl(var(--color-border,0,0%,90%))] flex items-center gap-2">
            <MapPin size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-[hsl(var(--color-text,0,0%,10%))]">Physical Address</h3>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <p className="text-[10px] text-[hsl(var(--color-text-muted,0,0%,50%))] uppercase font-semibold">Address Line 1</p>
              <p className="text-sm font-medium text-[hsl(var(--color-text,0,0%,10%))]">{step2.address_line1 || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-[hsl(var(--color-text-muted,0,0%,50%))] uppercase font-semibold">Barangay / City</p>
              <p className="text-sm font-medium text-[hsl(var(--color-text,0,0%,10%))]">
                {step2.barangay ? `${step2.barangay}, ` : ''}{step2.city}, {step2.province}
              </p>
            </div>
            <div className="pt-2 border-t border-[hsl(var(--color-border,0,0%,90%))]">
              <p className="text-[10px] text-[hsl(var(--color-text-muted,0,0%,50%))] uppercase font-semibold">Ownership Status</p>
              <p className="text-sm font-medium text-[hsl(var(--color-text,0,0%,10%))] flex items-center gap-1.5 mt-0.5">
                {step2.is_renting ? (
                  <>Business Location: Renting</>
                ) : (
                  <>Business Location: Own Property</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Lines of Business Summary (Uses step3) */}
        <div className="border border-[hsl(var(--color-border,0,0%,90%))] rounded-lg overflow-hidden bg-[hsl(var(--color-surface,0,0%,100%))] md:col-span-2">
          <div className="bg-[hsl(var(--color-surface-raised,0,0%,96%))] px-4 py-3 border-b border-[hsl(var(--color-border,0,0%,90%))] flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Store size={16} className="text-accent" />
              <h3 className="text-sm font-bold text-[hsl(var(--color-text,0,0%,10%))]">Declared Business Activities</h3>
            </div>
            <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">
              {step3.lineOfBusinesses?.length || 0} activities
            </span>
          </div>
          <div className="p-4">
            {step3.lineOfBusinesses?.length > 0 && step3.lineOfBusinesses[0].name !== '' ? (
              <ul className="list-disc list-inside text-sm text-[hsl(var(--color-text,0,0%,10%))] space-y-1">
                {step3.lineOfBusinesses.map((lob, i) => (
                  <li key={i}>
                    <span className="font-medium">{lob.name || 'Unnamed Activity'}</span>
                    <span className="text-[hsl(var(--color-text-muted,0,0%,50%))]">
                      {' '}— Cap. Inv: ₱{parseFloat(lob.capital_investment || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-red-500 font-medium">No business activities declared. Please go back to Step 3.</p>
            )}
          </div>
        </div>

      </div>

      {/* Attachments Summary */}
      <div className="border border-[hsl(var(--color-border,0,0%,90%))] rounded-lg overflow-hidden bg-[hsl(var(--color-surface,0,0%,100%))]">
        <div className="bg-[hsl(var(--color-surface-raised,0,0%,96%))] px-4 py-3 border-b border-[hsl(var(--color-border,0,0%,90%))] flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-[hsl(var(--color-text,0,0%,10%))]">Uploaded Documents</h3>
          </div>
          <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">
            {step4.documents?.length || 0} files
          </span>
        </div>
        <div className="p-4 space-y-3">

          {/* Barangay Clearance — Phase 3C row */}
          <div className="flex items-start gap-3 py-2 border-b border-[hsl(var(--color-border,0,0%,93%))]">
            <div className="p-1.5 bg-accent/10 rounded-md text-accent shrink-0 mt-0.5">
              <Building2 size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[hsl(var(--color-text,0,0%,20%))]">
                Barangay Business Clearance
              </p>
              {requestClearance ? (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={10} />
                  Requested via Municipality
                </span>
              ) : barangayClearanceDoc ? (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  <Upload size={10} />
                  {barangayClearanceDoc.file_name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  Not uploaded — please go back to Step 4
                </span>
              )}
            </div>
          </div>

          {/* Other uploaded documents */}
          {reqLoading ? (
             <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
               <Loader2 size={14} className="animate-spin" /> Loading requirements...
             </div>
          ) : requirements.filter(r => r.name !== 'Barangay Business Clearance').length > 0 ? (
            <ul className="space-y-3">
              {requirements
                .filter(r => r.name !== 'Barangay Business Clearance')
                .map((req, i) => {
                  const files = getUploadedFiles(req.id);
                  const isUploaded = files.length > 0;
                  
                  return (
                    <li key={i} className="flex items-start gap-3 py-1">
                      <div className={`p-1.5 rounded-md mt-0.5 shrink-0 ${isUploaded ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                        {isUploaded ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[hsl(var(--color-text,0,0%,20%))]">
                          {req.name}
                        </p>
                        {req.is_conditional && req.condition_description && (
                          <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">
                            {req.condition_description}
                          </p>
                        )}
                        <div className="mt-1">
                          {isUploaded ? (
                            req.max_files > 1 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                {files.length} file{files.length !== 1 ? 's' : ''} uploaded
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full truncate max-w-full">
                                <Upload size={10} className="shrink-0" />
                                <span className="truncate">{files[0].file_name}</span>
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                              Not uploaded
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>
          ) : (
            <p className="text-sm text-red-500 font-medium">No other requirements found.</p>
          )}
        </div>
      </div>

      {/* Attestation Checkbox */}
      <div className={`p-5 border-2 rounded-lg transition-colors ${
        step5.attestation_agreed 
          ? 'bg-emerald-50 border-emerald-500' 
          : 'bg-[hsl(var(--color-surface-raised,0,0%,98%))] border-[hsl(var(--color-border,0,0%,90%))]'
      }`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="mt-0.5">
            <input 
              type="checkbox" 
              checked={step5.attestation_agreed} 
              onChange={handleAttestation} 
              className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer" 
            />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[hsl(var(--color-text,0,0%,10%))] flex items-center gap-2">
              Applicant Attestation
              {step5.attestation_agreed && <CheckSquare size={16} className="text-emerald-600" />}
            </h4>
            <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,40%))] mt-1 leading-relaxed">
              I hereby declare under penalty of perjury that all information provided in this application is true, correct, and complete to the best of my knowledge and belief. I authorize the Municipality of Liliw to verify these details. I understand that any misrepresentation may cause the revocation of my permit.
            </p>
          </div>
        </label>
      </div>

    </div>
  );
};

export default Step5_Review;