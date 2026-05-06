/**
 * Dashboard.jsx — BPLO Module
 * Application queue with SLA urgency indicators.
 * Phase 4A: Build sortable data table with real data from GET /api/bplo/applications/pending.
 */

import React from 'react';
import { Inbox, AlertTriangle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { APP_STATUS } from '../../utils/constants';

const SAMPLE_QUEUE = [
  { id: 'BP-2025-010', business: 'Liliw General Merchandise', submitted: '3 days ago', status: APP_STATUS.PENDING, urgent: true },
  { id: 'BP-2025-011', business: 'Cruz Eatery & Restaurant', submitted: '1 day ago', status: APP_STATUS.UNDER_REVIEW, urgent: false },
  { id: 'BP-2025-012', business: 'Santos Automotive Parts', submitted: '5 hours ago', status: APP_STATUS.PENDING, urgent: false },
];

const BPLODashboard = () => (
  <div className="flex flex-col gap-6">
    <div>
      <h1 className="text-2xl font-bold text-[hsl(var(--color-text))]">BPLO Dashboard</h1>
      <p className="text-sm text-[hsl(var(--color-text-muted))] mt-1">
        Pending application queue — verify and process submissions.
      </p>
    </div>

    {/* Stats row */}
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Pending Review', value: '12', color: 'text-[hsl(var(--color-status-pending))]' },
        { label: 'Under Review', value: '4', color: 'text-[hsl(var(--color-status-under-review))]' },
        { label: 'Returned Today', value: '2', color: 'text-[hsl(var(--color-status-returned))]' },
      ].map((stat) => (
        <Card key={stat.label} padding="md" className="text-center">
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          <p className="text-xs text-[hsl(var(--color-text-muted))] mt-1">{stat.label}</p>
        </Card>
      ))}
    </div>

    {/* Application queue */}
    <Card padding="none">
      <Card.Header>
        <div className="flex items-center gap-2">
          <Inbox size={16} className="text-[hsl(var(--color-text-muted))]" />
          <p className="text-sm font-semibold text-[hsl(var(--color-text))]">Application Queue</p>
        </div>
      </Card.Header>
      <Card.Body className="!p-0">
        <div className="divide-y divide-border">
          {SAMPLE_QUEUE.map((app) => (
            <div key={app.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface-tint transition-colors duration-150">
              <div className="flex items-center gap-3">
                {app.urgent && <AlertTriangle size={15} className="text-[hsl(var(--color-status-pending))] shrink-0" />}
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--color-text))]">{app.business}</p>
                  <p className="text-xs text-[hsl(var(--color-text-muted))]">{app.id} &middot; {app.submitted}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge status={app.status} />
                <Button variant="outline" size="sm" disabled>Review</Button>
              </div>
            </div>
          ))}
        </div>
      </Card.Body>
      <Card.Footer>
        <p className="text-xs text-[hsl(var(--color-text-muted))] text-center">
          Phase 0 — sample data. Sortable table wired in Phase 4A.
        </p>
      </Card.Footer>
    </Card>
  </div>
);

export default BPLODashboard;
