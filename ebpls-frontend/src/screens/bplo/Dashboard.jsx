/**
 * Dashboard.jsx — BPLO Module
 * Real-time queue for pending and under-review applications.
 */

import { useEffect, useMemo, useState } from 'react';
import { Inbox, AlertTriangle, ArrowUpDown, RefreshCcw, FileSearch, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
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
  // Captured when the queue loads rather than read during render, so the
  // "over 2 days old" marker stays a pure function of state.
  const [loadedAt, setLoadedAt] = useState(() => Date.now());

  // Bumped by the Refresh button to re-run the load effect below.
  const [refreshKey, setRefreshKey] = useState(0);

  const loadQueue = () => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  };

  // The fetch is inlined so no state is written before the first await, which
  // keeps the effect free of cascading renders. `isLoading` is already true on
  // mount and is set by the Refresh handler on subsequent runs.
  useEffect(() => {
    let cancelled = false;

    const fetchQueue = async () => {
      try {
        const response = await apiClient.get(API_ENDPOINTS.BPLO_PENDING);
        if (cancelled) return;
        setApplications((response?.data || []).map(normalizeApplication));
        setLoadedAt(Date.now());
      } catch (err) {
        if (cancelled) return;
        addToast({
          message: err.message || 'Failed to load BPLO queue.',
          type: TOAST_TYPE.ERROR,
        });
        setApplications([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchQueue();
    return () => { cancelled = true; };
  }, [refreshKey, addToast]);

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
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
            BPLO
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
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

      {/* Stats. Same card shape and hover as the applicant dashboard's action
          cards: the border and surface lift, and the icon box inverts to
          zinc-900. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Pending review', value: stats.pendingCount, Icon: Inbox },
          { label: 'Under review', value: stats.underReviewCount, Icon: FileSearch },
          { label: 'Total applicants', value: stats.totalCount, Icon: Users },
        ].map(({ label, value, Icon }) => (
          <div
            key={label}
            className="group rounded-lg border border-zinc-200 bg-white p-5 transition-colors duration-200 ease-out hover:border-zinc-300 hover:bg-zinc-50 motion-reduce:transition-none"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums">
                  {value}
                </p>
                <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-zinc-500 uppercase">
                  {label}
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors duration-200 ease-out group-hover:border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white motion-reduce:transition-none">
                <Icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Application Queue Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {/* Table Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:items-center">
          <h3 className="flex items-center gap-2.5 font-mono text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
            <Users size={15} className="text-zinc-500" />
            Application queue
          </h3>
          <div className="flex items-center gap-2">
            {/* Shared Select, so the panel and selected row match every other
                dropdown in the system. */}
            <div className="w-44">
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                size="sm"
              >
                <option value="All">All Statuses</option>
                <option value={APP_STATUS.PENDING}>Pending</option>
                <option value={APP_STATUS.UNDER_REVIEW}>Under Review</option>
              </Select>
            </div>
            <Button
              variant="secondary"
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
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-zinc-500">Loading applications…</p>
          </div>
        ) : filteredAndSortedApplications.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
              <Inbox size={18} className="text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-500">No applications found.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filteredAndSortedApplications.map((app) => {
              const ageMs = app.submittedAt ? loadedAt - new Date(app.submittedAt).getTime() : 0;
              const urgent = ageMs >= 2 * DAY_MS;

              return (
                <div
                  key={app.id}
                  className="group flex items-center justify-between px-5 py-4 transition-colors duration-200 hover:bg-zinc-50 motion-reduce:transition-none"
                >
                  <div className="flex items-center gap-4">
                    {urgent && (
                      <AlertTriangle size={15} className="shrink-0 text-zinc-500" title="Over 2 days old" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{app.business}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[11px] text-zinc-500">{app.id}</span>
                        <span className="text-zinc-300">•</span>
                        <span className="text-xs text-zinc-500">{formatSubmittedLabel(app.submittedAt)}</span>
                      </div>
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
