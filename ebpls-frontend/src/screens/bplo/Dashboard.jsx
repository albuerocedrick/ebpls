/**
 * Dashboard.jsx — BPLO Module
 * Real-time queue for pending and under-review applications.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Inbox, AlertTriangle, ArrowUpDown, RefreshCcw } from 'lucide-react';
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

  if (Number.isNaN(submittedDate.getTime()) || diffMs < 0) {
    return 'Recently submitted';
  }

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

  const sortedApplications = useMemo(() => {
    const copy = [...applications];
    copy.sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : Number.MAX_SAFE_INTEGER;
      return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
    });
    return copy;
  }, [applications, sortDirection]);

  const stats = useMemo(() => {
    const pendingCount = applications.filter((app) => app.status === APP_STATUS.PENDING).length;
    const underReviewCount = applications.filter((app) => app.status === APP_STATUS.UNDER_REVIEW).length;
    const urgentCount = applications.filter((app) => {
      if (!app.submittedAt) return false;
      return (Date.now() - new Date(app.submittedAt).getTime()) >= (2 * DAY_MS);
    }).length;

    return { pendingCount, underReviewCount, urgentCount };
  }, [applications]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--color-text))]">BPLO Dashboard</h1>
        <p className="text-sm text-[hsl(var(--color-text-muted))] mt-1">
          Pending application queue sorted by submission date.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Review', value: stats.pendingCount, color: 'text-[hsl(var(--color-status-pending))]' },
          { label: 'Under Review', value: stats.underReviewCount, color: 'text-[hsl(var(--color-status-under-review))]' },
          { label: 'Urgent (2+ days)', value: stats.urgentCount, color: 'text-[hsl(var(--color-status-returned))]' },
        ].map((stat) => (
          <Card key={stat.label} padding="md" className="text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-[hsl(var(--color-text-muted))] mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card padding="none">
        <Card.Header>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Inbox size={16} className="text-[hsl(var(--color-text-muted))]" />
              <p className="text-sm font-semibold text-[hsl(var(--color-text))]">Application Queue</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowUpDown size={14} />}
                onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              >
                {sortDirection === 'asc' ? 'Oldest first' : 'Newest first'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCcw size={14} />}
                onClick={loadQueue}
                isLoading={isLoading}
              >
                Refresh
              </Button>
            </div>
          </div>
        </Card.Header>

        <Card.Body className="!p-0">
          {isLoading ? (
            <p className="text-sm text-[hsl(var(--color-text-muted))] px-4 py-8 text-center">
              Loading applications...
            </p>
          ) : sortedApplications.length === 0 ? (
            <p className="text-sm text-[hsl(var(--color-text-muted))] px-4 py-8 text-center">
              No pending applications found.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {sortedApplications.map((app) => {
                const ageMs = app.submittedAt ? Date.now() - new Date(app.submittedAt).getTime() : 0;
                const urgent = ageMs >= (2 * DAY_MS);

                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-tint transition-colors duration-150"
                  >
                    <div className="flex items-center gap-3">
                      {urgent && (
                        <AlertTriangle size={15} className="text-[hsl(var(--color-status-pending))] shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--color-text))]">{app.business}</p>
                        <p className="text-xs text-[hsl(var(--color-text-muted))]">
                          {app.id} &middot; {formatSubmittedLabel(app.submittedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge status={app.status} />
                      <Button
                        variant="outline"
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
        </Card.Body>
      </Card>
    </div>
  );
};

export default BPLODashboard;
