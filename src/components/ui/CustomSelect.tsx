import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Category } from '../../types/category';
import { getColorHex } from '../../utils/colorUtils';

interface CustomSelectProps {
  value: string;
  options: Category[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const CustomSelect = React.memo<CustomSelectProps>(function CustomSelect({ value, options, onChange, disabled, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const parentCardRef = useRef<HTMLElement | null>(null);

  // Memoize selected option lookup
  const selectedOption = useMemo(() => options.find((opt) => opt.id === value), [options, value]);

  // Combined effect for click outside and z-index management
  useEffect(() => {
    if (!isOpen) return;

    // Cache parent card reference
    if (!parentCardRef.current) {
      parentCardRef.current = dropdownRef.current?.closest('.glass-card') as HTMLElement;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Update z-index
    if (parentCardRef.current) {
      parentCardRef.current.style.zIndex = '100';
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (parentCardRef.current) {
        parentCardRef.current.style.zIndex = '';
      }
    };
  }, [isOpen]);

  const handleSelect = useCallback(
    (optionId: string) => {
      onChange(optionId);
      setIsOpen(false);
    },
    [onChange],
  );

  const toggleOpen = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Selected value display */}
      <button
        onClick={toggleOpen}
        disabled={disabled}
        className="px-2.5 py-1.5 text-xs glass-card border-none outline-none focus:ring-2 focus:ring-purple-500/50 min-w-[140px] glass-text flex items-center gap-2 w-full justify-between hover:bg-white/5 transition-all"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getColorHex(selectedOption?.color || 'grey') }} />
          <span className="truncate font-medium">{selectedOption?.name || 'Select...'}</span>
        </div>
        <svg
          className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu - improved visibility and clarity */}
      {isOpen && (
        <div className="absolute z-[200] mt-2 right-0 min-w-[200px] bg-gray-800/95 backdrop-blur-xl border-2 border-purple-500/50 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] max-h-80 overflow-y-auto scrollbar-thin">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={`w-full px-4 py-3 text-sm font-medium transition-all flex items-center gap-3 first:rounded-t-xl last:rounded-b-xl border-b border-white/10 last:border-b-0 ${
                option.id === value ? 'bg-purple-600/60 text-white shadow-inner' : 'text-gray-200 hover:bg-purple-500/30 hover:text-white'
              }`}
            >
              <div
                className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white/30"
                style={{ backgroundColor: getColorHex(option.color) }}
              />
              <span className="flex-1 text-left">{option.name}</span>
              {option.id === value && <span className="ml-auto text-white font-bold text-lg">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
