/**
 * StatusTracker.jsx — Applicant Module
 * Application status timeline view.
 * Phase 3A: Build with real application data from GET /api/applications/:app_no/status.
 */

import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { APP_STATUS } from '../../utils/constants';

const TIMELINE = [
  { status: APP_STATUS.PENDING,        done: true },
  { status: APP_STATUS.UNDER_REVIEW,   done: true },
  { status: APP_STATUS.VERIFIED,       done: false, active: true },
  { status: APP_STATUS.FOR_ASSESSMENT, done: false },
  { status: APP_STATUS.ASSESSED,       done: false },
  { status: APP_STATUS.FOR_PAYMENT,    done: false },
  { status: APP_STATUS.PAID,           done: false },
  { status: APP_STATUS.COMPLETED,      done: false },
];

const StatusTracker = () => (
  <div className="flex flex-col gap-5">
    <div>
      <h1 className="text-xl font-bold text-[hsl(var(--color-text))]">Application Status</h1>
      <p className="text-sm text-[hsl(var(--color-text-muted))] mt-0.5">BP-2025-001</p>
    </div>

    <Card padding="none">
      <Card.Header>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[hsl(var(--color-text))]">Sample Sari-Sari Store</p>
          <Badge status={APP_STATUS.VERIFIED} />
        </div>
      </Card.Header>
      <Card.Body>
        <div className="flex flex-col gap-0">
          {TIMELINE.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex flex-col items-center">
                <div className={[
                  'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                  step.done ? 'text-[hsl(var(--color-status-verified))]' :
                  step.active ? 'text-accent' : 'text-[hsl(var(--color-border-dark))]',
                ].join(' ')}>
                  {step.done
                    ? <CheckCircle2 size={18} />
                    : step.active
                    ? <Clock size={18} />
                    : <Circle size={18} />}
                </div>
                {i < TIMELINE.length - 1 && (
                  <div className={`w-0.5 h-5 mt-1 rounded ${step.done ? 'bg-[hsl(var(--color-status-verified))]' : 'bg-border'}`} />
                )}
              </div>
              {/* Label */}
              <p className={[
                'text-sm py-0.5',
                step.done ? 'text-[hsl(var(--color-text))] font-medium' :
                step.active ? 'text-accent font-semibold' :
                'text-[hsl(var(--color-text-muted))]',
              ].join(' ')}>
                {step.status}
              </p>
            </div>
          ))}
        </div>
      </Card.Body>
      <Card.Footer>
        <p className="text-xs text-[hsl(var(--color-text-muted))] text-center">
          Phase 0 — sample timeline. Real data wired in Phase 3A.
        </p>
      </Card.Footer>
    </Card>
  </div>
);

export default StatusTracker;
