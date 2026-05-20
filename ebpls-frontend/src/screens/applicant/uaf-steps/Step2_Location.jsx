// src/screens/applicant/uaf-steps/Step2_Location.jsx

import React, { useState, useEffect } from 'react';
import useApplicationStore from '../../../store/applicationStore';
import InteractiveLocationPin from '../../../components/shared/InteractiveLocationPin';
import { MapPin, Building2, Lock } from 'lucide-react';
import { BARANGAYS_LILIW, API_ENDPOINTS } from '../../../utils/constants';
import apiClient from '../../../utils/apiClient';
import Select from '../../../components/ui/Select';

const Step2_Location = () => {
  const data = useApplicationStore((state) => state.formData.step2);
  const setFormField = useApplicationStore((state) => state.setFormField);
  const [barangayList, setBarangayList] = useState(BARANGAYS_LILIW);

  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.APPLICATIONS_BARANGAYS);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setBarangayList(res.data);
        }
      } catch (err) {
        console.warn('Failed to fetch dynamic barangay list, falling back to static constants.', err);
      }
    };
    fetchBarangays();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormField('step2', name, value);
  };

  const handleLocationChange = (coords) => {
    setFormField('step2', 'latitude', coords.lat);
    setFormField('step2', 'longitude', coords.lng);
  };

  // When the barangay dropdown changes, update the form field
  const handleBarangayChange = (e) => {
    const selectedName = e.target.value;
    setFormField('step2', 'barangay', selectedName);
  };

  const inputClasses = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100 focus:bg-white transition-all cursor-pointer";
  const disabledInputClasses = "w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-sm text-gray-400 cursor-not-allowed";
  const labelClasses = "block text-sm font-semibold text-gray-700 mb-2";

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Section 1: Physical Address */}
      <div className="p-5 border border-[hsl(var(--color-border,0,0%,90%))] rounded-lg bg-[hsl(var(--color-surface-raised,0,0%,98%))]">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-[hsl(var(--color-text,0,0%,10%))]">
          <Building2 size={18} className="text-accent" />
          Physical Address
        </h3>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelClasses}>Bldg. No. / Street / Address Line 1 <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              name="address_line1" 
              value={data.address_line1} 
              onChange={handleChange} 
              placeholder="e.g., 123 Gat Tayaw Street" 
              className={inputClasses} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Barangay Dropdown */}
            <div>
              <Select
                label="Barangay"
                required
                name="barangay"
                value={data.barangay || ''}
                onChange={handleBarangayChange}
              >
                <option value="" disabled>— Select Barangay —</option>
                {barangayList.map((barangay) => (
                  <option key={barangay} value={barangay}>{barangay}</option>
                ))}
              </Select>
            </div>
            
            {/* Locked Municipality Fields */}
            <div>
              <label className={labelClasses}>City / Municipality</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={data.city} 
                  disabled 
                  className={disabledInputClasses} 
                />
                <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--color-border,0,0%,80%))]" />
              </div>
            </div>
            
            <div>
              <label className={labelClasses}>Province</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={data.province} 
                  disabled 
                  className={disabledInputClasses} 
                />
                <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--color-border,0,0%,80%))]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Interactive Location Pin */}
      <div className="p-5 border border-[hsl(var(--color-border,0,0%,90%))] rounded-lg bg-[hsl(var(--color-surface-raised,0,0%,98%))]">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-[hsl(var(--color-text,0,0%,10%))]">
          <MapPin size={18} className="text-accent" />
          Geographical Coordinates
        </h3>
        
        <InteractiveLocationPin 
          value={{ lat: data.latitude, lng: data.longitude }} 
          onChange={handleLocationChange}
        />
        
      </div>

    </div>
  );
};

export default Step2_Location;
