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

import { Loader2 } from 'lucide-react';

// =========================================
// Style Maps — All values pull from :root tokens via Tailwind
// =========================================

const VARIANT_CLASSES = {
  primary: [
    'bg-zinc-900 text-white',
    'hover:bg-zinc-800',
    'border border-transparent',
    'focus-visible:ring-2 focus-visible:ring-zinc-900/15 focus-visible:ring-offset-0',
    'shadow-sm hover:shadow-md hover:shadow-zinc-900/10',
  ].join(' '),

  secondary: [
    'bg-white text-zinc-800',
    'hover:bg-zinc-50 hover:border-zinc-300',
    'border border-zinc-200',
    'focus-visible:ring-2 focus-visible:ring-zinc-900/10',
    'shadow-sm',
  ].join(' '),

  outline: [
    'bg-transparent text-zinc-700',
    'hover:bg-zinc-50 hover:border-zinc-300',
    'border border-zinc-200',
    'focus-visible:ring-2 focus-visible:ring-zinc-900/10',
  ].join(' '),

  ghost: [
    'bg-transparent text-zinc-500',
    'hover:bg-zinc-100 hover:text-zinc-900',
    'border border-transparent',
  ].join(' '),

  danger: [
    'bg-red-600 text-white',
    'hover:bg-red-700',
    'border border-transparent',
    'focus-visible:ring-2 focus-visible:ring-red-600/20',
    'shadow-sm',
  ].join(' '),
};

const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-3 text-sm gap-2',
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
        // Base structure. `rounded-md` matches the landing page's button
        // radius; the previous `rounded-2xl` read as a different design system.
        'inline-flex items-center justify-center font-medium rounded-md',
        'select-none whitespace-nowrap',
        // Variant & size
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        // Animation — per frontend-developer.md minimum animation policy
        'transition-[color,background-color,border-color,box-shadow,transform]',
        'duration-200 ease-out',
        'active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
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
