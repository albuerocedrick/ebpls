import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import useApplicationStore from '../store/applicationStore';

const useApplicableRequirements = () => {
  const step1 = useApplicationStore(s => s.formData.step1);
  const tenancy = useApplicationStore(s => s.formData.step2.tenancy_type);
  const activities = useApplicationStore(s => s.formData.step3.lineOfBusinesses);
  const ready = Boolean(step1.type_id && step1.org_type_id);
  const params = new URLSearchParams({ type_id: step1.type_id, org_type_id: step1.org_type_id, tenancy_type: tenancy });
  params.set('activity_names', JSON.stringify((activities || []).map(activity => activity.name).filter(Boolean)));
  const query = params.toString();
  const [state, setState] = useState({ key: '', requirements: [], loading: false, error: null });
  useEffect(() => {
    let cancelled = false;
    if (!ready) return;
    apiClient.get(`/api/applications/requirements?${query}`).then(res => {
      if (!cancelled) setState({ key: query, requirements: res.data || [], loading: false, error: res.success ? null : 'Failed to load requirements.' });
    }).catch(() => {
      if (!cancelled) setState({ key: query, requirements: [], loading: false, error: 'Unable to load document requirements. Please refresh and try again.' });
    });
    return () => { cancelled = true; };
  }, [query, ready]);
  if (!ready) return { requirements: [], loading: false, error: null };
  return state.key === query ? state : { requirements: [], loading: true, error: null };
};
export default useApplicableRequirements;
