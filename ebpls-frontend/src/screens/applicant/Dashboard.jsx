// src/screens/applicant/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus, ClipboardList, Play, Building2, ChevronRight, FileText, Loader2, AlertCircle } from 'lucide-react';
import StatusBadge from '../../components/shared/StatusBadge';
import useApplicationStore from '../../store/applicationStore';
import useAuthStore from '../../store/authStore';
import { ROUTES } from '../../utils/constants';
import apiClient from '../../utils/apiClient';

const ApplicantDashboard = () => {
  // Auth State
  const firstName = useAuthStore((state) => state.user?.firstName);

  // Zustand State (Drafts)
  const draft_id = useApplicationStore((state) => state.draft_id);
  const current_step = useApplicationStore((state) => state.current_step);

  // Local State for Applications List
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch the list of applications owned by the logged-in user
        const response = await apiClient.get('/api/applications/list');
        
        if (response && response.success) {
          setApplications(response.data || []);
        }
      } catch (err) {
        console.error('[Dashboard] Failed to fetch applications:', err);
        setError(err.message || 'Unable to load applications at this time.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--color-text,0,0%,10%))]">
          Welcome, {firstName || 'Applicant'}!
        </h1>
        <p className="text-sm text-[hsl(var(--color-text-muted,0,0%,40%))] mt-1">
          Manage your business permit applications and track their progress.
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4">
        {draft_id ? (
          <Link 
            to={ROUTES?.APPLICANT_UAF || '/applicant/uaf'}
            className="flex flex-col items-center justify-center gap-3 p-5 bg-[hsl(var(--color-surface,0,0%,100%))] border border-accent rounded-xl shadow-[var(--shadow-sm,0_1px_2px_0_rgba(0,0,0,0.05))] hover:shadow-[var(--shadow-md,0_4px_6px_-1px_rgba(0,0,0,0.1))] transition-shadow group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play size={24} fill="currentColor" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-accent">Resume Draft</p>
              <p className="text-[10px] text-[hsl(var(--color-text-muted,0,0%,40%))] mt-0.5">Step {current_step} of 5</p>
            </div>
          </Link>
        ) : (
          <Link 
            to={ROUTES?.APPLICANT_UAF || '/applicant/uaf'}
            className="flex flex-col items-center justify-center gap-3 p-5 bg-[hsl(var(--color-surface,0,0%,100%))] border border-[hsl(var(--color-border,0,0%,90%))] rounded-xl shadow-[var(--shadow-sm,0_1px_2px_0_rgba(0,0,0,0.05))] hover:shadow-[var(--shadow-md,0_4px_6px_-1px_rgba(0,0,0,0.1))] hover:border-accent/50 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--color-surface-raised,0,0%,96%))] text-[hsl(var(--color-text,0,0%,10%))] flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
              <FilePlus size={24} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[hsl(var(--color-text,0,0%,10%))]">New Application</p>
              <p className="text-[10px] text-[hsl(var(--color-text-muted,0,0%,40%))] mt-0.5">Start a fresh UAF</p>
            </div>
          </Link>
        )}

        <Link 
          to={ROUTES?.APPLICANT_STATUS || '/applicant/status'}
          className="flex flex-col items-center justify-center gap-3 p-5 bg-[hsl(var(--color-surface,0,0%,100%))] border border-[hsl(var(--color-border,0,0%,90%))] rounded-xl shadow-[var(--shadow-sm,0_1px_2px_0_rgba(0,0,0,0.05))] hover:shadow-[var(--shadow-md,0_4px_6px_-1px_rgba(0,0,0,0.1))] transition-shadow group"
        >
          <div className="w-12 h-12 rounded-full bg-[hsl(var(--color-surface-raised,0,0%,96%))] text-[hsl(var(--color-text,0,0%,10%))] flex items-center justify-center group-hover:bg-[hsl(var(--color-border,0,0%,90%))] transition-colors">
            <ClipboardList size={24} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[hsl(var(--color-text,0,0%,10%))]">Track Status</p>
            <p className="text-[10px] text-[hsl(var(--color-text-muted,0,0%,40%))] mt-0.5">View active permits</p>
          </div>
        </Link>
      </div>

      {/* Applications List */}
      <div className="border border-[hsl(var(--color-border,0,0%,90%))] rounded-xl bg-[hsl(var(--color-surface,0,0%,100%))] overflow-hidden shadow-[var(--shadow-sm,0_1px_2px_0_rgba(0,0,0,0.05))]">
        <div className="bg-[hsl(var(--color-surface-raised,0,0%,96%))] px-4 py-3 border-b border-[hsl(var(--color-border,0,0%,90%))] flex items-center gap-2">
          <FileText size={18} className="text-[hsl(var(--color-text-muted,0,0%,40%))]" />
          <h2 className="text-sm font-semibold text-[hsl(var(--color-text,0,0%,10%))]">My Applications</h2>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 text-[hsl(var(--color-text-muted,0,0%,40%))]">
            <Loader2 size={32} className="animate-spin mb-3 text-accent" />
            <p className="text-sm font-medium">Loading applications...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 text-red-500">
            <AlertCircle size={32} className="mb-3 opacity-50" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : applications.length > 0 ? (
          <ul className="divide-y divide-[hsl(var(--color-border,0,0%,90%))]">
            {applications.map((app) => (
              <li key={app.application_no}>
                <Link 
                  to={`${ROUTES?.APPLICANT_STATUS || '/applicant/status'}?id=${app.application_no}`}
                  className="flex items-center justify-between p-4 hover:bg-[hsl(var(--color-surface-raised,0,0%,98%))] transition-colors active:bg-[hsl(var(--color-surface-raised,0,0%,96%))]"
                >
                  <div className="flex items-start gap-3 overflow-hidden pr-4">
                    <div className="mt-1 p-2 bg-[hsl(var(--color-surface-raised,0,0%,96%))] rounded-md shrink-0">
                      <Building2 size={16} className="text-[hsl(var(--color-text-muted,0,0%,40%))]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[hsl(var(--color-text,0,0%,10%))] truncate">
                        {app.businesses?.business_name || 'Unnamed Business'}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                        <p className="text-xs font-mono text-[hsl(var(--color-text-muted,0,0%,40%))]">
                          {app.application_no}
                        </p>
                        <span className="hidden sm:inline text-[hsl(var(--color-border,0,0%,80%))]">•</span>
                        <p className="text-[10px] text-[hsl(var(--color-text-muted,0,0%,50%))]">
                          {app.submitted_at 
                            ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(app.submitted_at))
                            : 'Not submitted yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={app.status} size="sm" className="hidden sm:inline-flex" />
                    <ChevronRight size={18} className="text-[hsl(var(--color-text-muted,0,0%,40%))]" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--color-surface-raised,0,0%,96%))] flex items-center justify-center mb-3">
              <FileText size={24} className="text-[hsl(var(--color-border,0,0%,80%))]" />
            </div>
            <p className="text-sm font-medium text-[hsl(var(--color-text,0,0%,10%))]">No applications found</p>
            <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,40%))] mt-1 max-w-xs">
              You haven't submitted any business permit applications yet. Click "New Application" to get started.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default ApplicantDashboard;