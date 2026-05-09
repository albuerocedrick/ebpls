// src/screens/applicant/uaf-steps/Step1_BasicInfo.jsx

import React from 'react';
import useApplicationStore from '../../../store/applicationStore';
import { Building, Tag, Info } from 'lucide-react';

// Lookup data seeded from DB (seed.sql)
const APP_TYPES = [
  { id: 1, name: 'New' },
  { id: 2, name: 'Renewal' },
  { id: 3, name: 'Additional Line of Business' }
];

const PAYMENT_MODES = [
  { id: 1, name: 'Annually' },
  { id: 2, name: 'Bi-Annually' },
  { id: 3, name: 'Quarterly' }
];

const ORG_TYPES = [
  { id: 1, name: 'Sole Proprietorship' },
  { id: 2, name: 'Partnership' },
  { id: 3, name: 'Corporation' },
  { id: 4, name: 'Cooperative' },
  { id: 5, name: 'Non-Governmental Organization' },
  { id: 6, name: 'Government-Owned or Controlled Corporation' }
];

const Step1_BasicInfo = () => {
  const data = useApplicationStore((state) => state.formData.step1);
  const setFormField = useApplicationStore((state) => state.setFormField);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    // Convert numeric IDs to actual numbers instead of strings for DB compatibility
    const numericFields = ['type_id', 'payment_mode_id', 'org_type_id'];
    const finalVal = numericFields.includes(name) && val !== '' ? Number(val) : val;

    setFormField('step1', name, finalVal);

    // Auto-clear franchisor name if is_franchise is unchecked
    if (name === 'is_franchise' && !checked) {
      setFormField('step1', 'franchisor_name', '');
    }
  };

  const inputClasses = "w-full px-3 py-2 bg-[hsl(var(--color-surface,0,0%,100%))] border border-[hsl(var(--color-border,0,0%,80%))] rounded-md text-sm text-[hsl(var(--color-text,0,0%,10%))] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors";
  const labelClasses = "block text-xs font-semibold text-[hsl(var(--color-text,0,0%,10%))] mb-1.5";

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Section 1: Application Type */}
      <div className="p-5 border border-[hsl(var(--color-border,0,0%,90%))] rounded-lg bg-[hsl(var(--color-surface-raised,0,0%,98%))]">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-[hsl(var(--color-text,0,0%,10%))]">
          <Tag size={18} className="text-accent" />
          Application Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Application Type <span className="text-red-500">*</span></label>
            <select name="type_id" value={data.type_id || ''} onChange={handleChange} className={inputClasses}>
              <option value="" disabled>Select application type</option>
              {APP_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClasses}>Payment Mode <span className="text-red-500">*</span></label>
            <select name="payment_mode_id" value={data.payment_mode_id || ''} onChange={handleChange} className={inputClasses}>
              <option value="" disabled>Select payment mode</option>
              {PAYMENT_MODES.map(mode => (
                <option key={mode.id} value={mode.id}>{mode.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Business Information */}
      <div className="p-5 border border-[hsl(var(--color-border,0,0%,90%))] rounded-lg bg-[hsl(var(--color-surface-raised,0,0%,98%))]">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-[hsl(var(--color-text,0,0%,10%))]">
          <Building size={18} className="text-accent" />
          Business Identity
        </h3>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Business Name (Exact legal name) <span className="text-red-500">*</span></label>
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
              <label className={labelClasses}>Trade Name / Franchise (DBA)</label>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Organization Type <span className="text-red-500">*</span></label>
              <select name="org_type_id" value={data.org_type_id || ''} onChange={handleChange} className={inputClasses}>
                <option value="" disabled>Select organization type</option>
                {ORG_TYPES.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClasses}>DTI / SEC / CDA Registration No.</label>
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
          <div className="mt-2 pt-4 border-t border-[hsl(var(--color-border,0,0%,90%))]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                name="is_franchise" 
                checked={data.is_franchise} 
                onChange={handleChange} 
                className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent" 
              />
              <span className="text-sm font-semibold text-[hsl(var(--color-text,0,0%,10%))]">This business is operated under a franchise agreement.</span>
            </label>

            {data.is_franchise && (
              <div className="mt-3 pl-7 animate-in fade-in slide-in-from-top-1">
                <label className={labelClasses}>Franchisor Name <span className="text-red-500">*</span></label>
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