/**
 * SplitScreenVerifier.jsx — BPLO Module
 * Left: Document viewer. Right: Verification checklist.
 * Phase 4A: Build with real document pre-signed URLs and verify/return API calls.
 */

import React from 'react';
import { FileSearch, CheckSquare, XSquare, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { ROUTES, APP_STATUS } from '../../utils/constants';

const CHECKLIST = [
  { label: 'DTI / SEC Registration', checked: true },
  { label: 'Barangay Clearance', checked: true },
  { label: 'Fire Safety Inspection Report', checked: false },
  { label: 'Sanitary Permit', checked: false },
  { label: 'Lessor / Proof of Ownership', checked: false },
];

const SplitScreenVerifier = () => (
  <div className="flex flex-col gap-5">
    {/* Breadcrumb */}
    <div className="flex items-center gap-2">
      <Link to={ROUTES.BPLO_DASHBOARD} className="flex items-center gap-1 text-sm text-accent hover:opacity-80 transition-opacity">
        <ChevronLeft size={16} /> Dashboard
      </Link>
      <span className="text-[hsl(var(--color-text-muted))] text-sm">/</span>
      <span className="text-sm text-[hsl(var(--color-text-muted))]">Verify BP-2025-010</span>
    </div>

    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold text-[hsl(var(--color-text))]">Document Verification</h1>
      <Badge status={APP_STATUS.UNDER_REVIEW} />
    </div>

    {/* Split layout */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: Document viewer */}
      <Card padding="none">
        <Card.Header>
          <div className="flex items-center gap-2">
            <FileSearch size={15} className="text-[hsl(var(--color-text-muted))]" />
            <p className="text-sm font-semibold text-[hsl(var(--color-text))]">Document Viewer</p>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="aspect-[3/4] bg-surface-tint rounded-md border border-border flex items-center justify-center">
            <p className="text-xs text-[hsl(var(--color-text-muted))] text-center px-6">
              Phase 0 placeholder.
              <br />
              Phase 4A: Renders pre-signed URL document viewer with zoom controls.
            </p>
          </div>
        </Card.Body>
      </Card>

      {/* Right: Checklist + actions */}
      <div className="flex flex-col gap-4">
        <Card padding="none">
          <Card.Header>
            <p className="text-sm font-semibold text-[hsl(var(--color-text))]">Required Documents</p>
          </Card.Header>
          <Card.Body>
            <div className="flex flex-col gap-2">
              {CHECKLIST.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  {item.checked
                    ? <CheckSquare size={16} className="text-[hsl(var(--color-status-verified))] shrink-0" />
                    : <XSquare size={16} className="text-border shrink-0" />}
                  <span className={`text-sm ${item.checked ? 'text-[hsl(var(--color-text))]' : 'text-[hsl(var(--color-text-muted))]'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>

        {/* Actions */}
        <Card variant="tinted" padding="md">
          <div className="flex flex-col gap-2">
            <Button variant="primary" fullWidth leftIcon={<CheckSquare size={16} />} disabled>
              Verify Application
            </Button>
            <Button variant="danger" fullWidth leftIcon={<XSquare size={16} />} disabled>
              Return with Remarks
            </Button>
            <p className="text-xs text-[hsl(var(--color-text-muted))] text-center mt-1">
              Phase 0 — actions wired in Phase 4A.
            </p>
          </div>
        </Card>
      </div>
    </div>
  </div>
);

export default SplitScreenVerifier;
