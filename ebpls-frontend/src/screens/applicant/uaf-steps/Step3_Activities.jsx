// src/screens/applicant/uaf-steps/Step3_Activities.jsx

import React, { useEffect, useState } from 'react';
import useApplicationStore from '../../../store/applicationStore';
import { Store, Plus, Trash2, Info, PhilippinePeso } from 'lucide-react';
import apiClient from '../../../utils/apiClient';
import { API_ENDPOINTS } from '../../../utils/constants';

// Fallback constant
const FALLBACK_ACTIVITIES = [
  'General Merchandise / Retail Trade',
  'Food and Beverage Service (Restaurant / Eatery / Carinderia)',
  'Food Manufacturing and Processing',
  'Wholesale Trade',
  'Personal Services (Salon, Spa, Laundry, etc.)'
];

const Step3_Activities = () => {
  const data = useApplicationStore((state) => state.formData.step3);
  const setFormField = useApplicationStore((state) => state.setFormField);

  const [businessActivities, setBusinessActivities] = useState(FALLBACK_ACTIVITIES);

  // Ensure there is at least one empty LOB entry on mount
  useEffect(() => {
    if (!data.lineOfBusinesses || data.lineOfBusinesses.length === 0) {
      setFormField('step3', 'lineOfBusinesses', [{ name: '', capital_investment: '', units: 1 }]);
    }
    
    // Fetch dynamic lookups
    const fetchLookups = async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.APPLICATIONS_LOOKUPS);
        if (res.success && res.data?.business_activities?.length > 0) {
          setBusinessActivities(res.data.business_activities);
        }
      } catch (err) {
        console.warn('Failed to fetch dynamic lookups, using fallback.');
      }
    };
    fetchLookups();
  }, [data.lineOfBusinesses, setFormField]);

  const lobs = data.lineOfBusinesses || [];

  const handleAddLOB = () => {
    setFormField('step3', 'lineOfBusinesses', [
      ...lobs, 
      { name: '', capital_investment: '', units: 1 }
    ]);
  };

  const handleRemoveLOB = (indexToRemove) => {
    const updatedLOBs = lobs.filter((_, index) => index !== indexToRemove);
    setFormField('step3', 'lineOfBusinesses', updatedLOBs);
  };

  const handleChange = (index, field, value) => {
    const updatedLOBs = [...lobs];
    updatedLOBs[index] = { ...updatedLOBs[index], [field]: value };
    setFormField('step3', 'lineOfBusinesses', updatedLOBs);
  };

  const inputClasses = "w-full px-3 py-2 bg-[hsl(var(--color-surface,0,0%,100%))] border border-[hsl(var(--color-border,0,0%,80%))] rounded-md text-sm text-[hsl(var(--color-text,0,0%,10%))] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors";
  const labelClasses = "block text-xs font-semibold text-[hsl(var(--color-text,0,0%,10%))] mb-1.5";

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Information Banner */}
      <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg flex items-start gap-3">
        <Info size={20} className="text-accent shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-[hsl(var(--color-text,0,0%,10%))]">Declare all Business Activities</h4>
          <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,40%))] mt-1">
            A single establishment may have multiple lines of business (e.g., a Retail Store that also operates a small Eatery). 
            Please add all applicable activities. Your Mayor's Permit Fee will be assessed based on these declarations.
          </p>
        </div>
      </div>

      {/* Dynamic LOB List */}
      <div className="flex flex-col gap-4">
        {lobs.map((lob, index) => (
          <div 
            key={index} 
            className="p-5 border border-[hsl(var(--color-border,0,0%,90%))] rounded-lg bg-[hsl(var(--color-surface-raised,0,0%,98%))] relative"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* LOB Type */}
                <div className="md:col-span-6">
                  <label className={labelClasses}>Line of Business <span className="text-red-500">*</span></label>
                  <select 
                    value={lob.name} 
                    onChange={(e) => handleChange(index, 'name', e.target.value)} 
                    className={inputClasses}
                  >
                    <option value="" disabled>Select business activity</option>
                    {businessActivities.map((activity, i) => (
                      <option key={i} value={activity}>{activity}</option>
                    ))}
                  </select>
                </div>

                {/* Capital Investment / Gross Sales */}
                <div className="md:col-span-4">
                  <label className={labelClasses}>Capital Investment (₱) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--color-border,0,0%,80%))]">
                      <PhilippinePeso size={14} />
                    </div>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={lob.capital_investment} 
                      onChange={(e) => handleChange(index, 'capital_investment', e.target.value)} 
                      placeholder="0.00" 
                      className={`${inputClasses} pl-8`} 
                    />
                  </div>
                </div>

                {/* Number of Units */}
                <div className="md:col-span-2">
                  <label className={labelClasses}>Units</label>
                  <input 
                    type="number" 
                    min="1"
                    value={lob.units} 
                    onChange={(e) => handleChange(index, 'units', e.target.value)} 
                    className={inputClasses} 
                  />
                </div>
              </div>

              {/* Remove Button (Hide if only 1 item exists) */}
              {lobs.length > 1 && (
                <button 
                  type="button"
                  onClick={() => handleRemoveLOB(index)}
                  className="mt-6 p-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors self-end md:self-auto shrink-0 border border-transparent hover:border-red-200"
                  title="Remove Line of Business"
                >
                  <Trash2 size={18} />
                </button>
              )}
              
            </div>
          </div>
        ))}
      </div>

      {/* Add LOB Action */}
      <button 
        type="button"
        onClick={handleAddLOB}
        className="self-start flex items-center gap-2 px-4 py-2 text-sm font-semibold text-accent border border-accent rounded-lg hover:bg-accent hover:text-white transition-colors"
      >
        <Plus size={16} />
        Add Another Line of Business
      </button>

    </div>
  );
};

export default Step3_Activities;