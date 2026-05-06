/**
 * Card.jsx
 * Reusable surface container with enforced design system rules.
 *
 * @policy  FORBIDDEN: Never nest a Card inside another Card with similar backgrounds.
 *          Use `variant="raised"` on the inner element for a distinctly different surface.
 * @policy  Borders must be visible — border color is at least 10% darker than background.
 * @policy  Shadow at rest uses --shadow-base. Hover uses --shadow-hover.
 * @policy  Border Radius Nesting Rule: if you place inner content with rounded corners,
 *          the Card's padding must equal the difference in radii.
 *          Example: Card uses radius-lg (1rem), inner uses radius-md (0.5rem), so padding >= 0.5rem.
 */

import React from 'react';

// =========================================
// Variant Definitions
// =========================================

const VARIANT_CLASSES = {
  // Default white card on the neutral canvas
  default: [
    'bg-[hsl(var(--color-surface-raised))]',
    'border border-border',
  ].join(' '),

  // Slightly tinted — use as the "inner" element inside a default card
  // This is the correct way to create visual hierarchy without double-layer identical bg.
  tinted: [
    'bg-surface-tint',
    'border border-border',
  ].join(' '),

  // No border, no bg — transparent wrapper for grouping with spacing only
  ghost: [
    'bg-transparent border-none',
  ].join(' '),
};

const PADDING_CLASSES = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

// =========================================
// Component
// =========================================

/**
 * @param {object}  props
 * @param {'default'|'tinted'|'ghost'} [props.variant='default']
 * @param {'none'|'sm'|'md'|'lg'}     [props.padding='md']
 * @param {boolean} [props.hoverable=false]  - Enables shadow lift on hover
 * @param {boolean} [props.fullHeight=false]
 * @param {string}  [props.className]
 * @param {React.ReactNode} props.children
 */
const Card = ({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  fullHeight = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={[
        'rounded-lg overflow-hidden',
        VARIANT_CLASSES[variant],
        PADDING_CLASSES[padding],
        // Shadow — base at rest; hover lift if hoverable
        variant !== 'ghost' && 'shadow-sm',
        hoverable && [
          'cursor-pointer',
          'transition-[box-shadow,transform] duration-200 ease-in-out',
          'hover:shadow-md hover:-translate-y-0.5',
        ].join(' '),
        fullHeight && 'h-full',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  );
};

// =========================================
// Sub-components for structural sections
// =========================================

/**
 * Card.Header — Top section with border separator
 */
Card.Header = function CardHeader({ className = '', children, ...props }) {
  return (
    <div
      className={`px-4 py-3 border-b border-border ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Card.Body — Primary content area
 */
Card.Body = function CardBody({ className = '', children, ...props }) {
  return (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * Card.Footer — Bottom section with border separator
 */
Card.Footer = function CardFooter({ className = '', children, ...props }) {
  return (
    <div
      className={`px-4 py-3 border-t border-border bg-surface-tint ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
