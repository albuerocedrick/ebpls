import useApplicationStore from '../../../store/applicationStore';
import { documentFiles, getFormBranches, requirementKey } from '../../../utils/uafForm';

const applicationTypes = { 1: 'New', 2: 'Renewal', 3: 'Additional Line of Business' };
const currency = value => Number(value || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

export default function Step5_Review({ requirements, loading }) {
  const form = useApplicationStore(state => state.formData);
  const update = useApplicationStore(state => state.setFormField);
  const branches = getFormBranches(form);
  return <div className="space-y-4">
    <section className="rounded-lg border border-zinc-200 p-4">
      <h3 className="text-sm font-semibold">Business identity</h3>
      <p className="mt-1 text-sm">{form.step1.business_name} · {applicationTypes[form.step1.type_id]}</p>
    </section>
    {branches.map(branch => <section key={branch.branch_key} className="space-y-2 rounded-lg border border-zinc-200 p-4">
      <h3 className="text-sm font-semibold">{branch.branch_name}</h3>
      <p className="text-sm">{branch.address_line1}, {branch.barangay}, Liliw, Laguna</p>
      <p className="text-sm text-zinc-600">{branch.tenancy_type}</p>
      {!!branch.stall_unit_numbers?.length && <p className="text-sm text-zinc-600">Covered units / stalls {branch.stall_unit_numbers.join(', ')}</p>}
      <ul className="space-y-1 text-sm">
        {(branch.lineOfBusinesses || []).map(activity => <li key={activity.name}>
          {activity.name} · Capital {currency(activity.capital_investment)} · Previous year gross sales {currency(activity.gross_sales_prev_year)}
        </li>)}
      </ul>
    </section>)}
    <section className="space-y-2 rounded-lg border border-zinc-200 p-4">
      <h3 className="text-sm font-semibold">Uploaded documents</h3>
      {loading ? <p className="text-sm">Loading requirements…</p> : <ul className="space-y-1 text-sm">
        {requirements.map(requirement => {
          const branch = branches.find(item => item.branch_key === requirement.branch_key);
          const files = documentFiles(form.step4.documents, requirement);
          return <li key={requirementKey(requirement)}>
            {requirement.name}{branch ? ` · ${branch.branch_name}` : ''} <span className="text-zinc-600">· {files.length ? files.map(file => file.file_name || 'Uploaded').join(', ') : 'Missing'}</span>
          </li>;
        })}
      </ul>}
    </section>
    <label className="flex items-start gap-3 rounded-lg border border-zinc-200 p-4 text-sm">
      <input type="checkbox" className="mt-1" checked={form.step5.attestation_agreed} onChange={e => update('step5', 'attestation_agreed', e.target.checked)} />
      <span><strong className="block">Applicant attestation</strong>
        I declare under penalty of perjury that all information provided in this application is true, correct, and complete to the best of my knowledge. I authorize the Municipality of Liliw to verify these details, and understand that any misrepresentation may cause the revocation of my permit.
      </span>
    </label>
  </div>;
}
