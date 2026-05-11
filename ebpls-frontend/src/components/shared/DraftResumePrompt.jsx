// src/components/shared/DraftResumePrompt.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileClock, Play, Trash2, X } from 'lucide-react';
import useApplicationStore from '../../store/applicationStore';
import { ROUTES, API_ENDPOINTS } from '../../utils/constants';
import apiClient from '../../utils/apiClient';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { AlertTriangle } from 'lucide-react';

/**
 * A modal prompt that appears if a user logs in and the backend 
 * detects an unfinished application draft.
 * 
 * @param {boolean} isOpen - Controls visibility
 * @param {Function} onClose - Function to close the modal without taking action
 */
const DraftResumePrompt = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  
  // Get draft metadata from Zustand store
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

  // Format the last saved date cleanly
  const formattedDate = lastSavedAt 
    ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastSavedAt))
    : 'a previous session';

   return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Incomplete Draft Found"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={handleDiscardClick}
              leftIcon={<Trash2 size={16} />}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              Discard Draft
            </Button>
            
            <Button
              variant="primary"
              onClick={handleResume}
              leftIcon={<Play size={16} fill="currentColor" />}
            >
              Resume Application
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[hsl(var(--color-text,0,0%,10%))] leading-relaxed">
            You have an unfinished business permit application from <span className="font-semibold">{formattedDate}</span>. 
          </p>
          
          <div className="p-4 bg-[hsl(var(--color-surface-raised,0,0%,96%))] border border-[hsl(var(--color-border,0,0%,90%))] rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[hsl(var(--color-text-muted,0,0%,40%))] uppercase">Progress</span>
              <span className="text-xs font-bold text-accent">Step {current_step} of 5</span>
            </div>
            <div className="w-full h-2 bg-[hsl(var(--color-border,0,0%,85%))] rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-accent transition-all"
                style={{ width: `${(current_step / 5) * 100}%` }}
              />
            </div>
          </div>
          
          <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,40%))]">
            Would you like to resume where you left off, or discard this draft and start a new application?
          </p>
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
              leftIcon={<Trash2 size={16} />}
            >
              Discard
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-4">
          <div className="p-2 bg-red-100 text-red-600 rounded-full shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-[hsl(var(--color-text))]">
              Are you sure you want to discard your saved progress?
            </p>
            <p className="text-xs text-[hsl(var(--color-text-muted))] leading-relaxed">
              This action cannot be undone. All information you've entered in the current draft will be permanently deleted.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DraftResumePrompt;