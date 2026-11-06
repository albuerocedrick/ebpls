import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, ArrowLeft, Printer, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../utils/apiClient';
import { API_BASE_URL, STATUSES } from '../../utils/constants';
import useAuthStore from '../../store/authStore';
import { validateDocumentFile } from '../../utils/uploadValidation';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const currency = value => Number(value || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const inputClass = 'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none';

export default function AssessmentGrid() {
  const { appNo } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  const [certificate, setCertificate] = useState(null);
  const [authority, setAuthority] = useState('');
  const [remarks, setRemarks] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/api/treasury/assess/${appNo}`);
        if (!cancelled) { setAssessment(res.data); setCertificate(null); setVerified(false); setRemarks(''); }
      } catch (err) { if (!cancelled) setError(err.message || 'Unable to load assessment.'); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [appNo, reload]);

  async function uploadCertificate(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const invalid = validateDocumentFile(file);
    if (invalid) { toast.error(invalid); return; }
    setProcessing(true);
    setCertificate(null);
    setVerified(false);
    try {
      const res = await apiClient.post(`/api/treasury/assess/${appNo}/bmbe-certificate`, { fileName: file.name, mimeType: file.type });
      const uploaded = await fetch(res.data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!uploaded.ok) throw new Error('Certificate upload failed.');
      setCertificate({ path: res.data.filePath, name: file.name });
      toast.success('Certificate uploaded.');
    } catch (err) { toast.error(err.message); }
    finally { setProcessing(false); }
  }

  async function changeExemption() {
    const enabled = !assessment.bmbe_exempt;
    if (remarks.trim().length < 3) { toast.error('Enter the approval or removal reason.'); return; }
    if (enabled && (!certificate || !verified || authority.trim().length < 3)) { toast.error('Upload and verify the certificate and enter the approved LGU authority reference.'); return; }
    setProcessing(true);
    try {
      await apiClient.put(`/api/treasury/assess/${appNo}/bmbe`, {
        enabled, remarks: remarks.trim(), ...(enabled ? { certificate_path: certificate.path, authority_reference: authority.trim(), certificate_verified: verified } : {}),
      });
      toast.success(enabled ? 'Approved BMBE Business Tax exemption applied.' : 'Business Tax restored to its assessed amount.');
      setReload(value => value + 1);
    } catch (err) { toast.error(err.message); }
    finally { setProcessing(false); }
  }

  async function finalize() {
    setProcessing(true);
    try { await apiClient.put(`/api/treasury/assess/${appNo}/finalize`); toast.success('Tax Order of Payment finalized.'); setReload(value => value + 1); }
    catch (err) { toast.error(err.message); }
    finally { setProcessing(false); }
  }

  async function viewCertificate() {
    try { const res = await apiClient.get(`/api/treasury/assess/${appNo}/bmbe-certificate`); window.open(res.data.url, '_blank', 'noopener'); }
    catch (err) { toast.error(err.message); }
  }

  if (loading) return <div className="flex h-64 items-center justify-center gap-3 text-sm text-zinc-500"><Loader2 className="animate-spin" size={22} />Loading Tax Order of Payment…</div>;
  const status = assessment?.applications?.status;
  const context = assessment?.calculation_context;
  const canExempt = status === STATUSES.ASSESSED && context?.version === 3;
  const items = assessment?.assessment_line_items || [];
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Back to Treasury queue" className="rounded-md border border-zinc-200 p-2"><ArrowLeft size={20} /></button>
        <div className="flex-1"><h1 className="text-2xl font-semibold text-zinc-900">Tax Order of Payment</h1><p className="mt-1 text-xs text-zinc-500">{appNo}</p></div>
        {assessment && <Badge status={status} />}
      </div>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {!assessment ? <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600">No assessment is available for this application. Fees are generated automatically when BPLO approves it. Older approved applications without a bill require an administrator's review.</div> : <>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-6">
          <div><p className="text-xs uppercase tracking-wide text-zinc-500">Total amount due</p><p className="mt-2 font-mono text-3xl font-semibold text-zinc-900">{currency(assessment.total_amount)}</p></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" leftIcon={<Printer size={16} />} onClick={() => window.open(`${API_BASE_URL}/api/documents/top/${appNo}?token=${useAuthStore.getState().token}`, '_blank')}>Print TOP</Button>
            {status === STATUSES.ASSESSED && <Button onClick={finalize} disabled={processing} isLoading={processing}>Finalize TOP</Button>}
            {status === STATUSES.FOR_PAYMENT && <Button onClick={() => navigate(`/treasury/cashier?app=${appNo}`)} rightIcon={<ArrowRight size={16} />}>Record payment</Button>}
          </div>
        </div>
        {context && <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
          <p className="font-medium">{context.zone.name} · {Number(context.zone.fee_multiplier).toLocaleString('en-PH', { maximumFractionDigits: 4 })}× regulatory fee multiplier</p>
          <p className="mt-1">Declared capital: {currency(context.total_capital)} · Recommended floor: {currency(context.zone.min_capital_floor)}</p>
          {context.warnings?.map((warning, index) => <p key={index} className="mt-2 flex gap-2 text-xs text-amber-800"><AlertCircle size={14} className="shrink-0" />{warning}</p>)}
        </section>}
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500"><tr><th className="p-4">Fee</th><th className="p-4">Computation</th><th className="p-4 text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-zinc-100">{items.map(item => <tr key={item.id}>
              <td className="p-4 font-medium text-zinc-900">{item.fee_types?.name}{assessment.bmbe_exempt && item.is_business_tax && <span className="mt-1 block text-xs text-emerald-700">Approved BMBE exemption · base {currency(item.base_amount)}</span>}</td>
              <td className="max-w-sm p-4 text-xs leading-relaxed text-zinc-500">{item.computation || 'Existing assessment snapshot'}</td>
              <td className="p-4 text-right font-mono font-medium text-zinc-900">{currency(item.amount)}</td>
            </tr>)}</tbody>
            <tfoot className="border-t border-zinc-200 bg-zinc-50"><tr><th className="p-4" colSpan={2}>Total</th><td className="p-4 text-right font-mono font-semibold">{currency(assessment.total_amount)}</td></tr></tfoot>
          </table>
          <p className="border-t border-zinc-200 p-4 text-xs text-zinc-500">Fee amounts are read-only. Regulatory fees follow the configured schedule and the assessment's zoning snapshot.</p>
        </div>
        {context?.version === 3 && <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-base font-medium text-zinc-900"><ShieldCheck size={18} />BMBE Business Tax exemption</h2>
          <p className="text-sm leading-relaxed text-zinc-600">Apply only after verifying the DTI BMBE certificate and the LGU authority for local Business Tax relief. Other fees remain payable. Changes are audited and must be made before finalizing the bill.</p>
          {assessment.bmbe_exempt && <p className="text-sm text-emerald-700">Exemption applied · Authority: {assessment.bmbe_authority_reference}</p>}
          {assessment.bmbe_certificate_path && <Button variant="secondary" onClick={viewCertificate}>View recorded certificate</Button>}
          {canExempt && <>
            {!assessment.bmbe_exempt && <>
              <label className="block text-sm text-zinc-700">DTI BMBE certificate (PDF, JPG or PNG, up to 5 MB)<input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={processing} onChange={uploadCertificate} className="mt-2 block w-full text-sm" /></label>
              {certificate && <p className="text-xs text-zinc-600">Uploaded: {certificate.name}</p>}
              <label className="block text-sm text-zinc-700">Approved LGU ordinance / authority reference<input value={authority} onChange={e => setAuthority(e.target.value)} maxLength={200} disabled={processing} className={`mt-2 ${inputClass}`} /></label>
              <label className="flex gap-2 text-sm text-zinc-700"><input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} disabled={processing} />I verified the certificate's validity and the approved local tax relief.</label>
            </>}
            <label className="block text-sm text-zinc-700">{assessment.bmbe_exempt ? 'Reason for removing the exemption' : 'Approval remarks'}<textarea value={remarks} onChange={e => setRemarks(e.target.value)} maxLength={500} disabled={processing} className={`mt-2 ${inputClass}`} /></label>
            <Button variant="secondary" onClick={changeExemption} disabled={processing} isLoading={processing}>{assessment.bmbe_exempt ? 'Remove BMBE exemption' : 'Apply approved BMBE exemption'}</Button>
          </>}
        </section>}
      </>}
    </div>
  );
}
