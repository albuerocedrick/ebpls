// src/screens/applicant/Dashboard.jsx

import React, { useState, useEffect } from 'react';
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Welcome, {firstName || 'Applicant'}!
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your business permit applications and track their progress.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {draft_id ? (
          <Link
            to={ROUTES?.APPLICANT_UAF || '/applicant/uaf'}
            className="group relative overflow-hidden bg-white p-6 rounded-3xl border border-gray-100 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] transition-all duration-300 text-left"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-900 rounded-t-3xl" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Resume Draft</h3>
                <p className="text-xs text-gray-500 mt-1">Step {current_step} of 5</p>
              </div>
              <div className="h-14 w-14 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-700 group-hover:bg-gray-900 group-hover:text-white transition-all duration-300">
                <Play size={20} fill="currentColor" />
              </div>
            </div>
          </Link>
        ) : (
          <Link
            to={ROUTES?.APPLICANT_UAF || '/applicant/uaf'}
            className="group relative overflow-hidden bg-white p-6 rounded-3xl border border-gray-100 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] transition-all duration-300 text-left"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">New Application</h3>
                <p className="text-xs text-gray-500 mt-1">Start a fresh UAF</p>
              </div>
              <div className="h-14 w-14 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-700 group-hover:bg-gray-900 group-hover:text-white transition-all duration-300">
                <FilePlus size={20} />
              </div>
            </div>
          </Link>
        )}

        <Link
          to={ROUTES?.APPLICANT_STATUS || '/applicant/status'}
          className="group relative overflow-hidden bg-white p-6 rounded-3xl border border-gray-100 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] transition-all duration-300 text-left"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Track Status</h3>
              <p className="text-xs text-gray-500 mt-1">View active permits</p>
            </div>
            <div className="h-14 w-14 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-700 group-hover:bg-gray-900 group-hover:text-white transition-all duration-300">
              <ClipboardList size={20} />
            </div>
          </div>
        </Link>

        <Link
          to={ROUTES?.APPLICANT_RETIRE || '/applicant/retire'}
          className="group relative overflow-hidden bg-white p-6 rounded-3xl border border-gray-100 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] transition-all duration-300 text-left"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Retire Business</h3>
              <p className="text-xs text-gray-500 mt-1">Close a business</p>
            </div>
            <div className="h-14 w-14 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-700 group-hover:bg-red-50 group-hover:text-red-600 transition-all duration-300">
              <XCircle size={20} />
            </div>
          </div>
        </Link>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gray-100 flex items-center justify-center">
            <FileText size={18} className="text-gray-600" />
          </div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">My Applications</h2>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-10">
            <Loader2 size={28} className="animate-spin text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">Loading applications...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-10">
            <AlertCircle size={28} className="text-red-300 mb-3" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : applications.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {applications.map((app) => (
              <Link
                key={app.application_no}
                to={`${ROUTES?.APPLICANT_STATUS || '/applicant/status'}?id=${app.application_no}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors group"
              >
                <div className="flex items-center gap-4 overflow-hidden pr-4">
                  <div className="p-2.5 bg-gray-50 rounded-xl shrink-0">
                    <Building2 size={16} className="text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {app.businesses?.business_name || 'Unnamed Business'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs font-mono text-gray-400">{app.application_no}</p>
                      <span className="text-gray-200">•</span>
                      <p className="text-xs text-gray-400">
                        {app.submitted_at
                          ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(app.submitted_at))
                          : 'Not submitted'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={app.status} size="sm" className="hidden sm:inline-flex" />
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
              <FileText size={22} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No applications found</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              You haven't submitted any business permit applications yet.
            </p>
          </div>
        )}
      </div>

      {/* My Retirements Section */}
      {!isLoadingRetirements && retirements.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-red-50 flex items-center justify-center">
              <XCircle size={18} className="text-red-500" />
            </div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">My Retirements</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {retirements.map((ret) => (
              <div key={ret.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4 overflow-hidden pr-4">
                  <div className="p-2.5 bg-red-50 rounded-xl shrink-0">
                    <Building2 size={16} className="text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {ret.businesses?.business_name || 'Unknown Business'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-400 truncate">
                        {ret.reason?.substring(0, 40)}{ret.reason?.length > 40 ? '...' : ''}
                      </p>
                      <span className="text-gray-200">•</span>
                      <p className="text-xs text-gray-400">
                        {ret.created_at ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(ret.created_at)) : ''}
                      </p>
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                  ret.status === 'Completed' ? 'bg-gray-100 text-gray-600' :
                  ret.status === 'Paid' ? 'bg-green-50 text-green-700 border border-green-200' :
                  ret.status === 'Assessed' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                  'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {ret.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicantDashboard;
