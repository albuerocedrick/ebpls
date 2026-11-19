// src/screens/applicant/Dashboard.jsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FilePlus, 
  ClipboardList, 
  Play, 
  Building2, 
  ChevronRight, 
  FileText, 
  Loader2, 
  AlertCircle, 
  XCircle,
  Calendar,
  MapPin,
  Clock,
  RefreshCw
} from 'lucide-react';
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

  // Phase 4: My Approved Businesses State
  const [approvedBusinesses, setApprovedBusinesses] = useState([]);
  const [isLoadingApproved, setIsLoadingApproved] = useState(true);
  const [approvedError, setApprovedError] = useState(null);

  useEffect(() => {
    const fetchApprovedBusinesses = async () => {
      try {
        setIsLoadingApproved(true);
        setApprovedError(null);
        const res = await apiClient.get('/api/applications/my-approved-businesses');
        if (res && res.success) setApprovedBusinesses(res.data || []);
      } catch (err) {
        setApprovedError(err.message || 'Unable to load approved businesses.');
      } finally {
        setIsLoadingApproved(false);
      }
    };
    fetchApprovedBusinesses();
  }, []);

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
          Manage your business permit applications, view approved businesses, and track renewal lifecycles.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {draft_id ? (
          <Link
            to={ROUTES?.APPLICANT_UAF || '/applicant/apply'}
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
            to={ROUTES?.APPLICANT_UAF || '/applicant/apply'}
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
                View active filings
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

      {/* PHASE 4: MY APPROVED BUSINESSES HUB */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white">
              <Building2 size={16} className="text-zinc-900" />
            </div>
            <div>
              <h2 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
                My Approved Businesses
              </h2>
              <p className="text-xs text-zinc-500">
                Active permitted establishments registered under your taxpayer account
              </p>
            </div>
          </div>
          {approvedBusinesses.length > 0 && (
            <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-white">
              {approvedBusinesses.length} {approvedBusinesses.length === 1 ? 'Business' : 'Businesses'}
            </span>
          )}
        </div>

        {isLoadingApproved ? (
          <div className="flex flex-col items-center justify-center p-10">
            <Loader2 size={24} className="mb-2 animate-spin text-zinc-300" />
            <p className="text-xs text-zinc-500">Loading approved businesses…</p>
          </div>
        ) : approvedError ? (
          <div className="p-6 text-center text-xs text-red-600">{approvedError}</div>
        ) : approvedBusinesses.length > 0 ? (
          <div className="divide-y divide-zinc-200">
            {approvedBusinesses.map((biz) => {
              const isExpired = biz.is_expired;
              const daysLeft = biz.days_until_expiry;
              const branches = biz.branches || [];

              return (
                <div key={biz.business_id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-zinc-900">
                        {biz.business_name}
                      </h3>
                      {biz.trade_name && (
                        <span className="text-xs text-zinc-500">
                          ({biz.trade_name})
                        </span>
                      )}
                      <span className="rounded border border-zinc-300 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-800">
                        {biz.bin}
                      </span>
                      <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-800">
                        Permit: {biz.permit_no}
                      </span>
                    </div>

                    {/* Validity Window Badge */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium text-[11px] ${
                        isExpired
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : daysLeft <= 30
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        <Calendar size={12} />
                        {isExpired
                          ? 'Expired'
                          : daysLeft <= 30
                          ? `Expiring Soon · ${daysLeft} days remaining`
                          : `Active · Valid until Dec 31 (${daysLeft} days remaining)`}
                      </span>
                      <span className="text-zinc-400">•</span>
                      <span className="text-zinc-500 font-medium">
                        {branches.length} {branches.length === 1 ? 'Branch' : 'Branches'} registered
                      </span>
                    </div>

                    {/* Branch Locations List */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {branches.map((b) => (
                        <span key={b.branch_id} className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700">
                          <MapPin size={11} className="text-zinc-400" />
                          {b.branch_name} ({b.barangay})
                          {b.is_main && <strong className="ml-0.5 font-mono text-[9px] uppercase text-zinc-500">Main</strong>}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons: Transaction Branching */}
                  <div className="shrink-0 flex flex-wrap items-center gap-2">
                    {biz.has_pending_renewal ? (
                      <Link
                        to={`/applicant/status?id=${biz.pending_renewal_app_no}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                      >
                        <Clock size={14} />
                        <span>Renewal Pending ({biz.pending_renewal_app_no})</span>
                      </Link>
                    ) : (
                      <>
                        <Link
                          to={`/applicant/renew/${biz.business_id}`}
                          title="Annual Renewal: Retain existing branch locations and declare gross sales"
                          className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors shadow-sm"
                        >
                          <RefreshCw size={14} />
                          <span>Annual Renewal</span>
                        </Link>
                        <Link
                          to={`/applicant/amend/${biz.business_id}`}
                          title="Moving to New Address: Select 'Business Amendment' linked to existing BIN"
                          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-xs"
                        >
                          <MapPin size={13} className="text-zinc-500" />
                          <span>Relocate / Amend</span>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-zinc-500">
            No approved business permits yet. Once your business permit is issued, it will appear here for one-click selective renewal.
          </div>
        )}
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
            <p className="mt-1 text-xs text-zinc-500">
              You haven't submitted any business permit applications yet.
            </p>
          </div>
        )}
      </div>

      {/* Retirements List */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white">
            <XCircle size={16} className="text-zinc-600" />
          </div>
          <h2 className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">My business retirements</h2>
        </div>

        {isLoadingRetirements ? (
          <div className="flex flex-col items-center justify-center p-10">
            <Loader2 size={24} className="mb-3 animate-spin text-zinc-300" />
            <p className="text-sm text-zinc-500">Loading retirements…</p>
          </div>
        ) : retirements.length > 0 ? (
          <div className="divide-y divide-zinc-200">
            {retirements.map((ret) => (
              <div key={ret.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{ret.business_name}</p>
                  <p className="font-mono text-[11px] text-zinc-500">Application: {ret.application_no}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Reason: {ret.reason}</p>
                </div>
                <StatusBadge status={ret.status} size="sm" />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-zinc-500">
            No business retirements filed.
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicantDashboard;
