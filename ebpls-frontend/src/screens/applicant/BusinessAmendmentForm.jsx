import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  FileText, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Check,
  ShieldCheck,
  Trash2,
  Calendar,
  AlertTriangle,
  Info
} from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { ROUTES, API_ENDPOINTS } from '../../utils/constants';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function BusinessAmendmentForm() {
  const { businessId } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [businessData, setBusinessData] = useState(null);

  // Form State
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [newAddressLine1, setNewAddressLine1] = useState('');
  const [newBarangay, setNewBarangay] = useState('');
  const [newTenancyType, setNewTenancyType] = useState('Rented');
  const [newStallNumbers, setNewStallNumbers] = useState('');
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [attestationAgreed, setAttestationAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await apiClient.get(API_ENDPOINTS.APPLICATIONS_AMENDMENT_DATA(businessId));
        if (!cancelled && res.success) {
          setBusinessData(res.data);
          const branches = res.data.branches || [];
          if (branches.length > 0) {
            setSelectedBranchId(branches[0].branch_id);
          }
          if (res.data.barangays?.length > 0) {
            setNewBarangay(res.data.barangays[0].name);
          }
        } else if (!cancelled) {
          setError(res.error?.message || 'Failed to load business amendment information.');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to connect to server.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [businessId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 size={32} className="animate-spin text-zinc-400 mb-3" />
        <p className="text-sm font-medium text-zinc-600">Loading business information for amendment…</p>
      </div>
    );
  }

  if (error || !businessData) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Card className="border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle size={32} className="mx-auto text-red-600 mb-3" />
          <h2 className="text-lg font-semibold text-red-900">Unable to Start Business Amendment</h2>
          <p className="mt-1 text-sm text-red-700">{error || 'Business record not found.'}</p>
          <div className="mt-5">
            <Link to={ROUTES.APPLICANT_DASHBOARD} className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-900 underline">
              <ArrowLeft size={16} /> Return to Dashboard
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { business, branches = [], barangays = [], requirements = [], pending_amendments = [] } = businessData;
  const currentBranch = branches.find(b => b.branch_id === selectedBranchId) || branches[0];
  const hasPendingAmendment = pending_amendments.some(a => a.branch_id === selectedBranchId && a.status === 'Pending');

  // Filter requirements based on tenancy type
  const applicableRequirements = requirements.filter(req => {
    if (req.name === 'Contract of Lease' && newTenancyType !== 'Rented') return false;
    if (req.name === 'Building Permit' && newTenancyType !== 'Owned Commercial') return false;
    if (req.name === 'Zoning Clearance' && newTenancyType !== 'Owned Residential') return false;
    return true;
  });

  // Handle document upload
  const handleFileUpload = async (requirementId, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5 MB limit.');
      return;
    }

    try {
      setIsUploading(true);
      const ext = file.name.split('.').pop().toLowerCase();
      const mimeTypes = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
      const mimeType = mimeTypes[ext] || file.type;

      // 1. Request presigned upload URL
      const urlRes = await apiClient.post(API_ENDPOINTS.APPLICATIONS_UPLOAD, {
        fileName: file.name,
        mimeType: mimeType,
      });

      if (!urlRes.success || !urlRes.data?.uploadUrl) {
        throw new Error('Failed to acquire upload authorization.');
      }

      // 2. Upload file binary
      const uploadResp = await fetch(urlRes.data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: file,
      });

      if (!uploadResp.ok) throw new Error('File upload failed.');

      const filePath = urlRes.data.filePath;

      // 3. Save to documents state
      setDocuments(prev => {
        const filtered = prev.filter(d => d.requirement_id !== requirementId);
        return [
          ...filtered,
          {
            requirement_id: requirementId,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
          }
        ];
      });
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const removeDocument = (requirementId) => {
    setDocuments(prev => prev.filter(d => d.requirement_id !== requirementId));
  };

  // Submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedBranchId) {
      setSubmitError('Please select a branch to relocate.');
      return;
    }
    if (!newAddressLine1.trim()) {
      setSubmitError('Please enter the new street address.');
      return;
    }
    if (!newBarangay) {
      setSubmitError('Please select the new Liliw barangay.');
      return;
    }
    if (documents.length < applicableRequirements.length) {
      setSubmitError('Please upload all required premises clearances for the new location.');
      return;
    }
    if (!attestationAgreed) {
      setSubmitError('You must attest that all provided information and clearances are authentic.');
      return;
    }

    try {
      setIsSubmitting(true);
      const stalls = newStallNumbers
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        business_id: business.business_id,
        branch_id: selectedBranchId,
        new_address_line1: newAddressLine1.trim(),
        new_barangay: newBarangay,
        new_tenancy_type: newTenancyType,
        new_stall_unit_numbers: stalls,
        documents: documents.map(d => ({
          requirement_id: d.requirement_id,
          file_path: d.file_path,
          file_name: d.file_name,
          file_size: d.file_size,
        })),
        attestation_agreed: true,
      };

      const res = await apiClient.post(API_ENDPOINTS.APPLICATIONS_AMEND_LOCATION, payload);
      if (res.success && res.data?.application_no) {
        navigate(`/applicant/status?id=${res.data.application_no}`);
      } else {
        setSubmitError(res.error?.message || 'Failed to submit address amendment.');
      }
    } catch (err) {
      setSubmitError(err.message || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6 pb-20">
      {/* Back Link */}
      <div>
        <Link
          to={ROUTES.APPLICANT_DASHBOARD}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>

      {/* Header Banner */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-zinc-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white uppercase">
                Business Amendment
              </span>
              <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-700">
                {business.bin}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">
              Relocate Branch / Change of Address
            </h1>
            <p className="text-xs text-zinc-500">
              {business.business_name} {business.trade_name ? `(${business.trade_name})` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Relocation Policy Alert (Revision 5 & 13) */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900">
        <Info size={18} className="mt-0.5 shrink-0 text-blue-600" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-950">LGU Relocation & Zero Duplicate BIN Policy</p>
          <p className="text-blue-800 leading-relaxed">
            Moving within the Municipality of Liliw is processed as an <strong>amendment to your existing business permit</strong> rather than a brand-new application. Your Business Identification Number (BIN) and tax history remain intact. You are required to submit updated premises clearances (Locational/Zoning Clearance, Tenancy Document, and Fire Safety Certificate) for the new location.
          </p>
          <p className="text-[11px] text-blue-700 italic">
            * Note: If moving outside the Municipality of Liliw, this transaction constitutes a business cessation/closure in Liliw and must be filed under Business Retirement instead.
          </p>
        </div>
      </div>

      {hasPendingAmendment && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Amendment Already In Progress</p>
            <p className="mt-0.5 text-amber-800 leading-relaxed">
              An address relocation amendment for this branch is currently pending review by the BPLO and regulatory inspectors. You cannot submit another amendment while the previous one is pending.
            </p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Branch Selection & Current Location */}
        <Card className="space-y-5 p-6">
          <div className="border-b border-zinc-100 pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-900">
              1. Branch & Current Premises
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Select which branch is moving to a new physical location.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Branch to Relocate *
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={hasPendingAmendment}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 focus:border-zinc-900 focus:outline-hidden"
              >
                {branches.map(b => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {b.branch_name} {b.is_main ? '(Main Branch)' : ''} — {b.barangay}
                  </option>
                ))}
              </select>
            </div>

            {currentBranch && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs">
                <span className="font-mono text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Current Registered Address (Old)
                </span>
                <p className="mt-1 font-medium text-zinc-800">
                  {currentBranch.address_line1}, {currentBranch.barangay}, Liliw, Laguna
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-600">
                  <span className="rounded bg-zinc-200/70 px-1.5 py-0.5">
                    Tenancy: {currentBranch.tenancy_type}
                  </span>
                  {currentBranch.stall_unit_numbers?.length > 0 && (
                    <span className="rounded bg-zinc-200/70 px-1.5 py-0.5">
                      Stall: {currentBranch.stall_unit_numbers.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Step 2: New Premises Information */}
        <Card className="space-y-5 p-6">
          <div className="border-b border-zinc-100 pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-900">
              2. New Branch Location in Liliw
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Enter the new physical address and commercial tenancy details.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                New Street Address / Building / Unit Number *
              </label>
              <input
                type="text"
                value={newAddressLine1}
                onChange={(e) => setNewAddressLine1(e.target.value)}
                placeholder="e.g. Unit 4B, Gat Tayaw Commercial Complex, J. Rizal St."
                disabled={hasPendingAmendment}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  New Barangay (Within Liliw) *
                </label>
                <select
                  value={newBarangay}
                  onChange={(e) => setNewBarangay(e.target.value)}
                  disabled={hasPendingAmendment}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 focus:border-zinc-900 focus:outline-hidden"
                >
                  {barangays.map(b => (
                    <option key={b.id} value={b.name}>
                      {b.name} ({b.location_zones?.name || 'Commercial Zone'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  New Tenancy Arrangement *
                </label>
                <select
                  value={newTenancyType}
                  onChange={(e) => setNewTenancyType(e.target.value)}
                  disabled={hasPendingAmendment}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 focus:border-zinc-900 focus:outline-hidden"
                >
                  <option value="Rented">Rented (Commercial Lessee)</option>
                  <option value="Owned Commercial">Owned Commercial (Owner of Land/Building)</option>
                  <option value="Owned Residential">Owned Residential (Operating from Residence)</option>
                </select>
              </div>
            </div>

            {newTenancyType === 'Rented' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Stall / Booth / Unit Numbers (Optional)
                </label>
                <input
                  type="text"
                  value={newStallNumbers}
                  onChange={(e) => setNewStallNumbers(e.target.value)}
                  placeholder="e.g. Stall 12, Booth B (comma separated)"
                  disabled={hasPendingAmendment}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-hidden"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Step 3: Required Premises Clearances Dropzone */}
        <Card className="space-y-5 p-6">
          <div className="border-b border-zinc-100 pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-900">
              3. Upload New Premises Clearances
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Under municipal regulatory inspection standards, clearances must correspond to the new building premises.
            </p>
          </div>

          <div className="space-y-4">
            {applicableRequirements.map(req => {
              const uploadedDoc = documents.find(d => d.requirement_id === req.id);
              const agency = req.regulatory_agency_code;

              return (
                <div key={req.id} className="rounded-lg border border-zinc-200 bg-white p-4 transition-all">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-zinc-900">{req.name}</h4>
                        {agency && (
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-zinc-700 uppercase">
                            {agency} Inspection
                          </span>
                        )}
                        <span className="rounded bg-red-50 text-red-700 border border-red-200 px-1 py-0.2 font-mono text-[9px]">
                          Required
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {req.description || 'Valid clearance issued for the new business premises.'}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {uploadedDoc ? (
                        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-900">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span className="max-w-[140px] truncate font-medium">{uploadedDoc.file_name}</span>
                          <button
                            type="button"
                            onClick={() => removeDocument(req.id)}
                            disabled={hasPendingAmendment}
                            className="ml-1 text-emerald-700 hover:text-red-600"
                            title="Remove file"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <label className={`inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 cursor-pointer ${
                          isUploading || hasPendingAmendment ? 'opacity-50 pointer-events-none' : ''
                        }`}>
                          <Upload size={13} className="text-zinc-500" />
                          <span>Upload File</span>
                          <input
                            type="file"
                            accept=".pdf,image/jpeg,image/png"
                            onChange={(e) => handleFileUpload(req.id, e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Step 4: Attestation & Submission */}
        <Card className="space-y-4 p-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={attestationAgreed}
              onChange={(e) => setAttestationAgreed(e.target.checked)}
              disabled={hasPendingAmendment}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            <span className="text-xs text-zinc-700 leading-relaxed">
              I hereby certify under penalty of perjury that the information provided regarding the new branch location is true and accurate, and that all uploaded clearance documents are authentic and officially issued for the new premises within the Municipality of Liliw, Laguna.
            </span>
          </label>

          {submitError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-red-600" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
            <Link
              to={ROUTES.APPLICANT_DASHBOARD}
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900"
            >
              Cancel
            </Link>

            <Button
              type="submit"
              disabled={isSubmitting || isUploading || hasPendingAmendment || !attestationAgreed}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs px-6 py-2.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1.5" />
                  Submitting Amendment…
                </>
              ) : (
                <>
                  <ShieldCheck size={14} className="mr-1.5" />
                  Submit Address Amendment
                </>
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
