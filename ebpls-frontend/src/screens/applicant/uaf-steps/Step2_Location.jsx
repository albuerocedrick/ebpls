// src/screens/applicant/uaf-steps/Step2_Location.jsx

import { useState, useEffect } from 'react';
import useApplicationStore from '../../../store/applicationStore';
import InteractiveLocationPin from '../../../components/shared/InteractiveLocationPin';
import { MapPin, Building2, Lock, Home, CheckCircle2, AlertTriangle } from 'lucide-react';
import { BARANGAYS_LILIW, API_ENDPOINTS } from '../../../utils/constants';
import apiClient from '../../../utils/apiClient';
import Select from '../../../components/ui/Select';
import { checkBarangayMatch } from '../../../utils/geoValidation';

const Step2_Location = () => {
  const data = useApplicationStore((state) => state.formData.step2);
  const isRenting = data.is_renting ?? false;
  const setFormField = useApplicationStore((state) => state.setFormField);
  const [barangayList, setBarangayList] = useState(BARANGAYS_LILIW);
  const [geoWarning, setGeoWarning] = useState(null);

  const runGeoCheck = (lat, lng, barangay) => {
    if (!lat || !lng || !barangay) {
      setGeoWarning(null);
      setFormField('step2', 'location_mismatch', false);
      return;
    }
    const { isMatch, detectedBarangay } = checkBarangayMatch(lat, lng, barangay);
    if (!isMatch) {
      setGeoWarning({ detectedBarangay });
      setFormField('step2', 'location_mismatch', true);
    } else {
      setGeoWarning(null);
      setFormField('step2', 'location_mismatch', false);
    }
  };

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
    runGeoCheck(coords.lat, coords.lng, data.barangay);
  };

  // When the barangay dropdown changes, update the form field
  const handleBarangayChange = (e) => {
    const selectedName = e.target.value;
    setFormField('step2', 'barangay', selectedName);
    runGeoCheck(data.latitude, data.longitude, selectedName);
  };

  const handleRentalToggle = (value) => {
    setFormField('step2', 'is_renting', value);
  };

  // Shared field tokens — mirrors components/ui/Input (rounded-md, hairline
  // border, focus by darkening the border rather than a wide ring).
  const inputClasses = "w-full rounded-md border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 transition-colors duration-200 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none motion-reduce:transition-none";
  const disabledInputClasses = "w-full cursor-not-allowed rounded-md border border-zinc-200 bg-zinc-100 px-3.5 py-2.5 text-sm text-zinc-500";
  const labelClasses = "mb-2 block font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase";

  return (
    <div className="flex flex-col gap-6 duration-300 animate-in fade-in slide-in-from-bottom-2">

      {/* Section 1: Physical Address */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
        <h3 className="mb-4 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
          <Building2 size={14} className="text-zinc-500" />
          Physical address
        </h3>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelClasses}>Bldg. no. / street / address line 1 <span className="text-zinc-900">*</span></label>
            <input 
              type="text" 
              name="address_line1" 
              value={data.address_line1} 
              onChange={handleChange} 
              placeholder="e.g., 123 Gat Tayaw Street" 
              className={inputClasses} 
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              <label className={labelClasses}>City / municipality</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={data.city} 
                  disabled 
                  className={disabledInputClasses} 
                />
                <Lock size={13} className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400" />
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
                <Lock size={13} className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Interactive Location Pin */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
        <h3 className="mb-4 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
          <MapPin size={14} className="text-zinc-500" />
          Geographical coordinates <span className="text-zinc-900">*</span>
        </h3>
        
        <InteractiveLocationPin 
          value={{ lat: data.latitude, lng: data.longitude }} 
          onChange={handleLocationChange}
        />
        
        {geoWarning && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <p>
              <strong>Warning:</strong> Your map pin appears to be outside{' '}
              <strong>{data.barangay}</strong>.
              {geoWarning.detectedBarangay && (
                <> The system detected it in <strong>{geoWarning.detectedBarangay}</strong>.</>
              )}
              {' '}Please verify your pin or selected barangay. You may still proceed.
            </p>
          </div>
        )}
      </div>

      {/* Section 3: Business Location Ownership (Rental Status) */}
      <div className="overflow-hidden rounded-lg border border-zinc-200">

        {/* Section Header */}
        <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600">
            <Home size={16} />
          </div>
          <div>
            <h3 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
              Business location ownership
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Indicate whether you own or rent the business premises.
            </p>
          </div>
        </div>

        {/* Two-option toggle */}
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">

          {/* Option A — I am renting */}
          <button
            type="button"
            onClick={() => handleRentalToggle(true)}
            aria-pressed={isRenting}
            className={`relative flex cursor-pointer flex-col gap-2 rounded-md border p-4 text-left transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none
              ${isRenting
                ? 'border-zinc-900 bg-zinc-50'
                : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
              }`}
          >
            {isRenting && (
              <CheckCircle2
                size={16}
                className="absolute top-3 right-3 text-zinc-900"
                aria-hidden="true"
              />
            )}
            <div className={`w-fit rounded-md border p-2 ${isRenting ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-500'}`}>
              <Home size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">
                I am renting this location
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                You lease or rent the business premises from a property owner or lessor.
              </p>
            </div>
          </button>

          {/* Option B — I own this property */}
          <button
            type="button"
            onClick={() => handleRentalToggle(false)}
            aria-pressed={!isRenting}
            className={`relative flex cursor-pointer flex-col gap-2 rounded-md border p-4 text-left transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none
              ${!isRenting
                ? 'border-zinc-900 bg-zinc-50'
                : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
              }`}
          >
            {!isRenting && (
              <CheckCircle2
                size={16}
                className="absolute top-3 right-3 text-zinc-900"
                aria-hidden="true"
              />
            )}
            <div className={`w-fit rounded-md border p-2 ${!isRenting ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-500'}`}>
              <Building2 size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">
                I own this property
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                You are the property owner of the business premises.
              </p>
            </div>
          </button>

        </div>
      </div>

    </div>
  );
};

export default Step2_Location;
