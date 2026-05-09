// src/hooks/useAutosave.js
import { useEffect, useRef } from 'react';
import useApplicationStore from '../store/applicationStore';
import apiClient from '../utils/apiClient';
import { API_ENDPOINTS } from '../utils/constants';

const useAutosave = () => {
  const formData = useApplicationStore((state) => state.formData);
  const current_step = useApplicationStore((state) => state.current_step);
  const setSavingState = useApplicationStore((state) => state.setSavingState);
  const setLastSavedAt = useApplicationStore((state) => state.setLastSavedAt);

  const timeoutRef = useRef(null);
  const prevDataStringRef = useRef(null);

  useEffect(() => {
    const currentDataString = JSON.stringify({ formData, current_step });

    if (!prevDataStringRef.current || prevDataStringRef.current === currentDataString) {
      prevDataStringRef.current = currentDataString;
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      setSavingState(true);

      const payload = {
        current_step,
        form_data: formData
      };

      try {
        // Send real POST request to backend
        await apiClient.post(API_ENDPOINTS.APPLICATIONS_DRAFTS, payload);
        
        setLastSavedAt(new Date().toISOString());
        prevDataStringRef.current = currentDataString;
      } catch (error) {
        console.error('[Autosave Hook] Failed to save draft:', error.message);
      } finally {
        setSavingState(false);
      }
    }, 2000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [formData, current_step, setSavingState, setLastSavedAt]);

  return {
    isSaving: useApplicationStore((state) => state.isSaving),
    lastSavedAt: useApplicationStore((state) => state.lastSavedAt),
  };
};

export default useAutosave;