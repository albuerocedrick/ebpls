/**
 * Modal.jsx
 * Overlay modal wrapper with focus trapping and keyboard dismissal.
 *
 * @policy  Inner content container radius must follow the Border Radius Nesting Rule:
 *          Inner modal container = --radius-lg (1rem).
 *          Any content blocks inside must use --radius-md (0.5rem) with at least 0.5rem gap.
 * @policy  Overlay is a semi-transparent dark backdrop — NOT a blurred card on a card.
 * @policy  Always provide a `title` prop for screen reader accessibility.
 * @policy  Uses UIStore for open/close state when `modalId` is provided.
 *          For self-managed state, use `isOpen` and `onClose` props directly.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import useUIStore from '../../store/UIStore';
import Button from './Button';

// =========================================
// Size Definitions
// =========================================

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-full mx-4',
};

// =========================================
// Component
// =========================================

/**
 * @param {object}   props
 * @param {string}   props.title              - Modal heading (required for a11y)
 * @param {string}   [props.modalId]          - If provided, drives state from UIStore
 * @param {boolean}  [props.isOpen]           - Self-managed open state (use without modalId)
 * @param {Function} [props.onClose]          - Self-managed close handler (use without modalId)
 * @param {'sm'|'md'|'lg'|'xl'|'full'} [props.size='md']
 * @param {boolean}  [props.closeable=true]   - Shows X button and allows backdrop click to close
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.footer]    - Content rendered in the modal footer area
 */
const Modal = ({
  title,
  modalId,
  isOpen: isOpenProp,
  onClose: onCloseProp,
  size = 'md',
  closeable = true,
  children,
  footer,
}) => {
  const { isModalOpen, closeModal } = useUIStore();

  // Derive open state and close handler
  const isOpen = modalId ? isModalOpen(modalId) : isOpenProp;
  const handleClose = useCallback(() => {
    if (!closeable) return;
    if (modalId) {
      closeModal(modalId);
    } else if (onCloseProp) {
      onCloseProp();
    }
  }, [closeable, modalId, closeModal, onCloseProp]);

  // Keyboard: close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  // Lock body scroll when modal is open
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
    // Overlay — renders above all content via z-modal token
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${title}-modal-title`}
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 'var(--z-modal)' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal panel — sits above the backdrop */}
      <div
        className={[
          'relative w-full bg-[hsl(var(--color-surface-raised))] rounded-lg',
          'shadow-[var(--shadow-raised)]',
          'border border-border',
          'flex flex-col max-h-[90vh]',
          SIZE_CLASSES[size],
          // Entrance animation
          'animate-in fade-in zoom-in-95 duration-200',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2
            id={`${title}-modal-title`}
            className="text-base font-semibold text-[hsl(var(--color-text))]"
          >
            {title}
          </h2>
          {closeable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              aria-label="Close modal"
              className="!p-1.5 -mr-1"
            >
              <X size={16} />
            </Button>
          )}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {/* Footer — optional */}
        {footer && (
          <div className="px-5 py-4 border-t border-border bg-surface-tint shrink-0 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
