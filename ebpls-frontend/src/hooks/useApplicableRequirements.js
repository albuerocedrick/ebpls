import { useEffect, useState } from 'react';
import apiClient from '../utils/apiClient';
import useApplicationStore from '../store/applicationStore';
import { getFormBranches } from '../utils/uafForm';

export default function useApplicableRequirements() {
  const form = useApplicationStore(state => state.formData);
  const { type_id, org_type_id } = form.step1;
  const ready = Boolean(type_id && org_type_id);
  const key = JSON.stringify({
    type_id, org_type_id,
    branches: getFormBranches(form).map(branch => ({
      branch_key: branch.branch_key,
      tenancy_type: branch.tenancy_type,
      activity_names: (branch.lineOfBusinesses || []).map(activity => activity.name).filter(Boolean),
    })),
  });
  const [state, setState] = useState({ key: '', requirements: [], error: null });
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    apiClient.post('/api/applications/requirements/branches', JSON.parse(key)).then(res => {
      if (!cancelled) setState({ key, requirements: res.data || [], error: res.success ? null : 'Failed to load requirements.' });
    }).catch(() => {
      if (!cancelled) setState({ key, requirements: [], error: 'Unable to load document requirements. Please refresh and try again.' });
    });
    return () => { cancelled = true; };
  }, [key, ready]);
  if (!ready) return { requirements: [], loading: false, error: null };
  return state.key === key ? { ...state, loading: false } : { requirements: [], loading: true, error: null };
}
