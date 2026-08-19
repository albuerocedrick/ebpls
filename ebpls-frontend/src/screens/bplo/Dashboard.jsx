/**
 * Dashboard.jsx — BPLO Module
 * Real-time queue for pending and under-review applications.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Inbox, AlertTriangle, ArrowUpDown, RefreshCcw, FileSearch, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { apiClient } from '../../utils/apiClient';
import { API_ENDPOINTS, APP_STATUS, ROUTES } from '../../utils/constants';
import useUIStore, { TOAST_TYPE } from '../../store/UIStore';


const DAY_MS = 24 * 60 * 60 * 1000;

const formatSubmittedLabel = (submittedAt) => {
  if (!submittedAt) return 'Not submitted';
  const submittedDate = new Date(submittedAt);
  const now = new Date();
  const diffMs = now.getTime() - submittedDate.getTime();
  if (Number.isNaN(submittedDate.getTime()) || diffMs < 0) return 'Recently submitted';
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diffMs / DAY_MS);
  return `${days}d ago`;
};

const normalizeApplication = (row) => ({
  id: row.application_no,
  status: row.status,
  submittedAt: row.submitted_at,
  business:
    row.businesses?.business_name ||
    row.businesses?.[0]?.business_name ||
    'Unnamed Business',
});

const BPLODashboard = () => {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.BPLO_PENDING);
      const queue = (response?.data || []).map(normalizeApplication);
      setApplications(queue);
    } catch (err) {
      addToast({
        message: err.message || 'Failed to load BPLO queue.',
        type: TOAST_TYPE.ERROR,
      });
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const filteredAndSortedApplications = useMemo(() => {
    let copy = [...applications];

    if (selectedStatus !== 'All') {
      copy = copy.filter(app => app.status === selectedStatus);
    }

    copy.sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : Number.MAX_SAFE_INTEGER;
      return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
    });
    return copy;
  }, [applications, sortDirection, selectedStatus]);

  const stats = useMemo(() => {
    const pendingCount = applications.filter((app) => app.status === APP_STATUS.PENDING).length;
    const underReviewCount = applications.filter((app) => app.status === APP_STATUS.UNDER_REVIEW).length;
    const totalCount = applications.length;
    return { pendingCount, underReviewCount, totalCount };
  }, [applications]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            BPLO Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pending application queue sorted by submission date.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<RefreshCcw size={16} />}
            onClick={loadQueue}
            isLoading={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="group bg-white p-5 rounded-3xl border border-gray-100 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-default">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-700 group-hover:bg-gray-900 group-hover:text-white transition-all duration-300">
              <Inbox size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="group bg-white p-5 rounded-3xl border border-gray-100 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-default">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-700 group-hover:bg-gray-900 group-hover:text-white transition-all duration-300">
              <FileSearch size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Under Review</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.underReviewCount}</p>
            </div>
          </div>
        </div>

        <div className="group bg-white p-5 rounded-3xl border border-gray-100 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-default">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-700 group-hover:bg-gray-900 group-hover:text-white transition-all duration-300">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Applicants</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.totalCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Application Queue Table */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-gray-400" />
            Application Queue
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            >
              <option value="All">All Statuses</option>
              <option value={APP_STATUS.PENDING}>Pending</option>
              <option value={APP_STATUS.UNDER_REVIEW}>Under Review</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowUpDown size={14} />}
              onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            >
              {sortDirection === 'asc' ? 'Oldest first' : 'Newest first'}
            </Button>
          </div>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-400">Loading applications...</p>
          </div>
        ) : filteredAndSortedApplications.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Inbox size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No applications found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAndSortedApplications.map((app) => {
              const ageMs = app.submittedAt ? Date.now() - new Date(app.submittedAt).getTime() : 0;
              const urgent = ageMs >= 2 * DAY_MS; // 2 days in ms

              return (
                <div
                  key={app.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    {urgent && (
                      <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-bold text-gray-900">{app.business}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {app.id} &middot; {formatSubmittedLabel(app.submittedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge status={app.status} />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const verifierRoute = ROUTES.BPLO_VERIFIER.replace(':appNo', app.id);
                        navigate(verifierRoute);
                      }}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BPLODashboard;
