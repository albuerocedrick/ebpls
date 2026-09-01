// src/screens/applicant/Dashboard.jsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus, ClipboardList, Play, Building2, ChevronRight, FileText, Loader2, AlertCircle, XCircle } from 'lucide-react';
import StatusBadge from '../../components/shared/StatusBadge';
import useApplicationStore from '../../store/applicationStore';
import useAuthStore from '../../store/authStore';
import { ROUTES } from '../../utils/constants';
import apiClient from '../../utils/apiClient';

const ApplicantDashboard = () => {
  const firstName = useAuthStore((state) => state.user?.firstName);
  const draft_id = useApplicationStore((state) => state.draft_id);
  const current_step = useApplicationStore((state) => state.current_step);

  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retirements, setRetirements] = useState([]);
  const [isLoadingRetirements, setIsLoadingRetirements] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.get('/api/applications/list');
        if (response && response.success) setApplications(response.data || []);
      } catch (err) {
        setError(err.message || 'Unable to load applications at this time.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchApplications();
  }, []);

  useEffect(() => {
    const fetchRetirements = async () => {
      try {
        setIsLoadingRetirements(true);
        const response = await apiClient.get('/api/retirement/my');
        if (response && response.success) setRetirements(response.data || []);
      } catch { /* silent */ }
      finally { setIsLoadingRetirements(false); }
    };
    fetchRetirements();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
          Applicant dashboard
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Welcome, {firstName || 'Applicant'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Manage your business permit applications and track their progress.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {draft_id ? (
          <Link
            to={ROUTES?.APPLICANT_UAF || '/applicant/uaf'}
            className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-5 text-left transition-colors duration-200 ease-out hover:border-zinc-300 hover:bg-zinc-50 motion-reduce:transition-none"
          >
            <div className="absolute top-0 right-0 left-0 h-px bg-zinc-900" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-zinc-900">Resume draft</h3>
                <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-zinc-500 uppercase">
                  Step {current_step} of 5
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors duration-200 ease-out group-hover:border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white motion-reduce:transition-none">
                <Play size={18} fill="currentColor" />
              </div>
            </div>
          </Link>
        ) : (
          <Link
            to={ROUTES?.APPLICANT_UAF || '/applicant/uaf'}
            className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-5 text-left transition-colors duration-200 ease-out hover:border-zinc-300 hover:bg-zinc-50 motion-reduce:transition-none"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-zinc-900">New application</h3>
                <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-zinc-500 uppercase">
                  Start a fresh UAF
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors duration-200 ease-out group-hover:border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white motion-reduce:transition-none">
                <FilePlus size={18} />
              </div>
            </div>
          </Link>
        )}

        <Link
          to={ROUTES?.APPLICANT_STATUS || '/applicant/status'}
          className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-5 text-left transition-colors duration-200 ease-out hover:border-zinc-300 hover:bg-zinc-50 motion-reduce:transition-none"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-zinc-900">Track status</h3>
              <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-zinc-500 uppercase">
                View active permits
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors duration-200 ease-out group-hover:border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white motion-reduce:transition-none">
              <ClipboardList size={18} />
            </div>
          </div>
        </Link>

        <Link
          to={ROUTES?.APPLICANT_RETIRE || '/applicant/retire'}
          className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-5 text-left transition-colors duration-200 ease-out hover:border-zinc-300 hover:bg-zinc-50 motion-reduce:transition-none"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-zinc-900">Retire business</h3>
              <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-zinc-500 uppercase">
                Close a business
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors duration-200 ease-out group-hover:border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white motion-reduce:transition-none">
              <XCircle size={18} />
            </div>
          </div>
        </Link>
      </div>

      {/* Applications List */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white">
            <FileText size={16} className="text-zinc-600" />
          </div>
          <h2 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">My applications</h2>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-10">
            <Loader2 size={24} className="mb-3 animate-spin text-zinc-300" />
            <p className="text-sm text-zinc-500">Loading applications…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-10">
            <AlertCircle size={24} className="mb-3 text-zinc-400" />
            <p className="text-sm text-zinc-700">{error}</p>
          </div>
        ) : applications.length > 0 ? (
          <div className="divide-y divide-zinc-200">
            {applications.map((app) => (
              <Link
                key={app.application_no}
                to={`${ROUTES?.APPLICANT_STATUS || '/applicant/status'}?id=${app.application_no}`}
                className="group flex items-center justify-between px-5 py-4 transition-colors duration-200 ease-out hover:bg-zinc-50 motion-reduce:transition-none"
              >
                <div className="flex items-center gap-4 overflow-hidden pr-4">
                  <div className="shrink-0 rounded-md border border-zinc-200 bg-white p-2.5">
                    <Building2 size={16} className="text-zinc-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {app.businesses?.business_name || 'Unnamed Business'}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="font-mono text-[11px] text-zinc-500">{app.application_no}</p>
                      <span className="text-zinc-300">•</span>
                      <p className="text-xs text-zinc-500">
                        {app.submitted_at
                          ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(app.submitted_at))
                          : 'Not submitted'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={app.status} size="sm" className="hidden sm:inline-flex" />
                  <ChevronRight
                    size={16}
                    className="text-zinc-300 transition-colors duration-200 group-hover:text-zinc-600 motion-reduce:transition-none"
                  />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
              <FileText size={18} className="text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-900">No applications found</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-zinc-500">
              You haven&apos;t submitted any business permit applications yet.
            </p>
          </div>
        )}
      </div>

      {/* My Retirements Section */}
      {!isLoadingRetirements && retirements.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white">
              <XCircle size={16} className="text-zinc-600" />
            </div>
            <h2 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">My retirements</h2>
          </div>

          <div className="divide-y divide-zinc-200">
            {retirements.map((ret) => (
              <div key={ret.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4 overflow-hidden pr-4">
                  <div className="shrink-0 rounded-md border border-zinc-200 bg-white p-2.5">
                    <Building2 size={16} className="text-zinc-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {ret.businesses?.business_name || 'Unknown Business'}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="truncate text-xs text-zinc-500">
                        {ret.reason?.substring(0, 40)}{ret.reason?.length > 40 ? '...' : ''}
                      </p>
                      <span className="text-zinc-300">•</span>
                      <p className="text-xs text-zinc-500">
                        {ret.created_at ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(ret.created_at)) : ''}
                      </p>
                    </div>
                  </div>
                </div>
                <StatusBadge status={ret.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicantDashboard;
