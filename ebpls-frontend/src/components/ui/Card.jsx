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

// =========================================
// Variant Definitions
// =========================================

const VARIANT_CLASSES = {
  // Default white card on the neutral canvas
  default: [
    'bg-white',
    'border border-zinc-200',
  ].join(' '),

  // Slightly tinted — use as the "inner" element inside a default card
  tinted: [
    'bg-surface',
    'border border-zinc-200',
  ].join(' '),

  // No border, no bg — transparent wrapper for grouping with spacing only
  ghost: [
    'bg-transparent border-none',
  ].join(' '),
};

const PADDING_CLASSES = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-7',
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
        // `rounded-lg` matches the landing-page cards. The former `rounded-3xl`
        // was large enough to read as a different product.
        'rounded-lg overflow-hidden',
        VARIANT_CLASSES[variant],
        PADDING_CLASSES[padding],
        // Shadow — base at rest; hover lift if hoverable
        variant !== 'ghost' && 'shadow-sm',
        hoverable && [
          'cursor-pointer',
          'transition-all duration-300 ease-out motion-reduce:transition-none',
          'hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md',
          'motion-reduce:hover:translate-y-0',
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
      className={`px-6 py-4 border-b border-zinc-200 bg-surface ${className}`}
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
    <div className={`p-6 ${className}`} {...props}>
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
      className={`px-6 py-4 border-t border-zinc-200 bg-surface shrink-0 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
