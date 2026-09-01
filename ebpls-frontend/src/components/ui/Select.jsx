/**
 * Select.jsx
 * Fully custom dropdown component — no native <select> rendering.
 * Renders a styled trigger button and a floating options panel.
 * Neutral zinc tokens with `rounded-md` controls, matching the landing page.
 */

import React from 'react';
import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * @param {object}  props
 * @param {string}  [props.label]
 * @param {string}  [props.error]
 * @param {string}  [props.hint]
 * @param {boolean} [props.required]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.fullWidth=true]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string}  [props.placeholder='Select...']
 * @param {string}  props.value - Currently selected value
 * @param {Function} props.onChange - Called with synthetic event { target: { name, value } }
 * @param {string}  [props.name]
 * @param {string}  [props.className]
 * @param {Array}   props.children - <option> elements (parsed for value/label)
 */
const Select = ({
  label,
  error,
  hint,
  required = false,
  disabled = false,
  fullWidth = true,
  size = 'md',
  placeholder = 'Select...',
  value,
  onChange,
  name,
  id: propId,
  className = '',
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const autoId = useId();
  const selectId = propId || autoId;
  const hasError = Boolean(error);

  // Parse children (<option> elements) into an array of { value, label }
  const options = React.Children.toArray(children)
    .filter((child) => child.type === 'option')
    .map((child) => ({
      value: child.props.value ?? '',
      label: child.props.children || child.props.value || '',
      disabled: child.props.disabled || false,
    }));

  // Find current label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const handleSelect = (optValue) => {
    if (onChange) {
      // Mimic native select onChange event shape
      onChange({ target: { name: name || '', value: optValue } });
    }
    setIsOpen(false);
  };

  const sizeClasses = {
    sm: 'py-2 pl-3 pr-8 text-sm',
    md: 'py-2.5 pl-3 pr-9 text-sm',
    lg: 'py-3 pl-4 pr-9 text-base',
  };

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''} ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={selectId} className="font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">
          {label}
          {required && <span className="ml-1 text-zinc-400">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Trigger */}
        <button
          type="button"
          id={selectId}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={[
            'w-full text-left rounded-md border font-medium',
            'transition-colors duration-200 ease-out cursor-pointer motion-reduce:transition-none',
            'outline-none',
            sizeClasses[size],
            isOpen ? 'bg-white border-zinc-900' : 'bg-white border-zinc-200',
            !hasError && !isOpen && 'hover:border-zinc-300',
            hasError && 'border-red-400',
            disabled && 'opacity-60 cursor-not-allowed',
            value ? 'text-zinc-900' : 'text-zinc-400',
          ].filter(Boolean).join(' ')}
        >
          <span className="block truncate">{displayLabel}</span>
          <ChevronDown
            size={16}
            className={[
              'absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-transform duration-200 motion-reduce:transition-none',
              isOpen ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div
            className={[
              'absolute z-50 mt-1.5 w-full bg-white border border-zinc-200 rounded-md',
              'shadow-[0_16px_32px_-16px_rgba(24,24,27,0.35)]',
              'py-1 max-h-60 overflow-y-auto',
              'animate-in fade-in slide-in-from-top-1 duration-150',
            ].join(' ')}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => handleSelect(opt.value)}
                  className={[
                    'w-full text-left px-3 py-2 text-sm font-medium transition-colors duration-150 flex items-center justify-between gap-2',
                    'mx-1 rounded-sm',
                    'first:mt-0 last:mb-0',
                    isSelected
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900',
                    opt.disabled && 'opacity-40 cursor-not-allowed',
                  ].filter(Boolean).join(' ')}
                  style={{ width: 'calc(100% - 8px)' }}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={14} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {hint && !hasError && (
        <p className="text-xs leading-relaxed text-zinc-500">{hint}</p>
      )}
      {hasError && (
        <p className="text-xs font-medium text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Select;
