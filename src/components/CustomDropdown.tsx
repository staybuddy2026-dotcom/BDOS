'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CustomDropdown({ options, value, onChange, placeholder = 'Select...' }: CustomDropdownProps) {
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
        className="w-full flex justify-between items-center rounded-[8px] px-3.5 py-2.5 text-[0.86rem] font-semibold outline-none cursor-pointer transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          background: isOpen ? '#ffffff' : '#f8fafc',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: isOpen ? '#6366f1' : '#cbd5e1',
          color: selectedOption ? '#0f172a' : '#64748b',
          boxShadow: isOpen ? '0 4px 12px rgba(99, 102, 241, 0.15)' : 'none',
          transform: isOpen ? 'translateY(-1px)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.borderColor = '#94a3b8';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }
        }}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform duration-300 ease-in-out"
          style={{
            color: isOpen ? '#6366f1' : '#64748b',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      <div
        className="absolute left-0 right-0 origin-top rounded-[10px] border border-[#e2e8f0] bg-white p-1.5 z-50 max-h-[260px] overflow-y-auto"
        style={{
          top: 'calc(100% + 8px)',
          boxShadow: isOpen ? '0 16px 40px rgba(15, 23, 42, 0.14)' : '0 10px 30px rgba(15, 23, 42, 0.1)',
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.97)',
          transition: isOpen
            ? 'opacity 0.32s cubic-bezier(0.16, 1, 0.3, 1), transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.32s ease, visibility 0.32s'
            : 'opacity 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease, visibility 0.18s',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {options.map((opt, idx) => {
          const isSelected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-[0.84rem] border-none cursor-pointer text-left transition-[background,color,opacity,transform] duration-150"
              style={{
                background: isSelected ? '#e0e7ff' : 'transparent',
                color: isSelected ? '#4338ca' : '#334155',
                fontWeight: isSelected ? 700 : 500,
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? 'translateY(0)' : 'translateY(-4px)',
                transitionDuration: '0.28s',
                transitionDelay: isOpen ? `${Math.min(idx, 8) * 0.02}s` : '0s',
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
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">{opt.label}</span>
              {isSelected && <Check size={14} className="shrink-0 text-[#4f46e5]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
