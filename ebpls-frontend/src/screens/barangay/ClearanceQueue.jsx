/**
 * ClearanceQueue.jsx — Barangay Module
 * Pending clearance requests with issue/reject actions.
 * Phase 6: Build with real data from GET /api/barangay/clearances.
 * RBAC: Accessible by Barangay_Officer role only.
 */

import React from 'react';
import { ClipboardCheck, CheckCircle2, XCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { APP_STATUS } from '../../utils/constants';

const SAMPLE_QUEUE = [
  { id: 'CLR-001', business: 'Liliw General Merchandise', applicant: 'Maria Santos', requested: '2 days ago', status: APP_STATUS.PENDING },
  { id: 'CLR-002', business: "Cruz Eatery & Restaurant", applicant: 'Juan dela Cruz', requested: '1 day ago', status: APP_STATUS.PENDING },
  { id: 'CLR-003', business: 'Santos Automotive Parts', applicant: 'Pedro Santos', requested: '4 hours ago', status: APP_STATUS.PENDING },
];

const ClearanceQueue = () => (
  <div className="flex flex-col gap-6">
    <div>
      <h1 className="text-2xl font-bold text-[hsl(var(--color-text))]">Clearance Queue</h1>
      <p className="text-sm text-[hsl(var(--color-text-muted))] mt-1">
        Review and issue barangay clearances for pending applications.
      </p>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 gap-4">
      {[
        { label: 'Pending Clearances', value: '3', color: 'text-[hsl(var(--color-status-pending))]' },
        { label: 'Issued Today', value: '7', color: 'text-[hsl(var(--color-status-verified))]' },
      ].map((stat) => (
        <Card key={stat.label} padding="md" className="text-center">
          <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          <p className="text-xs text-[hsl(var(--color-text-muted))] mt-1">{stat.label}</p>
        </Card>
      ))}
    </div>

    {/* Queue */}
    <Card padding="none">
      <Card.Header>
        <div className="flex items-center gap-2">
          <ClipboardCheck size={16} className="text-[hsl(var(--color-text-muted))]" />
          <p className="text-sm font-semibold text-[hsl(var(--color-text))]">Pending Requests</p>
        </div>
      </Card.Header>
      <Card.Body className="!p-0">
        <div className="divide-y divide-border">
          {SAMPLE_QUEUE.map((item) => (
            <div key={item.id} className="px-4 py-3 hover:bg-surface-tint transition-colors duration-150">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--color-text))]">{item.business}</p>
                  <p className="text-xs text-[hsl(var(--color-text-muted))] mt-0.5">
                    {item.applicant} &middot; {item.id} &middot; {item.requested}
                  </p>
                </div>
                <Badge status={item.status} />
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="primary" size="sm" leftIcon={<CheckCircle2 size={14} />} disabled>
                  Issue Clearance
                </Button>
                <Button variant="danger" size="sm" leftIcon={<XCircle size={14} />} disabled>
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card.Body>
      <Card.Footer>
        <p className="text-xs text-[hsl(var(--color-text-muted))] text-center">
          Phase 0 placeholder — actions wired in Phase 6.
        </p>
      </Card.Footer>
    </Card>
  </div>
);

export default ClearanceQueue;
