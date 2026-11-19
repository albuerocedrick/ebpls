import { useEffect, useState } from 'react';
import { Check, ExternalLink, RefreshCw } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { REGULATORY_AGENCIES } from '../../utils/constants';
import useAuthStore from '../../store/authStore';
import Button from '../../components/ui/Button';

export default function RegulatoryQueue({ agency }) {
  const config = REGULATORY_AGENCIES[agency];
  const canDecide = useAuthStore(state => state.user?.roleName === config.role);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [queue, setQueue] = useState(null);
  const [selection, setSelection] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [returning, setReturning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const applicationNo = selection?.application_no;
  const query = `agency=${agency}`;

  useEffect(() => {
    let cancelled = false;
    apiClient.get(`/api/regulatory/queue?${query}&page=${page}`).then(result => {
      if (!cancelled) setQueue({ data: result.data, meta: result.meta, page, revision });
    }).catch(error => {
      if (!cancelled) setQueue({ error: error.message, page, revision });
    });
    return () => { cancelled = true; };
  }, [query, page, revision]);

  useEffect(() => {
    if (!applicationNo) return;
    let cancelled = false;
    apiClient.get(`/api/regulatory/${encodeURIComponent(applicationNo)}/documents?${query}`).then(result => {
      if (!cancelled) setDocuments({ applicationNo, data: result.data, revision });
    }).catch(error => {
      if (!cancelled) setDocuments({ applicationNo, error: error.message, revision });
    });
    return () => { cancelled = true; };
  }, [applicationNo, query, revision]);

  const activeQueue = queue?.page === page && queue.revision === revision ? queue : null;
  const pagination = activeQueue?.meta;
  const activeDocuments = documents?.applicationNo === applicationNo && documents?.revision === revision ? documents : null;
  const checklist = activeDocuments?.data || [];
  const files = checklist.flatMap(doc => doc.files.map(file => ({ ...file, name: doc.name })));
  const viewed = files[viewIndex];
  const hasAllDocuments = checklist.length > 0 && checklist.every(doc => doc.files.length > 0 && doc.files.every(file => file.url));

  function choose(application) {
    setSelection(application);
    setViewIndex(0);
    setReturning(false);
    setRemarks('');
    setFeedback(null);
  }

  async function decide(action) {
    setSaving(true);
    setFeedback(null);
    try {
      await apiClient.put(`/api/regulatory/${encodeURIComponent(applicationNo)}/${action}?${query}`, action === 'return' ? { remarks } : {});
      choose(null);
      setPage(1);
      setRevision(value => value + 1);
      setFeedback({ message: action === 'verify' ? 'Clearance verified and endorsed to BPLO.' : 'Application returned to the applicant for correction.' });
    } catch (error) { setFeedback({ message: error.message, error: true }); }
    finally { setSaving(false); }
  }

  return <div className="mx-auto max-w-7xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm text-zinc-600">{config.label}</p><h1 className="text-2xl font-semibold text-zinc-900">Inspection queue</h1></div>
      <Button variant="secondary" disabled={saving} leftIcon={<RefreshCw size={16} />} onClick={() => { setViewIndex(0); setRevision(value => value + 1); }}>Refresh</Button>
    </header>
    {feedback && <p role={feedback.error ? 'alert' : 'status'} className={feedback.error ? 'text-sm text-red-700' : 'text-sm text-emerald-800'}>{feedback.message}</p>}
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(15rem,1fr)_minmax(0,2.3fr)]">
      <section aria-label="Pending applications" className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        <h2 className="p-4 text-sm font-semibold">Pending applications{activeQueue?.meta ? ` (${activeQueue.meta.total})` : ''}</h2>
        {!activeQueue ? <p className="p-4 text-sm text-zinc-600">Loading queue…</p>
          : activeQueue.error ? <p role="alert" className="p-4 text-sm text-red-700">{activeQueue.error}</p>
          : activeQueue.data.length === 0 ? <p className="p-4 text-sm text-zinc-600">No applications pending review.</p>
          : activeQueue.data.map(row => <button key={row.application_no} type="button" aria-pressed={applicationNo === row.application_no} disabled={saving}
            onClick={() => choose(row)} className="block w-full p-4 text-left text-sm hover:bg-zinc-50 aria-pressed:bg-zinc-100">
            <span className="block font-semibold">{row.applications.businesses?.business_name || row.application_no}</span>
            <span className="block text-xs text-zinc-600">{row.application_no}</span>
            {row.applications.businesses?.bin && <span className="text-xs text-zinc-600">{row.applications.businesses.bin}</span>}
          </button>)}
        {pagination && pagination.total > pagination.limit && <div className="flex justify-between p-3">
          <Button variant="secondary" disabled={page === 1 || saving} onClick={() => setPage(page - 1)}>Previous</Button>
          <Button variant="secondary" disabled={page * pagination.limit >= pagination.total || saving} onClick={() => setPage(page + 1)}>Next</Button>
        </div>}
      </section>
      <section aria-label="Clearance review" className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
        {!selection ? <p className="text-sm text-zinc-600">Select an application to review its documents.</p> : <>
          <div><h2 className="text-lg font-semibold">{selection.applications.businesses?.business_name}</h2><p className="text-xs text-zinc-600">{applicationNo}</p></div>
          {!activeDocuments ? <p className="text-sm text-zinc-600">Loading documents…</p>
            : activeDocuments.error ? <p role="alert" className="text-sm text-red-700">{activeDocuments.error}</p> : <>
              {files.length > 0 && <label className="block text-sm font-medium">Document
                <select className="mt-1 block w-full rounded-md border border-zinc-300 p-2 text-sm" value={viewIndex} onChange={event => setViewIndex(Number(event.target.value))}>
                  {files.map((file, index) => <option key={index} value={index}>{file.name}{file.branch ? ` · ${file.branch.branch_name}` : ''}{` · File ${index + 1}`}</option>)}
                </select>
              </label>}
              {viewed?.branch && <p className="text-sm text-zinc-600">{viewed.branch.address_line1}, {viewed.branch.barangay}</p>}
              {viewed?.url && <div className="space-y-2">
                <a href={viewed.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm underline"><ExternalLink size={14} /> Open document in new tab</a>
                {viewed.is_image ? <img src={viewed.url} alt={viewed.name} className="max-h-[65vh] w-full rounded border border-zinc-200 object-contain" />
                  : <iframe title={viewed.name} src={viewed.url} className="h-[60vh] w-full rounded border border-zinc-200" />}
              </div>}
              {!hasAllDocuments && <p className="text-sm text-amber-800">Some assigned documents are missing or unavailable.</p>}
              {canDecide && (returning ? <form className="space-y-3" onSubmit={event => { event.preventDefault(); if (!saving && remarks.trim()) decide('return'); }}>
                <label className="block text-sm">Correction remarks<textarea required maxLength={1000} rows={3} disabled={saving} value={remarks} onChange={event => setRemarks(event.target.value)} className="mt-1 block w-full rounded-md border border-zinc-300 p-2" /></label>
                <div className="flex gap-2"><Button type="submit" disabled={saving || !remarks.trim()} isLoading={saving}>Return application</Button>
                  <Button variant="secondary" disabled={saving} onClick={() => setReturning(false)}>Cancel</Button></div>
              </form> : <div className="flex flex-wrap gap-2">
                <Button disabled={saving || !hasAllDocuments} isLoading={saving} leftIcon={<Check size={16} />} onClick={() => decide('verify')}>Verify &amp; endorse</Button>
                <Button variant="secondary" disabled={saving} onClick={() => setReturning(true)}>Return for correction</Button>
              </div>)}
            </>}
        </>}
      </section>
    </div>
  </div>;
}
