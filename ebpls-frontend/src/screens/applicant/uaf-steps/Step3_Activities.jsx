// src/screens/applicant/uaf-steps/Step3_Activities.jsx

import React, { useEffect, useState } from 'react';
import useApplicationStore from '../../../store/applicationStore';
import { Store, Plus, Trash2, Info, PhilippinePeso } from 'lucide-react';
import apiClient from '../../../utils/apiClient';
import { API_ENDPOINTS } from '../../../utils/constants';
import Select from '../../../components/ui/Select';

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
  const activityMetrics = useApplicationStore((state) => state.activityMetrics);
  const setActivityMetrics = useApplicationStore((state) => state.setActivityMetrics);

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
          setActivityMetrics(res.data.business_activity_metrics || {});
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
      { name: '', capital_investment: '', units: 1, metric_count: '' }
    ]);
  };

  const handleRemoveLOB = (indexToRemove) => {
    const updatedLOBs = lobs.filter((_, index) => index !== indexToRemove);
    setFormField('step3', 'lineOfBusinesses', updatedLOBs);
  };

  const handleChange = (index, field, value) => {
    const updatedLOBs = [...lobs];
    updatedLOBs[index] = { ...updatedLOBs[index], [field]: value };
    
    if (field === 'name' && !activityMetrics[value]) {
      updatedLOBs[index].metric_count = '';
    }

    setFormField('step3', 'lineOfBusinesses', updatedLOBs);
  };

  const inputClasses = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100 focus:bg-white transition-all cursor-pointer";
  const labelClasses = "block text-sm font-semibold text-gray-700 mb-2";

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
                  <Select
                    label="Line of Business"
                    required
                    value={lob.name}
                    onChange={(e) => handleChange(index, 'name', e.target.value)}
                  >
                    <option value="" disabled>Select business activity</option>
                    {businessActivities.map((activity, i) => (
                      <option key={i} value={activity}>{activity}</option>
                    ))}
                  </Select>
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

                {/* Conditional Metric Count */}
                {activityMetrics[lob.name] && (
                  <div className="md:col-span-12 md:w-1/3 mt-2">
                    <label htmlFor={`lob-metric-${index}`} className={labelClasses}>
                      {activityMetrics[lob.name].metric} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={`lob-metric-${index}`}
                      type="number"
                      min={activityMetrics[lob.name].min}
                      value={lob.metric_count || ''}
                      onChange={(e) => handleChange(index, 'metric_count', e.target.value)}
                      placeholder="0"
                      className={inputClasses}
                    />
                  </div>
                )}
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
