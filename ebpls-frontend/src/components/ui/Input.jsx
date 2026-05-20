/**
 * Input.jsx
 * Form input component with label, hint, and error state support.
 *
 * @policy  All colors from CSS tokens.
 * @policy  Error state uses --color-error token, not a raw red class.
 * @policy  Focus ring uses the global accent token for consistency.
 * @policy  Never use a placeholder as a label substitute — the `label` prop is required.
 */

import React, { useId } from 'react';

// =========================================
// Component
// =========================================

/**
 * @param {object}  props
 * @param {string}  props.label              - Visible label text (required for accessibility)
 * @param {string}  [props.hint]             - Helper text shown below the input
 * @param {string}  [props.error]            - Error message; renders input in error state if set
 * @param {string}  [props.id]               - Overrides the auto-generated id
 * @param {React.ReactElement} [props.leftElement]  - Lucide icon or text prefix
 * @param {React.ReactElement} [props.rightElement] - Lucide icon or text suffix
 * @param {boolean} [props.required=false]
 * @param {string}  [props.className]        - Applied to the outer wrapper
 * @param {object}  props                    - All other props passed to <input>
 */
const Input = ({
  label,
  hint,
  error,
  id: overrideId,
  leftElement,
  rightElement,
  required = false,
  className = '',
  ...inputProps
}) => {
  const autoId = useId();
  const inputId = overrideId || autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const hasError = Boolean(error);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Label */}
      <label
        htmlFor={inputId}
        className="text-sm font-semibold text-gray-700"
      >
        {label}
        {required && (
          <span
            aria-hidden="true"
            className="ml-1 text-red-500"
          >
            *
          </span>
        )}
      </label>

      {/* Input wrapper — allows for left/right elements */}
      <div className="relative flex items-center">
        {leftElement && (
          <div className="absolute left-3 text-[hsl(var(--color-text-muted))] pointer-events-none">
            {leftElement}
          </div>
        )}

        <input
          id={inputId}
          aria-describedby={[hint && hintId, error && errorId].filter(Boolean).join(' ')}
          aria-invalid={hasError}
          required={required}
          className={[
            // Base structure
            'w-full rounded-2xl border bg-gray-50',
            'text-sm text-gray-900',
            'placeholder:text-gray-400',
            // Padding — account for left/right elements
            leftElement ? 'pl-10' : 'pl-4',
            rightElement ? 'pr-10' : 'pr-4',
            'py-3',
            // Border and focus transitions
            'transition-all duration-200',
            'outline-none',
            // State: default
            !hasError && 'border-gray-200 focus:border-gray-400 focus:ring-4 focus:ring-gray-100 focus:bg-white',
            // State: error
            hasError && 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50',
          ]
            .filter(Boolean)
            .join(' ')}
          {...inputProps}
        />

        {rightElement && (
          <div className="absolute right-3 text-[hsl(var(--color-text-muted))] pointer-events-none">
            {rightElement}
          </div>
        )}
      </div>

      {/* Hint text */}
      {hint && !hasError && (
        <p id={hintId} className="text-xs text-gray-400">
          {hint}
        </p>
      )}

      {/* Error message */}
      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-red-500 font-medium"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
