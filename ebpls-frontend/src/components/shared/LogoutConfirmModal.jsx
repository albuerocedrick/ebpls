/**
 * LogoutConfirmModal.jsx
 * A polished, animated confirmation dialog for the logout action using Tailwind.
 *
 * Props:
 *   isOpen    — boolean, controls visibility
 *   onConfirm — called when user clicks "Yes, Sign Out"
 *   onCancel  — called when user clicks "Cancel" or the backdrop
 */

import React, { useEffect } from 'react';
import { LogOut, X, ShieldAlert } from 'lucide-react';

const LogoutConfirmModal = ({ isOpen, onConfirm, onCancel }) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]"
      onClick={onCancel}
      aria-modal="true"
      role="dialog"
      aria-labelledby="logout-modal-title"
    >
      {/* Panel */}
      <div
        className="relative bg-white rounded-[20px] p-8 pb-7 w-full max-w-[380px] shadow-2xl text-center animate-[slideUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3.5 right-3.5 w-[30px] h-[30px] border-none bg-gray-100 text-gray-500 rounded-full flex items-center justify-center cursor-pointer transition-colors hover:bg-gray-200 hover:text-gray-900"
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        {/* Warning icon */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-5 shadow-[0_4px_16px_rgba(180,83,9,0.18)]">
          <ShieldAlert size={28} strokeWidth={1.75} />
        </div>

        {/* Title */}
        <h2 id="logout-modal-title" className="text-xl font-bold text-gray-900 mb-2 tracking-tight">
          Sign Out?
        </h2>

        {/* Body */}
        <p className="text-sm text-gray-500 leading-relaxed mb-7">
          You are about to sign out of your session. Any unsaved changes may
          be lost. Are you sure you want to continue?
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          <button
            id="logout-cancel-btn"
            onClick={onCancel}
            className="flex-1 px-5 py-2.5 rounded-[10px] border-[1.5px] border-gray-200 bg-white text-gray-700 text-sm font-semibold cursor-pointer transition-colors hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            id="logout-confirm-btn"
            onClick={onConfirm}
            className="flex-1 px-5 py-2.5 rounded-[10px] border-none bg-gradient-to-br from-red-500 to-red-600 text-white text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(239,68,68,0.35)] hover:opacity-90 hover:-translate-y-[1px] hover:shadow-[0_6px_18px_rgba(239,68,68,0.45)] active:opacity-100 active:translate-y-0"
          >
            <LogOut size={16} strokeWidth={2} />
            Yes, Sign Out
          </button>
        </div>
      </div>
      
      {/* Inline styles for custom animations to avoid messing with tailwind config for simple one-off animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default LogoutConfirmModal;
