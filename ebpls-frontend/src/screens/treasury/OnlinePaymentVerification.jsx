import { useEffect, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { ExternalLink, RefreshCw } from 'lucide-react';
import Button from '../../components/ui/Button';
import apiClient from '../../utils/apiClient';

const endpoint = '/api/treasury/payments';
const previewRenewalMs = 10 * 60 * 1000;
const currency = amount => Number(amount).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const proofKey = proof => `${proof.transaction_id}:${proof.proof_revision}`;

export default function OnlinePaymentVerification() {
  const [params] = useSearchParams();
  const applicationNo = params.get('app');
  const setNavCount = useOutletContext();
  const [queue, setQueue] = useState(null);
  const [error, setError] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(100);
  const [mode, setMode] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const initializedSelection = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let loading = false;
    async function refresh(renewPreviews = false) {
      if (loading) return;
      loading = true;
      try {
        const response = await apiClient.get(`${endpoint}/pending-proofs`);
        if (cancelled) return;
        const items = response.data || [];
        const signedAt = Date.now();
        setQueue(previous => {
          const priorByKey = new Map(previous?.map(item => [proofKey(item), item]));
          return items.map(item => {
            const prior = priorByKey.get(proofKey(item));
            if (!renewPreviews && item.proof_url && prior?.proof_url && signedAt - prior.signedAt < previewRenewalMs) {
              return { ...item, proof_url: prior.proof_url, signedAt: prior.signedAt };
            }
            return { ...item, signedAt };
          });
        });
        setError('');
        setNavCount?.(items.length);
        if (!initializedSelection.current) {
          initializedSelection.current = true;
          const requested = items.find(item => item.application_no === applicationNo);
          if (requested) setSelectedKey(proofKey(requested));
        }
      } catch (failure) {
        if (!cancelled) setError(failure.message);
      } finally { loading = false; }
    }
    refresh(true);
    const interval = setInterval(() => refresh(), 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [applicationNo, reload, setNavCount]);

  const selected = queue?.find(item => proofKey(item) === selectedKey);
  const term = search.trim().toLowerCase();
  const visible = (queue || []).filter(item => [item.business_name, item.application_no, item.payment_reference_no]
    .some(value => String(value || '').toLowerCase().includes(term)));

  function select(item) {
    setSelectedKey(proofKey(item));
    setMode(null);
    setRemarks('');
    setZoom(100);
    setNotice('');
  }

  async function submitDecision(event) {
    event.preventDefault();
    if (!selected || !mode || saving) return;
    setSaving(true);
    setNotice('');
    try {
      const response = await apiClient.put(`${endpoint}/${selected.transaction_id}/${mode}-proof`, {
        proof_revision: selected.proof_revision,
        ...(mode === 'reject' ? { rejection_reason: remarks.trim() } : {}),
      });
      setNotice(mode === 'verify' ? `Payment verified. Official Receipt ${response.data.or_number} issued.` : 'Proof returned. The applicant can submit a corrected receipt.');
      setQueue(items => items?.filter(item => proofKey(item) !== selectedKey));
      setSelectedKey('');
      setMode(null);
      setReload(value => value + 1);
    } catch (failure) {
      setNotice(failure.message);
      setReload(value => value + 1);
    } finally { setSaving(false); }
  }

  return <div className="mx-auto max-w-7xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold text-zinc-900">Payment Verification</h1><p className="mt-1 text-sm text-zinc-600">Review GCash and bank transfer receipts against the assessed bill.</p></div>
      <Button variant="secondary" disabled={saving} leftIcon={<RefreshCw size={16} />} onClick={() => setReload(value => value + 1)}>Refresh</Button>
    </header>
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-md bg-zinc-100 p-3 text-sm text-zinc-900">{notice}</p>}
    <div className="grid gap-4 xl:grid-cols-[minmax(230px,1fr)_minmax(0,3fr)]">
      <section aria-label="Pending payment proofs" className="self-start overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="space-y-2 border-b border-zinc-200 p-4"><h2 className="text-sm font-semibold">Pending proofs {queue && `(${queue.length})`}</h2>
          <input aria-label="Search payment proofs" placeholder="Business, application, reference" value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-md border border-zinc-300 px-2 py-2 text-sm" />
        </div>
        {queue === null && !error && <p className="p-4 text-sm text-zinc-600">Loading payment proofs…</p>}
        {queue && !visible.length && <p className="p-4 text-sm text-zinc-600">{term ? 'No matching payment proofs.' : 'No payments waiting for verification.'}</p>}
        {visible.map(item => <button key={proofKey(item)} type="button" aria-pressed={selectedKey === proofKey(item)} disabled={saving} onClick={() => select(item)} className="block w-full border-b border-zinc-100 p-4 text-left text-sm hover:bg-zinc-50 aria-pressed:bg-zinc-100">
          <strong className="block">{item.business_name}</strong><span className="block text-xs text-zinc-600">{item.application_no} · {item.tendered_type}</span>
          <span className="block text-xs text-zinc-600">{item.payment_reference_no} · {currency(item.assessed_total)}</span>
        </button>)}
      </section>
      {!selected ? <p className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600">{selectedKey ? 'This proof is no longer pending or has been replaced. Select a proof to continue.' : 'Select a payment proof to compare it with the bill.'}</p> :
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:items-start">
          <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
            <div><h2 className="text-base font-semibold">{selected.business_name}</h2><p className="text-xs text-zinc-600">{selected.application_no}</p></div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-zinc-600">Taxpayer</dt><dd>{selected.owner_name || '—'}</dd>
              <dt className="text-zinc-600">Channel</dt><dd>{selected.tendered_type}</dd>
              <dt className="text-zinc-600">Reference</dt><dd className="break-all font-mono">{selected.payment_reference_no || '—'}</dd>
              <dt className="text-zinc-600">Payment date</dt><dd>{selected.payment_date || '—'}</dd>
            </dl>
            <table className="w-full text-sm"><caption className="mb-2 text-left font-semibold">Assessed fees</caption>
              <tbody>{selected.line_items.map(item => <tr key={item.name} className="border-b border-zinc-100"><td className="py-2">{item.name}</td><td className="py-2 text-right tabular-nums">{currency(item.amount)}</td></tr>)}</tbody>
              <tfoot><tr><th scope="row" className="pt-3 text-left">Total due</th><td className="pt-3 text-right font-semibold tabular-nums">{currency(selected.assessed_total)}</td></tr></tfoot>
            </table>
            {mode ? <form onSubmit={submitDecision} className="space-y-3 border-t border-zinc-200 pt-3">
              {mode === 'reject' ? <label className="block text-sm">Rejection remarks<textarea required minLength={3} maxLength={1000} rows={3} value={remarks} onChange={event => setRemarks(event.target.value)} className="mt-1 block w-full rounded-md border border-zinc-300 p-2" /></label> :
                <p className="text-sm">Confirm the reference and amount against the municipality’s payment records before issuing the receipt.</p>}
              <div className="flex flex-wrap gap-2"><Button type="submit" isLoading={saving} disabled={saving || !!error || (mode === 'reject' && remarks.trim().length < 3)}>{mode === 'verify' ? 'Confirm Payment & Issue OR' : 'Reject proof'}</Button>
                <Button variant="secondary" disabled={saving} onClick={() => setMode(null)}>Cancel</Button></div>
            </form> : <div className="flex flex-wrap gap-2">
              <Button disabled={!selected.proof_url || !!error} className="bg-emerald-700 hover:bg-emerald-800" onClick={() => setMode('verify')}>Confirm Payment &amp; Issue OR</Button>
              <Button variant="secondary" className="text-red-700" disabled={!!error} onClick={() => setMode('reject')}>Reject Receipt with Remarks</Button>
            </div>}
          </section>
          <section className="min-w-0 space-y-3 rounded-lg border border-zinc-200 bg-white p-4" aria-label="Receipt viewer">
            <h2 className="text-sm font-semibold">Uploaded receipt</h2>
            {selected.proof_url ? <>
              <div className="flex flex-wrap items-center justify-between gap-2"><a href={selected.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm underline"><ExternalLink size={14} /> Open original</a>
                {/\.(jpg|jpeg|png)$/i.test(selected.proof_file_path) && <label className="flex items-center gap-2 text-xs">Zoom <input type="range" min="75" max="250" step="25" value={zoom} onChange={event => setZoom(Number(event.target.value))} /> {zoom}%</label>}</div>
              {/\.pdf$/i.test(selected.proof_file_path) ? <iframe title="Submitted payment receipt PDF" src={selected.proof_url} className="h-[65vh] w-full rounded border border-zinc-200" /> :
                <div className="max-h-[65vh] overflow-auto rounded border border-zinc-200 bg-zinc-50"><img src={selected.proof_url} alt="Submitted payment receipt" style={{ width: `${zoom}%`, maxWidth: 'none' }} /></div>}
            </> : <p className="text-sm text-amber-800">The stored receipt is unavailable. Refresh or return it with a correction request.</p>}
          </section>
        </div>}
    </div>
  </div>;
}
