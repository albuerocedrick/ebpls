// src/screens/applicant/uaf-steps/Step3_Activities.jsx

import { useEffect, useState } from 'react';
import useApplicationStore from '../../../store/applicationStore';
import { Plus, Trash2, Info, PhilippinePeso } from 'lucide-react';
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
      } catch {
        console.warn('Failed to fetch dynamic lookups, using fallback.');
      }
    };
    fetchLookups();
  }, [data.lineOfBusinesses, setFormField, setActivityMetrics]);

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

  // Shared field tokens — mirrors components/ui/Input (rounded-md, hairline
  // border, focus by darkening the border rather than a wide ring).
  const inputClasses = "w-full rounded-md border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 transition-colors duration-200 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none motion-reduce:transition-none";
  const labelClasses = "mb-2 block font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase";

  return (
    <div className="flex flex-col gap-6 duration-300 animate-in fade-in slide-in-from-bottom-2">

      {/* Information Banner */}
      <div className="flex items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <Info size={17} className="mt-0.5 shrink-0 text-zinc-500" />
        <div>
          <h4 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
            Declare all business activities
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
            A single establishment may have multiple lines of business (e.g., a retail store that also
            operates a small eatery). Add all applicable activities — your Mayor&apos;s Permit Fee is
            assessed from these declarations.
          </p>
        </div>
      </div>

      {/* Dynamic LOB List */}
      <div className="flex flex-col gap-4">
        {lobs.map((lob, index) => (
          <div 
            key={index} 
            className="relative rounded-lg border border-zinc-200 bg-zinc-50 p-5"
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">

              <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-12">
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
                  <label className={labelClasses}>Capital investment (₱) <span className="text-zinc-900">*</span></label>
                  <div className="relative">
                    <div className="absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400">
                      <PhilippinePeso size={14} />
                    </div>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={lob.capital_investment} 
                      onChange={(e) => handleChange(index, 'capital_investment', e.target.value)} 
                      placeholder="0.00" 
                      className={`${inputClasses} pl-8 tabular-nums`} 
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
                    className={`${inputClasses} tabular-nums`} 
                  />
                </div>

                {/* Conditional Metric Count */}
                {activityMetrics[lob.name] && (
                  <div className="mt-2 md:col-span-12 md:w-1/3">
                    <label htmlFor={`lob-metric-${index}`} className={labelClasses}>
                      {activityMetrics[lob.name].metric} <span className="text-zinc-900">*</span>
                    </label>
                    <input
                      id={`lob-metric-${index}`}
                      type="number"
                      min={activityMetrics[lob.name].min}
                      value={lob.metric_count || ''}
                      onChange={(e) => handleChange(index, 'metric_count', e.target.value)}
                      placeholder="0"
                      className={`${inputClasses} tabular-nums`}
                    />
                  </div>
                )}
              </div>

              {/* Remove Button (Hide if only 1 item exists) */}
              {lobs.length > 1 && (
                <button 
                  type="button"
                  onClick={() => handleRemoveLOB(index)}
                  className="mt-6 shrink-0 self-end rounded-md border border-zinc-200 bg-white p-2 text-zinc-500 transition-colors duration-200 hover:border-zinc-300 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none md:self-auto"
                  title="Remove line of business"
                  aria-label="Remove line of business"
                >
                  <Trash2 size={16} />
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
        className="flex items-center gap-2 self-start rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors duration-200 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
      >
        <Plus size={15} />
        Add another line of business
      </button>

    </div>
  );
};

export default Step3_Activities;
