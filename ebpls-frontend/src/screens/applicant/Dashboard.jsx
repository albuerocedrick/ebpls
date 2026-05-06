/**
 * Dashboard.jsx — Applicant Module
 * Shows the applicant's application list, quick actions, and status badges.
 * Phase 3A: Build full dashboard with applicationStore and API integration.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { FilePlus, ClipboardList, Clock } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { ROUTES, APP_STATUS } from '../../utils/constants';

const ApplicantDashboard = () => (
  <div className="flex flex-col gap-5">
    <div>
      <h1 className="text-xl font-bold text-[hsl(var(--color-text))]">My Dashboard</h1>
      <p className="text-sm text-[hsl(var(--color-text-muted))] mt-0.5">
        Manage your business permit applications.
      </p>
    </div>

    {/* Quick actions */}
    <div className="grid grid-cols-2 gap-3">
      <Link to={ROUTES.APPLICANT_UAF}>
        <Card hoverable padding="md" className="text-center">
          <FilePlus size={24} className="text-accent mx-auto mb-2" />
          <p className="text-sm font-medium text-[hsl(var(--color-text))]">New Application</p>
        </Card>
      </Link>
      <Link to={ROUTES.APPLICANT_STATUS}>
        <Card hoverable padding="md" className="text-center">
          <ClipboardList size={24} className="text-accent mx-auto mb-2" />
          <p className="text-sm font-medium text-[hsl(var(--color-text))]">Track Status</p>
        </Card>
      </Link>
    </div>

    {/* Applications list placeholder */}
    <Card padding="none">
      <Card.Header>
        <p className="text-sm font-semibold text-[hsl(var(--color-text))]">My Applications</p>
      </Card.Header>
      <Card.Body>
        <div className="flex flex-col gap-3">
          {[
            { id: 'BP-2025-001', business: 'Sample Sari-Sari Store', status: APP_STATUS.PENDING },
            { id: 'BP-2025-002', business: 'Dela Cruz Hardware', status: APP_STATUS.DRAFT },
          ].map((app) => (
            <div key={app.id} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-[hsl(var(--color-text))]">{app.business}</p>
                <p className="text-xs text-[hsl(var(--color-text-muted))] flex items-center gap-1 mt-0.5">
                  <Clock size={11} /> {app.id}
                </p>
              </div>
              <Badge status={app.status} />
            </div>
          ))}
        </div>
      </Card.Body>
      <Card.Footer>
        <p className="text-xs text-[hsl(var(--color-text-muted))] text-center">
          Phase 0 — sample data. Real data wired in Phase 3A.
        </p>
      </Card.Footer>
    </Card>
  </div>
);

export default ApplicantDashboard;
