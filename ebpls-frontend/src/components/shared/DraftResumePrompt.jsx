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

  const draft_id = useApplicationStore((state) => state.draft_id);
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
        title="Incomplete Draft Found"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <Button
              variant="ghost"
              onClick={handleDiscardClick}
              leftIcon={<Trash2 size={15} />}
              className="!text-red-600 hover:!bg-red-50"
            >
              Discard Draft
            </Button>
            <Button
              variant="primary"
              onClick={handleResume}
              leftIcon={<Play size={15} fill="currentColor" />}
            >
              Resume Application
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {/* Icon + message */}
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
              <FileText size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-700 leading-relaxed">
                You have an unfinished business permit application from <span className="font-semibold text-gray-900">{formattedDate}</span>.
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                Resume where you left off, or discard and start fresh.
              </p>
            </div>
          </div>

          {/* Progress card */}
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</span>
              <span className="text-xs font-bold text-gray-900">{progressPercent}% — Step {current_step} of 5</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-500"
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
        title="Discard Draft?"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
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
              Discard Permanently
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Are you sure you want to discard your saved progress?
            </p>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              This action cannot be undone. All information you've entered will be permanently deleted.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DraftResumePrompt;
