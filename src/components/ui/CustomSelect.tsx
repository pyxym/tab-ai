import React, { useEffect, useRef, useState } from 'react';
import type { Category } from '../../types/category';
import { getColorHex } from '../../utils/colorUtils';

interface CustomSelectProps {
  value: string;
  options: Category[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ value, options, onChange, disabled, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update parent z-index when dropdown opens
  useEffect(() => {
    if (dropdownRef.current) {
      const parentCard = dropdownRef.current.closest('.glass-card');
      if (parentCard) {
        if (isOpen) {
          (parentCard as HTMLElement).style.zIndex = '10';
        } else {
          (parentCard as HTMLElement).style.zIndex = '';
        }
      }
    }
  }, [isOpen]);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Selected value display */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="px-2 py-1 text-xs glass-card border-none outline-none focus:ring-2 focus:ring-purple-500/50 min-w-[100px] glass-text flex items-center gap-2 w-full justify-between"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: getColorHex(selectedOption?.color || 'grey') }}
          />
          <span className="truncate">{selectedOption?.name || 'Select...'}</span>
        </div>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={`w-full px-3 py-2 text-sm text-white hover:bg-purple-500/30 transition-colors flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg ${
                option.id === value ? 'bg-purple-500/40' : ''
              }`}
            >
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getColorHex(option.color) }} />
              <span className="truncate flex-1 text-left">{option.name}</span>
              {option.id === value && <span className="ml-auto text-purple-400 font-bold">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
