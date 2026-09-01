/**
 * LogoutConfirmModal.jsx
 * A polished, animated confirmation dialog for the logout action using Tailwind.
 *
 * Props:
 *   isOpen    — boolean, controls visibility
 *   onConfirm — called when user clicks "Yes, Sign Out"
 *   onCancel  — called when user clicks "Cancel" or the backdrop
 */

import { useEffect } from 'react';
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
        className="relative w-full max-w-[380px] rounded-lg bg-white p-7 text-left shadow-2xl animate-[slideUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3.5 right-3.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors duration-200 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
          aria-label="Close dialog"
        >
          <X size={15} />
        </button>

        {/* Icon */}
        <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700">
          <ShieldAlert size={20} strokeWidth={1.75} />
        </div>

        {/* Title */}
        <span className="block font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
          Confirm
        </span>
        <h2 id="logout-modal-title" className="mt-3 text-lg font-semibold tracking-tight text-zinc-900">
          Sign out?
        </h2>

        {/* Body */}
        <p className="mt-2 mb-7 text-sm leading-relaxed text-zinc-600">
          You are about to sign out of your session. Any unsaved changes may
          be lost.
        </p>

        {/* Action buttons */}
        <div className="flex justify-center gap-3">
          <button
            id="logout-cancel-btn"
            onClick={onCancel}
            className="flex-1 cursor-pointer rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-colors duration-200 hover:border-zinc-400 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
          >
            Cancel
          </button>
          <button
            id="logout-confirm-btn"
            onClick={onConfirm}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none"
          >
            <LogOut size={15} strokeWidth={2} />
            Sign out
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
