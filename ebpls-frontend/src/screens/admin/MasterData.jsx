/**
 * MasterData.jsx — Admin Module
 * CRUD management for lookup tables: fee types, clearance types, org types.
 * Phase 10: Build with real admin API endpoints.
 * RBAC: Admin role only.
 */

import React from 'react';
import { Database, Plus } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const LOOKUP_TABLES = [
  { name: 'Fee Types', count: 12, description: 'Revenue codes and fee categories for business permit assessment.' },
  { name: 'Clearance Types', count: 4, description: 'Types of barangay clearances issued.' },
  { name: 'Organization Types', count: 8, description: 'Business structure classifications (Sole Prop, Corp, Partnership, etc.).' },
  { name: 'Application Types', count: 3, description: 'New, Renewal, Retirement.' },
  { name: 'Payment Modes', count: 2, description: 'Cash and Manager Check — OTC only.' },
];

const MasterData = () => (
  <div className="flex flex-col gap-6">
    <div>
      <h1 className="text-2xl font-bold text-[hsl(var(--color-text))]">Master Data</h1>
      <p className="text-sm text-[hsl(var(--color-text-muted))] mt-1">
        Manage system lookup tables and configuration values.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {LOOKUP_TABLES.map((table) => (
        <Card key={table.name} hoverable padding="md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-[hsl(var(--color-accent-subtle))] flex items-center justify-center shrink-0">
                <Database size={16} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[hsl(var(--color-text))]">{table.name}</p>
                <p className="text-xs text-[hsl(var(--color-text-muted))] mt-0.5">{table.count} records</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" disabled leftIcon={<Plus size={14} />}>
              Add
            </Button>
          </div>
          <p className="text-xs text-[hsl(var(--color-text-muted))] mt-3 leading-relaxed">
            {table.description}
          </p>
        </Card>
      ))}
    </div>

    <Card variant="tinted" padding="md">
      <p className="text-xs text-[hsl(var(--color-text-muted))] text-center">
        Phase 0 placeholder — full CRUD interface built in Phase 10.
      </p>
    </Card>
  </div>
);

export default MasterData;
