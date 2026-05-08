/**
 * SplitScreenVerifier.jsx — BPLO Module
 * Left: document preview placeholder. Right: checklist + verify/return actions.
 */

import React, { useMemo, useState } from 'react';
import { FileSearch, CheckSquare, XSquare, ChevronLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { apiClient } from '../../utils/apiClient';
import { API_ENDPOINTS, ROUTES, APP_STATUS } from '../../utils/constants';
import useUIStore, { TOAST_TYPE } from '../../store/UIStore';

const INITIAL_CHECKLIST = [
  { requirementId: 1, label: 'DTI / SEC / CDA Registration', status: 'Pending' },
  { requirementId: 2, label: 'Barangay Business Clearance', status: 'Pending' },
  { requirementId: 3, label: 'Fire Safety Inspection Certificate', status: 'Pending' },
  { requirementId: 4, label: 'Sanitary Permit', status: 'Pending' },
  { requirementId: 5, label: 'Zoning Clearance', status: 'Pending' },
  { requirementId: 6, label: 'Lease Contract / TCT', status: 'Pending' },
  { requirementId: 7, label: 'Community Tax Certificate (CTC)', status: 'Pending' },
];

const nextStatus = (status) => {
  if (status === 'Pending') return 'Verified';
  if (status === 'Verified') return 'Not Needed';
  return 'Pending';
};

const iconForStatus = (status) => {
  if (status === 'Verified' || status === 'Not Needed') {
    return <CheckSquare size={16} className="text-[hsl(var(--color-status-verified))] shrink-0" />;
  }
  return <XSquare size={16} className="text-border shrink-0" />;
};

const SplitScreenVerifier = () => {
  const navigate = useNavigate();
  const { appNo } = useParams();
  const addToast = useUIStore((s) => s.addToast);

  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
  const [remarks, setRemarks] = useState('');
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  const canVerify = useMemo(
    () => checklist.every((item) => item.status === 'Verified' || item.status === 'Not Needed'),
    [checklist]
  );
  const canReturn = remarks.trim().length > 0;

  const handleToggleStatus = (requirementId) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.requirementId === requirementId
          ? { ...item, status: nextStatus(item.status) }
          : item
      )
    );
  };

  const handleVerify = async () => {
    if (!appNo) {
      addToast({ message: 'Missing application number in route.', type: TOAST_TYPE.ERROR });
      return;
    }
    if (!canVerify) {
      addToast({
        message: 'Set all requirements to Verified or Not Needed before verifying.',
        type: TOAST_TYPE.WARNING,
      });
      return;
    }

    setIsSubmittingVerify(true);
    try {
      await apiClient.put(API_ENDPOINTS.BPLO_VERIFY(appNo), {
        checklist: checklist.map((item) => ({
          requirementId: item.requirementId,
          status: item.status,
          remarks: null,
        })),
      });

      addToast({
        message: `Application ${appNo} verified successfully.`,
        type: TOAST_TYPE.SUCCESS,
      });
      navigate(ROUTES.BPLO_DASHBOARD);
    } catch (err) {
      addToast({
        message: err.message || 'Failed to verify application.',
        type: TOAST_TYPE.ERROR,
      });
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  const handleReturn = async () => {
    if (!appNo) {
      addToast({ message: 'Missing application number in route.', type: TOAST_TYPE.ERROR });
      return;
    }
    if (!canReturn) {
      addToast({
        message: 'Remarks are required before returning an application.',
        type: TOAST_TYPE.WARNING,
      });
      return;
    }

    setIsSubmittingReturn(true);
    try {
      await apiClient.put(API_ENDPOINTS.BPLO_RETURN(appNo), { remarks: remarks.trim() });
      addToast({
        message: `Application ${appNo} returned to applicant.`,
        type: TOAST_TYPE.SUCCESS,
      });
      navigate(ROUTES.BPLO_DASHBOARD);
    } catch (err) {
      addToast({
        message: err.message || 'Failed to return application.',
        type: TOAST_TYPE.ERROR,
      });
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link to={ROUTES.BPLO_DASHBOARD} className="flex items-center gap-1 text-sm text-accent hover:opacity-80 transition-opacity">
          <ChevronLeft size={16} /> Dashboard
        </Link>
        <span className="text-[hsl(var(--color-text-muted))] text-sm">/</span>
        <span className="text-sm text-[hsl(var(--color-text-muted))]">
          Verify {appNo || 'Select an application'}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[hsl(var(--color-text))]">Document Verification</h1>
        <Badge status={APP_STATUS.UNDER_REVIEW} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                Viewer integration (pre-signed file URLs) is next.
                <br />
                Checklist + BPLO actions are already wired.
              </p>
            </div>
          </Card.Body>
        </Card>

        <div className="flex flex-col gap-4">
          <Card padding="none">
            <Card.Header>
              <p className="text-sm font-semibold text-[hsl(var(--color-text))]">Required Documents</p>
            </Card.Header>
            <Card.Body>
              <div className="flex flex-col gap-2">
                {checklist.map((item) => (
                  <button
                    type="button"
                    key={item.requirementId}
                    onClick={() => handleToggleStatus(item.requirementId)}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-surface-tint transition-colors text-left"
                  >
                    <span className="flex items-center gap-3">
                      {iconForStatus(item.status)}
                      <span className="text-sm text-[hsl(var(--color-text))]">
                        {item.label}
                      </span>
                    </span>
                    <span className="text-xs text-[hsl(var(--color-text-muted))]">
                      {item.status}
                    </span>
                  </button>
                ))}
              </div>
            </Card.Body>
          </Card>

          <Card variant="tinted" padding="md">
            <div className="flex flex-col gap-3">
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                placeholder="Required when returning application: explain missing/incorrect documents."
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-[hsl(var(--color-text))] outline-none focus:ring-2 focus:ring-accent"
              />

              <Button
                variant="primary"
                fullWidth
                leftIcon={<CheckSquare size={16} />}
                onClick={handleVerify}
                isLoading={isSubmittingVerify}
                disabled={!appNo || !canVerify}
              >
                Verify Application
              </Button>
              <Button
                variant="danger"
                fullWidth
                leftIcon={<XSquare size={16} />}
                onClick={handleReturn}
                isLoading={isSubmittingReturn}
                disabled={!appNo || !canReturn}
              >
                Return with Remarks
              </Button>
              <p className="text-xs text-[hsl(var(--color-text-muted))] text-center mt-1">
                Tip: click a document row to cycle status (Pending → Verified → Not Needed).
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SplitScreenVerifier;
