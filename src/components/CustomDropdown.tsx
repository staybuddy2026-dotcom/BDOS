'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  group?: string;
  count?: number;
  icon?: ReactNode;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  align?: 'left' | 'right';
  buttonHeight?: number | string;
}

export function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  align = 'left',
  buttonHeight = 42,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center rounded-[8px] px-3 text-[0.84rem] font-semibold outline-none cursor-pointer transition-all duration-[200ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          height: buttonHeight,
          background: isOpen ? '#ffffff' : selectedOption && value ? '#eef2ff' : '#ffffff',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: isOpen ? '#6366f1' : selectedOption && value ? '#818cf8' : '#cbd5e1',
          color: selectedOption ? '#0f172a' : '#64748b',
          boxShadow: isOpen ? '0 4px 14px rgba(99, 102, 241, 0.16)' : 'none',
          transform: isOpen ? 'translateY(-1px)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!isOpen && (!selectedOption || !value)) {
            e.currentTarget.style.borderColor = '#94a3b8';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen && (!selectedOption || !value)) {
            e.currentTarget.style.borderColor = '#cbd5e1';
          }
        }}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-1.5 min-w-0 pr-1">
          {selectedOption?.icon && <span className="shrink-0 text-slate-500">{selectedOption.icon}</span>}
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={15}
          className="shrink-0 transition-transform duration-300 ease-in-out ml-1"
          style={{
            color: isOpen ? '#6366f1' : '#64748b',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      <div
        className="absolute origin-top rounded-[10px] border border-[#e2e8f0] bg-white p-1.5 z-50 max-h-[300px] overflow-y-auto"
        style={{
          top: 'calc(100% + 6px)',
          [align === 'right' ? 'right' : 'left']: 0,
          minWidth: 'max(100%, 210px)',
          maxWidth: '290px',
          boxShadow: isOpen ? '0 16px 40px rgba(15, 23, 42, 0.14)' : '0 10px 30px rgba(15, 23, 42, 0.1)',
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
          transition: isOpen
            ? 'opacity 0.24s cubic-bezier(0.16, 1, 0.3, 1), transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.24s ease, visibility 0.24s'
            : 'opacity 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease, visibility 0.16s',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {options.map((opt, idx) => {
          const isSelected = opt.value === value;
          const prevGroup = idx > 0 ? options[idx - 1].group : undefined;
          const isNewGroup = opt.group && opt.group !== prevGroup;

          return (
            <div key={opt.value || `opt-${idx}`}>
              {isNewGroup && (
                <div
                  className="px-3 pt-2 pb-1 text-[0.68rem] font-bold uppercase tracking-wider select-none"
                  style={{ color: '#94a3b8' }}
                >
                  {opt.group}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-[0.83rem] border-none cursor-pointer text-left transition-[background,color] duration-150"
                style={{
                  background: isSelected ? '#e0e7ff' : 'transparent',
                  color: isSelected ? '#4338ca' : '#334155',
                  fontWeight: isSelected ? 700 : 500,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.color = '#0f172a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#334155';
                  }
                }}
              >
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  {opt.icon && <span className="shrink-0 text-slate-400">{opt.icon}</span>}
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">{opt.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                  {opt.count !== undefined && (
                    <span
                      className="text-[0.7rem] px-1.5 py-0.2 rounded-full font-semibold"
                      style={{
                        background: isSelected ? '#c7d2fe' : '#f1f5f9',
                        color: isSelected ? '#3730a3' : '#64748b',
                      }}
                    >
                      {opt.count}
                    </span>
                  )}
                  {isSelected && <Check size={14} className="shrink-0 text-[#4f46e5]" />}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
