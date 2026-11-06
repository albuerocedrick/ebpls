import { useEffect } from 'react';
import useApplicationStore from '../store/applicationStore';
import apiClient from '../utils/apiClient';

export default function useBarangayLookup() {
  const barangays = useApplicationStore(s => s.barangays);
  const barangay = useApplicationStore(s => s.formData.step2.barangay);
  const setBarangayLookup = useApplicationStore(s => s.setBarangayLookup);
  const setLocation = useApplicationStore(s => s.setLocation);
  useEffect(() => {
    let cancelled = false;
    setBarangayLookup([], true, null);
    apiClient.get('/api/applications/barangays').then(res => {
      if (!cancelled) setBarangayLookup(res.data || [], false, null);
    }).catch(() => {
      if (!cancelled) setBarangayLookup([], false, 'Unable to load barangay locations. Please refresh and try again.');
    });
    return () => { cancelled = true; };
  }, [setBarangayLookup]);
  useEffect(() => {
    const selected = barangays.find(b => b.name === barangay);
    if (selected) setLocation(selected);
  }, [barangays, barangay, setLocation]);
}
