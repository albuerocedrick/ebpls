// src/screens/applicant/uaf-steps/Step5_Review.jsx

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
      <div className="flex items-start gap-3 rounded-md border border-zinc-300 bg-zinc-50 p-4">
        <AlertTriangle size={17} className="mt-0.5 shrink-0 text-zinc-600" />
        <div>
          <h4 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
            Final review before submission
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
            Review your application details carefully. Once submitted, the application is locked for
            BPLO review. False or misleading information may result in rejection or revocation of your
            permit.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Basic Info Summary */}
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
            <Building2 size={14} className="text-zinc-500" />
            <h3 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">Business identity</h3>
          </div>
          <div className="space-y-3 p-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">Business name</p>
              <p className="mt-0.5 text-sm font-medium text-zinc-900">{step1.business_name || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">Application type</p>
                <p className="mt-0.5 text-sm font-medium text-zinc-900">{getApplicationTypeName(step1.type_id)}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">Org type</p>
                <p className="mt-0.5 text-sm font-medium text-zinc-900">{getOrgTypeName(step1.org_type_id)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Location Summary */}
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
            <MapPin size={14} className="text-zinc-500" />
            <h3 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">Physical address</h3>
          </div>
          <div className="space-y-3 p-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">Address line 1</p>
              <p className="mt-0.5 text-sm font-medium text-zinc-900">{step2.address_line1 || '—'}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">Barangay / city</p>
              <p className="mt-0.5 text-sm font-medium text-zinc-900">
                {step2.barangay ? `${step2.barangay}, ` : ''}{step2.city}, {step2.province}
              </p>
            </div>
            <div className="border-t border-zinc-200 pt-3">
              <p className="font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">Ownership status</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-zinc-900">
                {step2.is_renting ? 'Renting' : 'Own property'}
              </p>
            </div>
          </div>
        </div>

        {/* Lines of Business Summary (Uses step3) */}
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white md:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Store size={14} className="text-zinc-500" />
              <h3 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">Declared business activities</h3>
            </div>
            <span className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[10px] text-zinc-700 tabular-nums">
              {step3.lineOfBusinesses?.length || 0} activities
            </span>
          </div>
          <div className="p-4">
            {step3.lineOfBusinesses?.length > 0 && step3.lineOfBusinesses[0].name !== '' ? (
              <ul className="list-inside list-disc space-y-1 text-sm text-zinc-900">
                {step3.lineOfBusinesses.map((lob, i) => (
                  <li key={i}>
                    <span className="font-medium">{lob.name || 'Unnamed activity'}</span>
                    <span className="font-mono text-zinc-500 tabular-nums">
                      {' '}— cap. inv. ₱{parseFloat(lob.capital_investment || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-700">No business activities declared. Go back to step 3.</p>
            )}
          </div>
        </div>

      </div>

      {/* Attachments Summary */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-zinc-500" />
            <h3 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">Uploaded documents</h3>
          </div>
          <span className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[10px] text-zinc-700 tabular-nums">
            {step4.documents?.length || 0} files
          </span>
        </div>
        <div className="space-y-3 p-4">

          {/* Barangay Clearance — Phase 3C row */}
          <div className="flex items-start gap-3 border-b border-zinc-100 py-2">
            <div className="mt-0.5 shrink-0 rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-500">
              <Building2 size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-900">
                Barangay Business Clearance
              </p>
              {requestClearance ? (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] text-white uppercase">
                  <CheckCircle2 size={10} />
                  Requested via municipality
                </span>
              ) : barangayClearanceDoc ? (
                <span className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[10px] text-zinc-700">
                  <Upload size={10} className="shrink-0" />
                  <span className="truncate">{barangayClearanceDoc.file_name}</span>
                </span>
              ) : (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] text-zinc-700 uppercase">
                  Not uploaded — go back to step 4
                </span>
              )}
            </div>
          </div>

          {/* Other uploaded documents */}
          {reqLoading ? (
             <div className="flex items-center gap-2 py-2 text-sm text-zinc-500">
               <Loader2 size={14} className="animate-spin" /> Loading requirements…
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
                      <div className={`mt-0.5 shrink-0 rounded-md border p-1.5 ${isUploaded ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-400'}`}>
                        {isUploaded ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900">
                          {req.name}
                        </p>
                        {req.is_conditional && req.condition_description && (
                          <p className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-zinc-500 uppercase">
                            {req.condition_description}
                          </p>
                        )}
                        <div className="mt-1.5">
                          {isUploaded ? (
                            req.max_files > 1 ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[10px] text-zinc-700 tabular-nums">
                                {files.length} file{files.length !== 1 ? 's' : ''} uploaded
                              </span>
                            ) : (
                              <span className="inline-flex max-w-full items-center gap-1 truncate rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[10px] text-zinc-700">
                                <Upload size={10} className="shrink-0" />
                                <span className="truncate">{files[0].file_name}</span>
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] text-zinc-500 uppercase">
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
            <p className="text-sm text-zinc-700">No other requirements found.</p>
          )}
        </div>
      </div>

      {/* Attestation Checkbox */}
      <div className={`rounded-lg border p-5 transition-colors duration-200 motion-reduce:transition-none ${
        step5.attestation_agreed
          ? 'border-zinc-900 bg-zinc-50'
          : 'border-zinc-200 bg-zinc-50'
      }`}>
        <label className="flex cursor-pointer items-start gap-3">
          <div className="mt-0.5">
            <input 
              type="checkbox" 
              checked={step5.attestation_agreed} 
              onChange={handleAttestation} 
              className="h-4 w-4 cursor-pointer rounded border-zinc-300 accent-zinc-900 focus:ring-2 focus:ring-zinc-900" 
            />
          </div>
          <div>
            <h4 className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
              Applicant attestation
              {step5.attestation_agreed && <CheckSquare size={13} className="text-zinc-900" />}
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              I declare under penalty of perjury that all information provided in this application is
              true, correct, and complete to the best of my knowledge. I authorize the Municipality of
              Liliw to verify these details, and understand that any misrepresentation may cause the
              revocation of my permit.
            </p>
          </div>
        </label>
      </div>

    </div>
  );
};

export default Step5_Review;