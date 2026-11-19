import { useEffect } from 'react';
import useApplicationStore from '../store/applicationStore';
import apiClient from '../utils/apiClient';

export default function useBarangayLookup() {
  const setBarangayLookup = useApplicationStore(s => s.setBarangayLookup);
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
}
