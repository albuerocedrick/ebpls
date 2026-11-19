import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import apiClient from '../../../utils/apiClient';
import { API_ENDPOINTS } from '../../../utils/constants';
import useApplicationStore from '../../../store/applicationStore';
import { getFormBranches } from '../../../utils/uafForm';

const control = 'mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm';
const emptyActivity = () => ({ name: '', capital_investment: '', gross_sales_prev_year: '', units: 1, metric_count: '' });

export default function Step3_Activities() {
  const form = useApplicationStore(state => state.formData);
  const update = useApplicationStore(state => state.setFormField);
  const barangays = useApplicationStore(state => state.barangays);
  const metrics = useApplicationStore(state => state.activityMetrics);
  const setMetrics = useApplicationStore(state => state.setActivityMetrics);
  const [catalog, setCatalog] = useState([]);
  const [error, setError] = useState('');
  const branches = getFormBranches(form);

  useEffect(() => {
    let cancelled = false;
    apiClient.get(API_ENDPOINTS.APPLICATIONS_LOOKUPS).then(response => {
      if (!cancelled) {
        setCatalog((response.data?.business_activities || []).filter(name => name.trim().toLowerCase() !== 'other services'));
        setMetrics(response.data?.business_activity_metrics || {});
      }
    }).catch(() => {
      if (!cancelled) setError('Unable to load the business activity catalog. Reload the form to try again.');
    });
    return () => { cancelled = true; };
  }, [setMetrics]);

  function changeBranch(key, patch) {
    update('step2', 'branches', branches.map(branch => branch.branch_key === key ? { ...branch, ...patch } : branch));
  }

  return <div className="space-y-4">
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {branches.map(branch => {
      const { branch_key, branch_name } = branch;
      const activities = branch.lineOfBusinesses?.length ? branch.lineOfBusinesses : [emptyActivity()];
      const stalls = branch.stall_unit_numbers || [];
      const zone = barangays.find(b => b.name === branch.barangay)?.zone;
      return <fieldset key={branch_key} className="space-y-4 rounded-lg border border-zinc-200 p-4">
        <legend className="px-2 text-sm font-semibold">{branch_name || 'Branch'}</legend>
        {zone && <p className="text-sm text-zinc-600">{branch.barangay} · {zone.name} · Recommended minimum capital ₱{Number(zone.min_capital_floor).toLocaleString('en-PH')}</p>}
        {activities.map((activity, index) => {
          const change = patch => changeBranch(branch_key, { lineOfBusinesses: activities.map((item, i) => i === index ? { ...item, ...patch } : item) });
          const metric = metrics[activity.name];
          return <div key={index} className="grid gap-3 rounded-md bg-zinc-50 p-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">Business activity {index + 1}
              <select className={control} value={activity.name} disabled={!catalog.length} onChange={e => change({ name: e.target.value, metric_count: '' })}>
                <option value="">Select a business activity</option>
                {activity.name && !catalog.includes(activity.name) && <option value={activity.name} disabled>{activity.name} (select a replacement)</option>}
                {catalog.map(name => <option key={name}>{name}</option>)}
              </select>
            </label>
            <label className="text-sm">Capital investment (₱)
              <input type="number" min="0.01" step="0.01" className={control} value={activity.capital_investment ?? ''} onChange={e => change({ capital_investment: e.target.value })} />
            </label>
            <label className="text-sm">Previous year gross sales (₱)
              <input type="number" min="0" step="0.01" className={control} value={activity.gross_sales_prev_year ?? ''} onChange={e => change({ gross_sales_prev_year: e.target.value })} />
            </label>
            <label className="text-sm">Units
              <input type="number" min="1" step="1" className={control} value={activity.units ?? 1} onChange={e => change({ units: e.target.value })} />
            </label>
            {metric && <label className="text-sm">{metric.metric}
              <input type="number" step="1" min={metric.min} className={control} value={activity.metric_count ?? ''} onChange={e => change({ metric_count: e.target.value })} />
            </label>}
            {activities.length > 1 && <button type="button" className="inline-flex items-center gap-1 text-sm text-red-700" onClick={() => changeBranch(branch_key, { lineOfBusinesses: activities.filter((_, i) => i !== index) })}>
              <Trash2 size={14} /> Remove activity {index + 1}
            </button>}
          </div>;
        })}
        <button type="button" disabled={activities.length >= 50} className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50" onClick={() => changeBranch(branch_key, { lineOfBusinesses: [...activities, emptyActivity()] })}>
          <Plus size={15} /> Add line of business
        </button>
        <div className="space-y-2 border-t border-zinc-200 pt-3">
          <p className="text-sm font-medium">Covered units / stalls</p>
          {stalls.map((stall, index) => <div key={index} className="flex items-center gap-2">
            <input aria-label={`Unit / stall number ${index + 1}`} className={control} maxLength={64} value={stall} onChange={e => changeBranch(branch_key, { stall_unit_numbers: stalls.map((value, i) => i === index ? e.target.value : value) })} />
            <button type="button" aria-label={`Remove unit / stall ${index + 1}`} className="p-2" onClick={() => changeBranch(branch_key, { stall_unit_numbers: stalls.filter((_, i) => i !== index) })}><Trash2 size={15} /></button>
          </div>)}
          <button type="button" disabled={stalls.length >= 50} className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50" onClick={() => changeBranch(branch_key, { stall_unit_numbers: [...stalls, ''] })}>
            <Plus size={15} /> Add unit / stall number
          </button>
        </div>
      </fieldset>;
    })}
  </div>;
}
