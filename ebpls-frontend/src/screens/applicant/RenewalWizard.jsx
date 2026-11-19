import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  FileText, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Check,
  ShieldCheck,
  Trash2,
  Calendar,
  XCircle,
  Info
} from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { ROUTES, API_ENDPOINTS } from '../../utils/constants';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const STEPS = [
  { id: 1, title: 'Select Branches & Lines', desc: 'Choose units to renew' },
  { id: 2, title: 'Gross Receipts Declaration', desc: 'Declare prior year sales' },
  { id: 3, title: 'Renewal Clearances', desc: 'Upload required documents' },
  { id: 4, title: 'Review & Submit', desc: 'Verify declaration summary' },
];

export default function RenewalWizard() {
  const { businessId } = useParams();
  const navigate = useNavigate();

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [businessData, setBusinessData] = useState(null);

  // Wizard state
  const [step, setStep] = useState(1);
  const [selectedBranchIds, setSelectedBranchIds] = useState(new Set());
  const [branchActivities, setBranchActivities] = useState({});
  const [documents, setDocuments] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [isLoadingReqs, setIsLoadingReqs] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attestation, setAttestation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Fetch business renewal details
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        setIsLoadingData(true);
        setDataError(null);
        const res = await apiClient.get(`/api/applications/business/${businessId}/renewal-data`);
        if (cancelled) return;

        if (res.success && res.data) {
          const { business, latest_permit, branches } = res.data;
          setBusinessData(res.data);

          // Default: select all active branches
          const initialBranchIds = new Set(branches.filter(b => b.is_active).map(b => b.branch_id));
          setSelectedBranchIds(initialBranchIds);

          // Initialize activities per branch
          const initialActs = {};
          branches.forEach(b => {
            initialActs[b.branch_id] = (b.activities || []).map(a => ({
              activity_id: a.activity_id,
              name: a.name,
              selected: true,
              gross_sales_prev_year: a.gross_sales_prev_year ? String(a.gross_sales_prev_year) : '',
              capitalization: a.capitalization || 0,
              units: 1,
              metric_count: a.metric_count || null,
            }));
          });
          setBranchActivities(initialActs);
        }
      } catch (err) {
        if (!cancelled) setDataError(err.message || 'Unable to load business renewal data.');
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    }

    if (businessId) loadData();
    return () => { cancelled = true; };
  }, [businessId]);

  // Load applicable requirements when moving to Step 3
  useEffect(() => {
    if (step !== 3 || !businessData) return;
    let cancelled = false;

    async function loadRequirements() {
      try {
        setIsLoadingReqs(true);
        const selectedBranches = (businessData.branches || [])
          .filter(b => selectedBranchIds.has(b.branch_id))
          .map(b => ({
            branch_key: b.branch_key || b.branch_id || 'main',
            tenancy_type: b.tenancy_type,
            activity_names: (branchActivities[b.branch_id] || [])
              .filter(a => a.selected)
              .map(a => a.name),
          }));

        const res = await apiClient.post('/api/applications/requirements/branches', {
          type_id: 2,
          org_type_id: businessData.business.org_type_id,
          branches: selectedBranches,
        });

        if (!cancelled && res.success) {
          setRequirements(res.data || []);
        }
      } catch (err) {
        console.error('Failed to resolve requirements:', err.message);
      } finally {
        if (!cancelled) setIsLoadingReqs(false);
      }
    }

    loadRequirements();
    return () => { cancelled = true; };
  }, [step, businessData, selectedBranchIds, branchActivities]);

  if (isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 size={32} className="animate-spin text-zinc-400 mb-3" />
        <p className="text-sm font-medium text-zinc-600">Loading business renewal details…</p>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Card className="border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle size={32} className="mx-auto text-red-600 mb-3" />
          <h2 className="text-lg font-semibold text-red-900">Unable to Start Renewal</h2>
          <p className="mt-1 text-sm text-red-700">{dataError}</p>
          <div className="mt-5">
            <Link to={ROUTES.APPLICANT_DASHBOARD} className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-900 underline">
              <ArrowLeft size={16} /> Return to Dashboard
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { business, latest_permit, branches = [] } = businessData;

  // Toggle branch selection
  const toggleBranch = (branchId) => {
    const updated = new Set(selectedBranchIds);
    if (updated.has(branchId)) {
      if (updated.size === 1) return; // Must have at least 1 branch
      updated.delete(branchId);
    } else {
      updated.add(branchId);
    }
    setSelectedBranchIds(updated);
  };

  // Toggle activity selection within a branch
  const toggleActivity = (branchId, actId) => {
    setBranchActivities(prev => {
      const list = prev[branchId] || [];
      const updated = list.map(a => a.activity_id === actId ? { ...a, selected: !a.selected } : a);
      return { ...prev, [branchId]: updated };
    });
  };

  // Update gross sales input
  const handleSalesChange = (branchId, actId, value) => {
    setBranchActivities(prev => {
      const list = prev[branchId] || [];
      const updated = list.map(a => a.activity_id === actId ? { ...a, gross_sales_prev_year: value } : a);
      return { ...prev, [branchId]: updated };
    });
  };

  // Handle document upload
  const handleFileUpload = async (requirementId, branchKey, file) => {
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
        const filtered = prev.filter(d => !(d.requirement_id === requirementId && (d.branch_key === branchKey || (!d.branch_key && !branchKey))));
        return [...filtered, {
          requirement_id: requirementId,
          branch_key: branchKey || null,
          file_path: filePath,
          file_name: file.name,
        }];
      });
    } catch (err) {
      alert(err.message || 'Error uploading file.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeDocument = (requirementId, branchKey) => {
    setDocuments(prev => prev.filter(d => !(d.requirement_id === requirementId && (d.branch_key === branchKey || (!d.branch_key && !branchKey)))));
  };

  // Validation checks per step
  const canProceedStep1 = selectedBranchIds.size > 0 && Array.from(selectedBranchIds).some(bId => (branchActivities[bId] || []).some(a => a.selected));

  const canProceedStep2 = Array.from(selectedBranchIds).every(bId => {
    const activeActs = (branchActivities[bId] || []).filter(a => a.selected);
    return activeActs.length > 0 && activeActs.every(a => a.gross_sales_prev_year !== '' && !isNaN(Number(a.gross_sales_prev_year)) && Number(a.gross_sales_prev_year) >= 0);
  });

  const canProceedStep3 = requirements.length === 0 || requirements.every(req => {
    // Check if uploaded
    return documents.some(d => d.requirement_id === req.id && (d.branch_key === req.branch_key || (!d.branch_key && !req.branch_key)));
  });

  // Final submission
  const handleSubmitRenewal = async () => {
    if (!attestation || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Build renewal payload
      const unselectedBranchIds = branches
        .filter(b => !selectedBranchIds.has(b.branch_id))
        .map(b => b.branch_id);

      const renewedBranches = branches
        .filter(b => selectedBranchIds.has(b.branch_id))
        .map(b => {
          const acts = (branchActivities[b.branch_id] || [])
            .filter(a => a.selected)
            .map(a => ({
              activity_id: a.activity_id,
              name: a.name,
              gross_sales_prev_year: Number(a.gross_sales_prev_year) || 0,
              capitalization: Number(a.capitalization) || 0,
              units: 1,
              metric_count: a.metric_count,
            }));

          return {
            branch_id: b.branch_id,
            branch_key: b.branch_key || b.branch_id || 'main',
            branch_name: b.branch_name,
            address_line1: b.address_line1,
            barangay: b.barangay,
            tenancy_type: b.tenancy_type,
            stall_unit_numbers: b.stall_unit_numbers || [],
            is_main: b.is_main,
            activities: acts,
          };
        });

      const payload = {
        business_id: business.business_id,
        selected_branch_ids: Array.from(selectedBranchIds),
        unselected_branch_ids: unselectedBranchIds,
        branches: renewedBranches,
        documents: documents.map(d => ({
          requirement_id: d.requirement_id,
          branch_key: d.branch_key,
          file_path: d.file_path,
          file_name: d.file_name,
        })),
      };

      const res = await apiClient.post('/api/applications/renew', payload);

      if (res.success && res.data?.application_no) {
        navigate(`/applicant/status?id=${res.data.application_no}`);
      } else {
        throw new Error(res.message || 'Renewal submission failed.');
      }
    } catch (err) {
      setSubmitError(err.message || 'Unable to submit renewal application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      {/* Header & Back Link */}
      <div>
        <Link to={ROUTES.APPLICANT_DASHBOARD} className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] tracking-wider uppercase text-zinc-500">
              Selective Business Permit Renewal
            </span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Renew Permit: {business.business_name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="font-mono font-medium text-zinc-900">{business.bin}</span>
              <span>•</span>
              <span>Permit: <strong className="font-mono text-zinc-700">{latest_permit?.permit_no || 'Active Permit'}</strong></span>
              {latest_permit?.expires_at && (
                <>
                  <span>•</span>
                  <span>Expires: {new Date(latest_permit.expires_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map(s => {
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <div
              key={s.id}
              className={`rounded-lg border p-3 transition-colors ${
                isActive
                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                  : isDone
                  ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950'
                  : 'border-zinc-200 bg-white text-zinc-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white text-zinc-900' : isDone ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {isDone ? <Check size={12} /> : s.id}
                </span>
                <span className="text-xs font-semibold">{s.title}</span>
              </div>
              <p className={`mt-1 text-[11px] truncate ${isActive ? 'text-zinc-300' : isDone ? 'text-emerald-800' : 'text-zinc-400'}`}>
                {s.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* STEP 1: Branch & Line Selector */}
      {step === 1 && (
        <Card className="space-y-6 p-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Select Branches & Operational Lines</h2>
            <p className="mt-1 text-xs text-zinc-600 leading-relaxed">
              Review all registered branches below. Select the branches and individual lines of business that will continue operations in Liliw for 2027.
            </p>
          </div>

          {/* Transaction Branching Notice (Revision 5 & 13) */}
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900">
            <Info size={16} className="mt-0.5 shrink-0 text-blue-600" />
            <div>
              <p className="font-semibold">Annual Renewal vs. Address Relocation Notice</p>
              <p className="mt-0.5 text-blue-800 leading-relaxed">
                This transaction processes <strong>Annual Renewal Only</strong> retaining your existing approved branch addresses. If you have moved or are relocating a branch to a new physical address within Liliw, Laguna, do not renew with outdated premises. File a <strong>Business Amendment</strong> linked to your existing BIN instead (requiring updated locational zoning clearance and BFP fire safety inspection).
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {branches.map(branch => {
              const isSelected = selectedBranchIds.has(branch.branch_id);
              const acts = branchActivities[branch.branch_id] || [];

              return (
                <div
                  key={branch.branch_id}
                  className={`rounded-lg border transition-all ${
                    isSelected ? 'border-zinc-300 bg-white shadow-sm' : 'border-zinc-200 bg-zinc-50/70 opacity-70'
                  }`}
                >
                  {/* Branch Header Toggle */}
                  <div className="flex items-center justify-between border-b border-zinc-100 p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleBranch(branch.branch_id)}
                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-zinc-900">{branch.branch_name}</h3>
                          {branch.is_main && (
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-zinc-700">
                              Main Branch
                            </span>
                          )}
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">
                            {branch.tenancy_type}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                          <MapPin size={12} className="text-zinc-400 shrink-0" />
                          {branch.address_line1}, {branch.barangay}, Liliw, Laguna
                        </p>
                      </div>
                    </label>

                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      isSelected ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'
                    }`}>
                      {isSelected ? 'Renewing' : 'Not Renewing'}
                    </span>
                  </div>

                  {/* Lines of Business within branch */}
                  <div className="p-4">
                    {isSelected ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-mono tracking-wider uppercase text-zinc-500">
                          Declared Lines of Business
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {acts.map(act => (
                            <label
                              key={act.activity_id}
                              className={`flex items-center gap-2.5 rounded-md border p-2.5 text-xs cursor-pointer transition-colors ${
                                act.selected ? 'border-zinc-900 bg-zinc-50 text-zinc-900 font-medium' : 'border-zinc-200 bg-white text-zinc-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={act.selected}
                                onChange={() => toggleActivity(branch.branch_id, act.activity_id)}
                                className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                              />
                              <span className="truncate">{act.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
                        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                        <p>
                          <strong>Notice:</strong> This branch is excluded from renewal. It will be flagged as inactive for 2027 and will not be assessed fees. Operating an unrenewed branch is prohibited by municipal ordinance.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
            <span className="text-xs text-zinc-500">
              {selectedBranchIds.size} of {branches.length} branches selected for renewal
            </span>
            <Button
              variant="primary"
              disabled={!canProceedStep1}
              rightIcon={<ArrowRight size={16} />}
              onClick={() => setStep(2)}
            >
              Continue to Gross Receipts
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: Gross Receipts Declaration */}
      {step === 2 && (
        <Card className="space-y-6 p-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Preceding Year Gross Receipts Declaration</h2>
            <p className="mt-1 text-xs text-zinc-600 leading-relaxed">
              Under Section 3A.01 of the Liliw Revenue Code, business taxes for permit renewals are assessed strictly against the preceding calendar year's gross sales receipts for each operational line.
            </p>
          </div>

          <div className="space-y-6">
            {branches.filter(b => selectedBranchIds.has(b.branch_id)).map(branch => {
              const activeActs = (branchActivities[branch.branch_id] || []).filter(a => a.selected);
              return (
                <div key={branch.branch_id} className="rounded-lg border border-zinc-200 bg-white p-5 space-y-4">
                  <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">{branch.branch_name}</h3>
                      <p className="text-xs text-zinc-500">{branch.address_line1}, {branch.barangay}</p>
                    </div>
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 font-mono">
                      {branch.tenancy_type}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {activeActs.map(act => (
                      <div key={act.activity_id} className="grid gap-3 sm:grid-cols-2 rounded-md bg-zinc-50 p-4 border border-zinc-100">
                        <div className="sm:col-span-2">
                          <span className="text-xs font-semibold text-zinc-900">{act.name}</span>
                          <span className="ml-2 font-mono text-[10px] text-zinc-400">Activity #{act.activity_id}</span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-700">
                            Preceding Year Gross Sales (₱) <span className="text-red-500">*</span>
                          </label>
                          <div className="relative mt-1">
                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-zinc-400 font-medium">₱</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={act.gross_sales_prev_year}
                              onChange={(e) => handleSalesChange(branch.branch_id, act.activity_id, e.target.value)}
                              className="w-full rounded-md border border-zinc-300 bg-white pl-7 pr-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
                              required
                            />
                          </div>
                          <p className="mt-1 text-[10px] text-zinc-500">Gross sales earned from Jan 1 – Dec 31 of prior year.</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-700">
                            Operational Units / Stalls
                          </label>
                          <input
                            type="number"
                            min="1"
                            disabled
                            value={act.units || 1}
                            className="mt-1 w-full rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-xs text-zinc-500"
                          />
                          <p className="mt-1 text-[10px] text-zinc-400">Fixed to branch establishment declarations.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
            <Button variant="secondary" leftIcon={<ArrowLeft size={16} />} onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" disabled={!canProceedStep2} rightIcon={<ArrowRight size={16} />} onClick={() => setStep(3)}>
              Continue to Clearances
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: Clearances & Documents */}
      {step === 3 && (
        <Card className="space-y-6 p-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Renewal Documentary Requirements</h2>
            <p className="mt-1 text-xs text-zinc-600 leading-relaxed">
              Upload the current renewal clearances required for your renewed business establishments. Standard file formats (PDF, JPG, PNG) up to 5 MB are accepted.
            </p>
          </div>

          {isLoadingReqs ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-zinc-400 mb-2" />
              <p className="text-xs text-zinc-500">Resolving branch requirements…</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requirements.map(req => {
                const uploaded = documents.find(d => d.requirement_id === req.id && (d.branch_key === req.branch_key || (!d.branch_key && !req.branch_key)));
                const branchObj = req.branch_key ? branches.find(b => (b.branch_key === req.branch_key || b.branch_id === req.branch_key)) : null;

                return (
                  <div key={`${req.id}-${req.branch_key || 'shared'}`} className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-zinc-900">{req.name}</h4>
                          {branchObj ? (
                            <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-700">
                              {branchObj.branch_name} ({branchObj.barangay})
                            </span>
                          ) : (
                            <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-700">
                              Shared Legal Entity
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{req.description || req.condition_description || 'Standard renewal document.'}</p>
                      </div>

                      <div className="shrink-0">
                        {uploaded ? (
                          <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={15} className="text-emerald-600" />
                            <span className="truncate max-w-[150px] font-medium">{uploaded.file_name}</span>
                            <button
                              type="button"
                              onClick={() => removeDocument(req.id, req.branch_key)}
                              className="text-zinc-400 hover:text-red-600 transition-colors ml-1"
                              title="Remove file"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition-colors">
                            <Upload size={14} />
                            <span>Upload File</span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => handleFileUpload(req.id, req.branch_key, e.target.files[0])}
                              disabled={isUploading}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
            <Button variant="secondary" leftIcon={<ArrowLeft size={16} />} onClick={() => setStep(2)}>
              Back
            </Button>
            <Button variant="primary" disabled={!canProceedStep3 || isUploading} rightIcon={<ArrowRight size={16} />} onClick={() => setStep(4)}>
              Review & Submit
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: Review & Submit */}
      {step === 4 && (
        <Card className="space-y-6 p-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Review & Confirm Renewal Application</h2>
            <p className="mt-1 text-xs text-zinc-600">
              Carefully verify your renewed branches, lines of business, and declared gross sales before final submission.
            </p>
          </div>

          {submitError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold">Submission Error</p>
                <p>{submitError}</p>
              </div>
            </div>
          )}

          {/* Business & BIN Summary */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 grid gap-3 sm:grid-cols-3 text-xs">
            <div>
              <span className="text-zinc-500">Business Name:</span>
              <p className="font-semibold text-zinc-900 mt-0.5">{business.business_name}</p>
            </div>
            <div>
              <span className="text-zinc-500">Business Identification No. (BIN):</span>
              <p className="font-mono font-semibold text-zinc-900 mt-0.5">{business.bin}</p>
            </div>
            <div>
              <span className="text-zinc-500">Active Permit Reference:</span>
              <p className="font-mono font-semibold text-zinc-900 mt-0.5">{latest_permit?.permit_no || 'BP-2026'}</p>
            </div>
          </div>

          {/* Branch & Activities Itemized Summary */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono tracking-wider uppercase text-zinc-500">Itemized Branch Renewal Declarations</h3>
            {branches.map(b => {
              const isRenewed = selectedBranchIds.has(b.branch_id);
              const acts = (branchActivities[b.branch_id] || []).filter(a => a.selected);
              const totalSales = acts.reduce((sum, a) => sum + (Number(a.gross_sales_prev_year) || 0), 0);

              return (
                <div key={b.branch_id} className={`rounded-lg border p-4 text-xs ${isRenewed ? 'border-zinc-200 bg-white' : 'border-zinc-200 bg-zinc-50/50'}`}>
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900">{b.branch_name}</span>
                      <span className="text-zinc-500">({b.barangay})</span>
                      {b.is_main && <span className="rounded bg-zinc-100 px-1.5 py-0.2 font-mono text-[9px] uppercase">Main</span>}
                    </div>
                    <span className={`px-2 py-0.5 rounded font-medium ${isRenewed ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'}`}>
                      {isRenewed ? 'Renewed' : 'Not Renewed (Ceased / Excluded)'}
                    </span>
                  </div>

                  {isRenewed ? (
                    <div className="mt-3 space-y-2">
                      {acts.map(a => (
                        <div key={a.activity_id} className="flex items-center justify-between text-zinc-700">
                          <span>{a.name}</span>
                          <span className="font-mono font-medium text-zinc-900">
                            ₱{Number(a.gross_sales_prev_year).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-zinc-100 pt-2 flex items-center justify-between font-semibold text-zinc-900">
                        <span>Total Declared Gross Sales:</span>
                        <span className="font-mono text-sm">
                          ₱{totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-zinc-400 italic">No lines renewed for this establishment.</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legal Attestation Checkbox */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={attestation}
                onChange={(e) => setAttestation(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
              <span className="text-xs text-zinc-700 leading-relaxed">
                I hereby declare under the penalties of perjury that all branches, lines of business, preceding year gross sales, and documentary clearances submitted herein are true, correct, and complete to the best of my knowledge pursuant to the laws of the Republic of the Philippines and municipal tax ordinances of Liliw, Laguna.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
            <Button variant="secondary" leftIcon={<ArrowLeft size={16} />} onClick={() => setStep(3)}>
              Back
            </Button>
            <Button
              variant="primary"
              disabled={!attestation || isSubmitting}
              isLoading={isSubmitting}
              leftIcon={<CheckCircle2 size={16} />}
              onClick={handleSubmitRenewal}
            >
              Submit Renewal Application
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
