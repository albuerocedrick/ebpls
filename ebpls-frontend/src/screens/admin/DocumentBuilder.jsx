/**
 * DocumentBuilder.jsx — Admin Module
 * PDF template customizer for Business Permit, E-Resibo, TOP, Barangay Clearance.
 * Phase 10: Build with real template upload and placeholder mapping.
 * RBAC: Admin role only.
 */

import React from 'react';
import { FileText, Upload } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const TEMPLATES = [
  { name: 'Business Permit', description: 'Official permit issued upon payment completion.' },
  { name: 'E-Resibo (Official Receipt)', description: 'Electronic official receipt per OTC transaction.' },
  { name: 'Tax Order of Payment (TOP)', description: 'Pre-payment fee breakdown document issued by Treasury.' },
  { name: 'Barangay Clearance', description: 'Clearance document issued by the Barangay Officer.' },
];

const DocumentBuilder = () => (
  <div className="flex flex-col gap-6">
    <div>
      <h1 className="text-2xl font-bold text-[hsl(var(--color-text))]">Document Builder</h1>
      <p className="text-sm text-[hsl(var(--color-text-muted))] mt-1">
        Upload and configure PDF templates for system-generated documents.
      </p>
    </div>

    <div className="flex flex-col gap-4">
      {TEMPLATES.map((tmpl) => (
        <Card key={tmpl.name} padding="md">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-[hsl(var(--color-accent-subtle))] flex items-center justify-center shrink-0">
                <FileText size={18} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[hsl(var(--color-text))]">{tmpl.name}</p>
                <p className="text-xs text-[hsl(var(--color-text-muted))] mt-0.5">{tmpl.description}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" leftIcon={<Upload size={14} />} disabled>
              Upload Template
            </Button>
          </div>
        </Card>
      ))}
    </div>

    <Card variant="tinted" padding="md">
      <p className="text-xs text-[hsl(var(--color-text-muted))] text-center">
        Phase 0 placeholder — template upload and placeholder mapping built in Phase 10.
      </p>
    </Card>
  </div>
);

export default DocumentBuilder;
