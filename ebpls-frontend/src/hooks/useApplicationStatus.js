/**
 * useApplicationStatus.js — Custom Hook
 * Handles real-time status tracking for a specific application.
 * Phase 5: Implements polling logic for the 'PaymentProcessing' state.
 */

import { useState, useEffect, useRef } from 'react';
import apiClient from '../utils/apiClient';
import { API_ENDPOINTS, STATUSES } from '../utils/constants';

const POLLING_INTERVAL_MS = 5000; // 5 seconds

export const useApplicationStatus = (appId) => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const pollingRef = useRef(null);  

  const fetchStatus = async (isPolling = false) => {
    if (!appId) return;

    try {
      if (!isPolling) setIsLoading(true);
      
      const response = await apiClient.get(API_ENDPOINTS.APPLICATIONS_STATUS(appId));
      
      if (response && response.success) {
        setData(response.data);
        setStatus(response.data.status);
      }
    } catch (err) {
      console.error('[useApplicationStatus] Fetch failed:', err);
      setError(err.message || 'Failed to fetch status');
    } finally {
      if (!isPolling) setIsLoading(false);
    }
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startPolling = () => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => fetchStatus(true), POLLING_INTERVAL_MS);
  };

  useEffect(() => {
    fetchStatus();

    // Cleanup on unmount
    return () => stopPolling();
  }, [appId]);

  // Handle Polling Logic for Online Payments
  useEffect(() => {
    if (status === STATUSES.PAYMENT_PROCESSING) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [status]);

  return {
    data,
    status,
    isLoading,
    error,
    refresh: () => fetchStatus(false)
  };
};

export default useApplicationStatus;