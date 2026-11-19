import { Plus, Trash2 } from 'lucide-react';
import useApplicationStore from '../../../store/applicationStore';
import { getFormBranches, MAX_BRANCHES, TENANCY_TYPES } from '../../../utils/uafForm';

const control = 'mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm';

export default function Step2_Location() {
  const form = useApplicationStore(state => state.formData);
  const update = useApplicationStore(state => state.setFormField);
  const barangays = useApplicationStore(state => state.barangays);
  const loading = useApplicationStore(state => state.barangaysLoading);
  const error = useApplicationStore(state => state.barangaysError);
  const branches = getFormBranches(form);

  function changeBranch(key, patch) {
    update('step2', 'branches', branches.map(branch => branch.branch_key === key ? { ...branch, ...patch } : branch));
  }

  function removeBranch(key) {
    update('step2', 'branches', branches.filter(branch => branch.branch_key !== key));
    update('step4', 'documents', form.step4.documents.filter(document => document.branch_key !== key));
  }

  function addBranch() {
    update('step2', 'branches', [...branches, {
      branch_key: crypto.randomUUID(), branch_name: '', address_line1: '', barangay: '',
      tenancy_type: 'Owned Commercial', lineOfBusinesses: [], stall_unit_numbers: [],
    }]);
  }

  return <div className="space-y-4">
    <p className="text-sm text-zinc-600">Enter each business location in Liliw, Laguna. You’ll assign activities to each location in the next step.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {branches.map((branch, index) => {
      const { branch_key } = branch;
      const location = barangays.find(barangay => barangay.name === branch.barangay);
      return <fieldset key={branch_key} className="space-y-4 rounded-lg border border-zinc-200 p-4">
        <legend className="px-2 text-sm font-semibold">{index ? `Branch ${index + 1}` : 'Main branch'}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Branch name
            <input className={control} maxLength={100} value={branch.branch_name} onChange={e => changeBranch(branch_key, { branch_name: e.target.value })} />
          </label>
          <label className="text-sm">Building no. / street
            <input className={control} maxLength={255} value={branch.address_line1 || ''} onChange={e => changeBranch(branch_key, { address_line1: e.target.value })} />
          </label>
          <label className="text-sm">Barangay
            <select className={control} disabled={loading} value={branch.barangay || ''} onChange={e => changeBranch(branch_key, { barangay: e.target.value })}>
              <option value="">{loading ? 'Loading barangays…' : 'Select barangay'}</option>
              {branch.barangay && !location && <option value={branch.barangay} disabled>{branch.barangay} (unavailable)</option>}
              {barangays.map(b => <option key={b.id} value={b.name} disabled={!b.zone?.is_active}>{b.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Property tenancy
            <select className={control} value={branch.tenancy_type} onChange={e => changeBranch(branch_key, { tenancy_type: e.target.value })}>
              {TENANCY_TYPES.map(tenancy => <option key={tenancy}>{tenancy}</option>)}
            </select>
          </label>
        </div>
        {location && <p className="text-sm text-zinc-600">{location.zone?.name || 'No zone assigned'} · Barangay reference coordinates {location.latitude}, {location.longitude}</p>}
        {index > 0 && <button type="button" className="inline-flex items-center gap-2 text-sm text-red-700" onClick={() => removeBranch(branch_key)}>
          <Trash2 size={15} /> Remove branch
        </button>}
      </fieldset>;
    })}
    <button type="button" disabled={branches.length >= MAX_BRANCHES} className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50" onClick={addBranch}>
      <Plus size={16} /> Add another branch / location
    </button>
  </div>;
}
