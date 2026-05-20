/**
 * Button.jsx
 * Base button component with design-system variants.
 *
 * Variants: primary | secondary | outline | ghost | danger
 * Sizes:    sm | md | lg
 *
 * @policy  All colors and radii are from CSS tokens — no inline magic numbers.
 * @policy  CSS transitions applied to color, bg, border, shadow, and transform.
 * @policy  Lucide icons only. Pass `leftIcon` or `rightIcon` as a Lucide element.
 * @policy  Never nest a Button inside another interactive surface without
 *          changing the variant (e.g., use `ghost` inside cards).
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

// =========================================
// Style Maps — All values pull from :root tokens via Tailwind
// =========================================

const VARIANT_CLASSES = {
  primary: [
    'bg-gray-900 text-white',
    'hover:bg-gray-800',
    'border border-transparent',
    'focus-visible:ring-4 focus-visible:ring-gray-200 focus-visible:ring-offset-0',
    'shadow-sm hover:shadow-md hover:shadow-gray-900/10',
  ].join(' '),

  secondary: [
    'bg-white text-gray-700',
    'hover:bg-gray-50 hover:border-gray-300',
    'border border-gray-200',
    'focus-visible:ring-4 focus-visible:ring-gray-100',
    'shadow-sm',
  ].join(' '),

  outline: [
    'bg-transparent text-gray-700',
    'hover:bg-gray-50',
    'border border-gray-200',
    'focus-visible:ring-4 focus-visible:ring-gray-100',
  ].join(' '),

  ghost: [
    'bg-transparent text-gray-500',
    'hover:bg-gray-100 hover:text-gray-900',
    'border border-transparent',
  ].join(' '),

  danger: [
    'bg-red-600 text-white',
    'hover:bg-red-700',
    'border border-transparent',
    'focus-visible:ring-4 focus-visible:ring-red-100',
    'shadow-sm',
  ].join(' '),
};

const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

// =========================================
// Component
// =========================================

/**
 * @param {object}  props
 * @param {'primary'|'secondary'|'outline'|'ghost'|'danger'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean}  [props.isLoading=false]
 * @param {boolean}  [props.disabled=false]
 * @param {boolean}  [props.fullWidth=false]
 * @param {React.ReactElement} [props.leftIcon]   - Lucide icon element
 * @param {React.ReactElement} [props.rightIcon]  - Lucide icon element
 * @param {string}   [props.className]            - Additional classes
 * @param {React.ReactNode} props.children
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  children,
  ...props
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      className={[
        // Base structure
        'inline-flex items-center justify-center font-medium rounded-2xl',
        'select-none whitespace-nowrap',
        // Variant & size
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        // Animation — per frontend-developer.md minimum animation policy
        'transition-[color,background-color,border-color,box-shadow,transform]',
        'duration-200 ease-in-out',
        'active:scale-95',
        // Full width
        fullWidth ? 'w-full' : '',
        // Disabled state
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {/* Loading spinner replaces left icon */}
      {isLoading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}

      {children}

      {!isLoading && rightIcon && (
        <span className="shrink-0">{rightIcon}</span>
      )}
    </button>
  );
};

export default Button;
