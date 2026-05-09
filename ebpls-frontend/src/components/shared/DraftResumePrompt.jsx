// src/components/shared/DraftResumePrompt.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileClock, Play, Trash2, X } from 'lucide-react';
import useApplicationStore from '../../store/applicationStore';
import { ROUTES } from '../../utils/constants';

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

  if (!isOpen) return null;

  const handleResume = () => {
    onClose();
    // Navigate to the wizard; Zustand already holds the resumed state
    navigate(ROUTES?.APPLICANT_UAF || '/applicant/uaf');
  };

  const handleDiscard = async () => {
    if (window.confirm("Are you sure you want to discard your saved progress? This cannot be undone.")) {
      // In Phase 3B: Add API call here to DELETE /api/applications/drafts/:draft_id
      console.log(`[Phase 3B Mock] Deleting draft ${draft_id} from database...`);
      
      // Clear local store
      resetForm();
      onClose();
      
      // Navigate to a fresh wizard
      navigate(ROUTES?.APPLICANT_UAF || '/applicant/uaf');
    }
  };

  // Format the last saved date cleanly
  const formattedDate = lastSavedAt 
    ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastSavedAt))
    : 'a previous session';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="bg-[hsl(var(--color-surface,0,0%,100%))] w-full max-w-md rounded-xl border border-[hsl(var(--color-border,0,0%,90%))] shadow-[var(--shadow-md,0_4px_6px_-1px_rgba(0,0,0,0.1))] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--color-border,0,0%,90%))] bg-[hsl(var(--color-surface-raised,0,0%,98%))]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 text-accent rounded-lg">
              <FileClock size={20} />
            </div>
            <h3 className="text-base font-bold text-[hsl(var(--color-text,0,0%,10%))]">Incomplete Draft Found</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-[hsl(var(--color-text-muted,0,0%,40%))] hover:bg-[hsl(var(--color-border,0,0%,90%))] rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-sm text-[hsl(var(--color-text,0,0%,10%))] leading-relaxed">
            You have an unfinished business permit application from <span className="font-semibold">{formattedDate}</span>. 
          </p>
          
          <div className="mt-4 p-4 bg-[hsl(var(--color-surface-raised,0,0%,96%))] border border-[hsl(var(--color-border,0,0%,90%))] rounded-lg">
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
          
          <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,40%))] mt-4">
            Would you like to resume where you left off, or discard this draft and start a new application?
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-[hsl(var(--color-border,0,0%,90%))] bg-[hsl(var(--color-surface-raised,0,0%,98%))] flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            onClick={handleDiscard}
            className="px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
          >
            <Trash2 size={16} />
            Discard Draft
          </button>
          
          <button
            onClick={handleResume}
            className="px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-accent border border-transparent rounded-lg hover:bg-accent/90 shadow-sm shadow-accent/20 transition-colors"
          >
            <Play size={16} fill="currentColor" />
            Resume Application
          </button>
        </div>

      </div>
    </div>
  );
};

export default DraftResumePrompt;