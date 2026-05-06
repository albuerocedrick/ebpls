/**
 * AuditLogs.jsx — Admin Module
 * DPA-compliant filterable audit log viewer.
 * Phase 10: Build with real audit data from GET /api/admin/audit-logs.
 * RBAC: Admin role only.
 */

import React from 'react';
import { ScrollText, Filter } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const SAMPLE_LOGS = [
  { actor: 'bplo@liliw.gov', action: 'APPLICATION_VERIFIED', entity: 'BP-2025-010', timestamp: '2025-05-06 09:14:23', ip: '192.168.1.5' },
  { actor: 'treasury@liliw.gov', action: 'PAYMENT_RECORDED', entity: 'BP-2025-008', timestamp: '2025-05-06 08:50:11', ip: '192.168.1.8' },
  { actor: 'admin@liliw.gov', action: 'USER_ROLE_UPDATED', entity: 'USR-0042', timestamp: '2025-05-05 17:02:44', ip: '192.168.1.2' },
  { actor: 'bplo@liliw.gov', action: 'APPLICATION_RETURNED', entity: 'BP-2025-007', timestamp: '2025-05-05 14:30:00', ip: '192.168.1.5' },
];

const ACTION_COLOR = {
  APPLICATION_VERIFIED: 'text-[hsl(var(--color-status-verified))]',
  PAYMENT_RECORDED: 'text-[hsl(var(--color-status-paid))]',
  USER_ROLE_UPDATED: 'text-accent',
  APPLICATION_RETURNED: 'text-[hsl(var(--color-status-returned))]',
};

const AuditLogs = () => (
  <div className="flex flex-col gap-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--color-text))]">Audit Logs</h1>
        <p className="text-sm text-[hsl(var(--color-text-muted))] mt-1">
          DPA 2012 compliance log — all system mutations recorded immutably.
        </p>
      </div>
      <Button variant="secondary" size="sm" leftIcon={<Filter size={14} />} disabled>
        Filter
      </Button>
    </div>

    {/* Log table */}
    <Card padding="none">
      <Card.Header>
        <div className="flex items-center gap-2">
          <ScrollText size={15} className="text-[hsl(var(--color-text-muted))]" />
          <p className="text-sm font-semibold text-[hsl(var(--color-text))]">Recent Actions</p>
        </div>
      </Card.Header>
      <Card.Body className="!p-0">
        {/* Column headers */}
        <div className="grid grid-cols-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--color-text-muted))] bg-surface-tint border-b border-border">
          <span>Actor</span>
          <span>Action</span>
          <span>Entity</span>
          <span>Timestamp</span>
        </div>
        <div className="divide-y divide-border">
          {SAMPLE_LOGS.map((log, i) => (
            <div key={i} className="grid grid-cols-4 px-4 py-2.5 text-xs items-center hover:bg-surface-tint transition-colors duration-150">
              <span className="text-[hsl(var(--color-text))] font-mono truncate">{log.actor}</span>
              <span className={`font-mono font-semibold ${ACTION_COLOR[log.action] || 'text-[hsl(var(--color-text))]'}`}>
                {log.action}
              </span>
              <span className="text-[hsl(var(--color-text-muted))] font-mono">{log.entity}</span>
              <span className="text-[hsl(var(--color-text-muted))] font-mono">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </Card.Body>
      <Card.Footer>
        <p className="text-xs text-[hsl(var(--color-text-muted))] text-center">
          Phase 0 — sample data. Filterable viewer with real data built in Phase 10.
        </p>
      </Card.Footer>
    </Card>
  </div>
);

export default AuditLogs;
