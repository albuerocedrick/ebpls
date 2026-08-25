// src/components/shared/DraftResumePrompt.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Trash2, AlertTriangle, FileText } from 'lucide-react';
import useApplicationStore from '../../store/applicationStore';
import { ROUTES, API_ENDPOINTS } from '../../utils/constants';
import apiClient from '../../utils/apiClient';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const DraftResumePrompt = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const current_step = useApplicationStore((state) => state.current_step);
  const lastSavedAt = useApplicationStore((state) => state.lastSavedAt);
  const resetForm = useApplicationStore((state) => state.resetForm);

  const [showConfirmDiscard, setShowConfirmDiscard] = React.useState(false);
  const [isDiscarding, setIsDiscarding] = React.useState(false);

  if (!isOpen) return null;

  const handleResume = () => {
    onClose();
    navigate(ROUTES?.APPLICANT_UAF || '/applicant/uaf');
  };

  const handleDiscardClick = () => {
    setShowConfirmDiscard(true);
  };

  const confirmDiscard = async () => {
    setIsDiscarding(true);
    try {
      await apiClient.delete(API_ENDPOINTS.APPLICATIONS_DRAFTS);
      resetForm();
      setShowConfirmDiscard(false);
      onClose();
      navigate(ROUTES?.APPLICANT_UAF || '/applicant/uaf');
    } catch (error) {
      console.error('[DraftResumePrompt] Failed to discard draft:', error.message);
      alert('Failed to discard draft. Please try again.');
    } finally {
      setIsDiscarding(false);
    }
  };

  const formattedDate = lastSavedAt
    ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastSavedAt))
    : 'a previous session';

  const progressPercent = Math.round((current_step / 5) * 100);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Incomplete draft found"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={handleDiscardClick}
              leftIcon={<Trash2 size={15} />}
            >
              Discard draft
            </Button>
            <Button
              variant="primary"
              onClick={handleResume}
              leftIcon={<Play size={15} fill="currentColor" />}
            >
              Resume application
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {/* Icon + message */}
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
              <FileText size={18} className="text-zinc-600" />
            </div>
            <div>
              <p className="text-sm leading-relaxed text-zinc-700">
                You have an unfinished business permit application from{' '}
                <span className="font-medium text-zinc-900">{formattedDate}</span>.
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                Resume where you left off, or discard and start fresh.
              </p>
            </div>
          </div>

          {/* Progress card */}
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">Progress</span>
              <span className="font-mono text-[11px] text-zinc-900 tabular-nums">
                {progressPercent}% — step {current_step} of 5
              </span>
            </div>
            <div className="h-px w-full overflow-hidden bg-zinc-200">
              <div
                className="h-full bg-zinc-900 transition-all duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Discard */}
      <Modal
        isOpen={showConfirmDiscard}
        onClose={() => setShowConfirmDiscard(false)}
        title="Discard draft?"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowConfirmDiscard(false)}
              disabled={isDiscarding}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDiscard}
              isLoading={isDiscarding}
              leftIcon={<Trash2 size={15} />}
            >
              Discard permanently
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
            <AlertTriangle size={18} className="text-zinc-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">
              Are you sure you want to discard your saved progress?
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
              This action cannot be undone. All information you&apos;ve entered will be permanently deleted.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DraftResumePrompt;
