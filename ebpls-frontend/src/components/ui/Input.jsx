/**
 * Input.jsx
 * Form input component with label, hint, and error state support.
 *
 * @policy  All colors from CSS tokens.
 * @policy  Error state uses --color-error token, not a raw red class.
 * @policy  Focus is shown by darkening the border to zinc-900 rather than a
 *          wide accent ring, so the field matches the neutral public palette.
 * @policy  Never use a placeholder as a label substitute — the `label` prop is required.
 */

import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

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
  type = 'text',
  ...inputProps
}) => {
  const autoId = useId();
  const inputId = overrideId || autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const hasError = Boolean(error);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Label. Mono uppercase at a small size, matching the field labels and
          eyebrows used across the landing page. */}
      <label
        htmlFor={inputId}
        className="font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase"
      >
        {label}
        {required && (
          <span
            aria-hidden="true"
            className="ml-1 text-zinc-400"
          >
            *
          </span>
        )}
      </label>

      {/* Input wrapper — allows for left/right elements */}
      <div className="relative flex items-center">
        {leftElement && (
          <div className="absolute left-3 text-zinc-400 pointer-events-none">
            {leftElement}
          </div>
        )}

        <input
          id={inputId}
          type={inputType}
          aria-describedby={[hint && hintId, error && errorId].filter(Boolean).join(' ')}
          aria-invalid={hasError}
          required={required}
          className={[
            // Base structure
            'w-full rounded-md border bg-white',
            'text-sm text-zinc-900',
            'placeholder:text-zinc-400',
            // Padding — account for left/right elements
            leftElement ? 'pl-10' : 'pl-3.5',
            (rightElement || isPassword) ? 'pr-10' : 'pr-3.5',
            'py-2.5',
            // Border and focus transitions
            'transition-colors duration-200 ease-out motion-reduce:transition-none',
            'outline-none',
            // State: default. A border darkening on focus rather than a wide
            // ring keeps the form quiet and matches the hero's track input.
            !hasError && 'border-zinc-200 hover:border-zinc-300 focus:border-zinc-900',
            // State: error
            hasError && 'border-red-400 focus:border-red-500',
          ]
            .filter(Boolean)
            .join(' ')}
          {...inputProps}
        />

        {(rightElement || isPassword) && (
          <div className={`absolute right-3 flex items-center text-zinc-400 ${isPassword && !rightElement ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            {isPassword && !rightElement ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="hover:text-zinc-900 transition-colors duration-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            ) : (
              rightElement
            )}
          </div>
        )}
      </div>

      {/* Hint text */}
      {hint && !hasError && (
        <p id={hintId} className="text-xs leading-relaxed text-zinc-500">
          {hint}
        </p>
      )}

      {/* Error message */}
      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
