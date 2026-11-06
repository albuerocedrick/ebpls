import useApplicationStore from '../../../store/applicationStore';
import { Building2, MapPin, Home, CheckCircle2 } from 'lucide-react';
import Select from '../../../components/ui/Select';
import { TENANCY_TYPES } from '../../../utils/uafForm';

const TENANCY_HELP = {
  Rented: 'Upload a Contract of Lease for the premises.',
  'Owned Commercial': 'Upload the Building Permit for your commercial premises.',
  'Owned Residential': 'Upload Zoning Clearance for business use of your residential property.',
};

export default function Step2_Location() {
  const data = useApplicationStore(s => s.formData.step2);
  const barangays = useApplicationStore(s => s.barangays);
  const loading = useApplicationStore(s => s.barangaysLoading);
  const error = useApplicationStore(s => s.barangaysError);
  const setFormField = useApplicationStore(s => s.setFormField);
  const setLocation = useApplicationStore(s => s.setLocation);
  const selected = barangays.find(b => b.name === data.barangay);
  const label = 'mb-2 block font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase';
  const input = 'w-full rounded-md border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none';
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-800"><Building2 size={16} />Business address</h3>
        <label htmlFor="business-address" className={label}>Building no. / street / address line 1 *</label>
        <input id="business-address" className={input} value={data.address_line1} onChange={e => setFormField('step2', 'address_line1', e.target.value)} placeholder="e.g., 123 Gat Tayaw Street" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Select label="Barangay" required value={data.barangay} disabled={loading || !!error} onChange={e => {
            const barangay = barangays.find(b => b.name === e.target.value);
            if (barangay) setLocation(barangay);
          }}>
            <option value="" disabled>{loading ? 'Loading barangays…' : 'Select barangay'}</option>
            {barangays.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </Select>
          <div><label htmlFor="business-city" className={label}>City / municipality</label><input id="business-city" value="Liliw" readOnly className={`${input} bg-zinc-100 text-zinc-500`} /></div>
          <div><label htmlFor="business-province" className={label}>Province</label><input id="business-province" value="Laguna" readOnly className={`${input} bg-zinc-100 text-zinc-500`} /></div>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </section>
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-800"><MapPin size={16} />Barangay reference location</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">Your location is assigned automatically from the selected barangay. No map pin is needed.</p>
        {selected ? <p className="mt-3 flex items-center gap-2 text-sm text-zinc-800"><CheckCircle2 size={16} />{selected.name} reference location assigned.</p>
          : <p className="mt-3 text-sm text-zinc-500">Select a barangay to assign its reference location.</p>}
      </section>
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-800"><Home size={16} />Property tenancy</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {TENANCY_TYPES.map(type => <button key={type} type="button" aria-pressed={data.tenancy_type === type} onClick={() => {
            setFormField('step2', 'tenancy_type', type);
            setFormField('step2', 'is_renting', type === 'Rented');
          }} className={`rounded-md border p-4 text-left focus-visible:ring-2 focus-visible:ring-zinc-900 ${data.tenancy_type === type ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 bg-white'}`}>
            <span className="text-sm font-semibold text-zinc-900">{type}</span>
            <span className="mt-2 block text-xs leading-relaxed text-zinc-600">{TENANCY_HELP[type]}</span>
          </button>)}
        </div>
      </section>
    </div>
  );
}
