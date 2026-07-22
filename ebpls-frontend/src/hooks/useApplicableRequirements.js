import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import useApplicationStore from '../store/applicationStore';

const useApplicableRequirements = () => {
  const step1Data = useApplicationStore((state) => state.formData.step1);
  const step2Data = useApplicationStore((state) => state.formData.step2);
  const step3Data = useApplicationStore((state) => state.formData.step3);

  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchRequirements = async () => {
      const type_id = step1Data.type_id;
      const org_type_id = step1Data.org_type_id;
      const is_renting = step2Data.is_renting ?? false;
      const activity_names = (step3Data.lineOfBusinesses || []).map(b => b.name).join(',');

      if (!type_id || !org_type_id) {
        if (isMounted) setRequirements([]);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          type_id,
          org_type_id,
          is_renting: is_renting.toString()
        });
        
        if (activity_names) {
          params.append('activity_names', activity_names);
        }

        const res = await apiClient.get(`/api/applications/requirements?${params.toString()}`);
        
        if (isMounted) {
          if (res.success) {
            setRequirements(res.data);
          } else {
            setError(res.message || 'Failed to load requirements');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Network error loading requirements. Please check your connection.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchRequirements();
    return () => { isMounted = false; };
  }, [step1Data.type_id, step1Data.org_type_id, step2Data.is_renting, step3Data.lineOfBusinesses]);

  return { requirements, loading, error };
};

export default useApplicableRequirements;
