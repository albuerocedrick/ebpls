// src/screens/applicant/uaf-steps/Step1_BasicInfo.jsx

import { useEffect, useState } from 'react';
import useApplicationStore from '../../../store/applicationStore';
import { Building, Tag } from 'lucide-react';
import apiClient from '../../../utils/apiClient';
import { API_ENDPOINTS } from '../../../utils/constants';
import Select from '../../../components/ui/Select';

// Lookup data seeded from DB (seed.sql)
const APP_TYPES = [
  { id: 1, name: 'New' },
  { id: 2, name: 'Renewal' },
  { id: 3, name: 'Additional Line of Business' }
];

// payment_mode_id removed — payment is always annual (migration 033)

const FALLBACK_ORG_TYPES = [
  { id: 1, name: 'Sole Proprietorship' },
  { id: 2, name: 'Partnership' },
  { id: 3, name: 'Corporation' },
  { id: 4, name: 'Cooperative' }
];

const Step1_BasicInfo = () => {
  const data = useApplicationStore((state) => state.formData.step1);
  const setFormField = useApplicationStore((state) => state.setFormField);
  const [orgTypes, setOrgTypes] = useState(FALLBACK_ORG_TYPES);

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.APPLICATIONS_LOOKUPS);
        if (res.success && res.data?.organization_types?.length > 0) {
          setOrgTypes(res.data.organization_types);
        }
      } catch {
        console.warn('Failed to fetch dynamic lookups, using fallback.');
      }
    };
    fetchLookups();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    // Convert numeric IDs to actual numbers instead of strings for DB compatibility
    const numericFields = ['type_id', 'org_type_id'];
    const finalVal = numericFields.includes(name) && val !== '' ? Number(val) : val;

    setFormField('step1', name, finalVal);

    // Auto-clear franchisor name if is_franchise is unchecked
    if (name === 'is_franchise' && !checked) {
      setFormField('step1', 'franchisor_name', '');
    }
  };

  // Shared field tokens — mirrors components/ui/Input so hand-rolled inputs in
  // this wizard match the primitive: rounded-md, hairline border, focus by
  // darkening the border to zinc-900 rather than a wide ring.
  const inputClasses = "w-full rounded-md border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 transition-colors duration-200 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none motion-reduce:transition-none";
  const labelClasses = "mb-2 block font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase";

  return (
    <div className="flex flex-col gap-6 duration-300 animate-in fade-in slide-in-from-bottom-2">

      {/* Section 1: Application Type */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
        <h3 className="mb-4 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
          <Tag size={14} className="text-zinc-500" />
          Application details
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Select
              label="Application Type"
              required
              name="type_id"
              value={data.type_id || ''}
              onChange={handleChange}
            >
              <option value="" disabled>Select application type</option>
              {APP_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Section 2: Business Information */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
        <h3 className="mb-4 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
          <Building size={14} className="text-zinc-500" />
          Business identity
        </h3>

        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClasses}>Business name (exact legal name) <span className="text-zinc-900">*</span></label>
              <input 
                type="text" 
                name="business_name" 
                value={data.business_name} 
                onChange={handleChange} 
                placeholder="e.g., Juan Dela Cruz Enterprises" 
                className={inputClasses} 
              />
            </div>
            <div>
              <label className={labelClasses}>Trade name / franchise (DBA)</label>
              <input 
                type="text" 
                name="trade_name" 
                value={data.trade_name} 
                onChange={handleChange} 
                placeholder="Leave blank if same as business name" 
                className={inputClasses} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Select
                label="Organization Type"
                required
                name="org_type_id"
                value={data.org_type_id || ''}
                onChange={handleChange}
              >
                <option value="" disabled>Select organization type</option>
                {orgTypes.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className={labelClasses}>DTI / SEC / CDA registration no.</label>
              <input 
                type="text" 
                name="dti_sec_cda_reg_no" 
                value={data.dti_sec_cda_reg_no} 
                onChange={handleChange} 
                placeholder="Registration Number" 
                className={inputClasses} 
              />
            </div>
          </div>

          {/* Franchise Toggle Area */}
          <div className="mt-2 border-t border-zinc-200 pt-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="is_franchise"
                checked={data.is_franchise}
                onChange={handleChange}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 accent-zinc-900 focus:ring-2 focus:ring-zinc-900"
              />
              <span className="text-sm text-zinc-700">This business is operated under a franchise agreement.</span>
            </label>

            {data.is_franchise && (
              <div className="mt-3 pl-7 animate-in fade-in slide-in-from-top-1">
                <label className={labelClasses}>Franchisor name <span className="text-zinc-900">*</span></label>
                <input 
                  type="text" 
                  name="franchisor_name" 
                  value={data.franchisor_name} 
                  onChange={handleChange} 
                  placeholder="Enter name of the franchisor (e.g., Jollibee Foods Corp.)" 
                  className={inputClasses} 
                />
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Step1_BasicInfo;
