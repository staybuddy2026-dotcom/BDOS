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
  buttonHeight = 44,
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
  const isFiltered = Boolean(selectedOption && value && value !== 'all' && value !== '');

  return (
    <div 
      ref={dropdownRef} 
      className="relative w-full"
      style={{ zIndex: isOpen ? 100 : 1 }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center rounded-[12px] px-3.5 text-[0.84rem] font-semibold outline-none cursor-pointer transition-all duration-[200ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          height: buttonHeight,
          background: isOpen 
            ? '#ffffff' 
            : isFiltered 
              ? 'linear-gradient(135deg, rgba(238, 242, 255, 0.95), rgba(245, 243, 255, 0.95))' 
              : '#ffffff',
          borderWidth: '1.5px',
          borderStyle: 'solid',
          borderColor: isOpen 
            ? '#6366f1' 
            : isFiltered 
              ? '#818cf8' 
              : 'rgba(203, 213, 225, 0.85)',
          color: isFiltered ? '#4338ca' : '#0f172a',
          boxShadow: isOpen 
            ? '0 0 0 3px rgba(99, 102, 241, 0.16), 0 4px 14px rgba(99, 102, 241, 0.12)' 
            : isFiltered 
              ? '0 2px 8px rgba(99, 102, 241, 0.08)' 
              : '0 1px 3px rgba(15, 23, 42, 0.03)',
          transform: isOpen ? 'translateY(-1px)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!isOpen && !isFiltered) {
            e.currentTarget.style.borderColor = '#94a3b8';
            e.currentTarget.style.boxShadow = '0 3px 10px rgba(15, 23, 42, 0.06)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen && !isFiltered) {
            e.currentTarget.style.borderColor = 'rgba(203, 213, 225, 0.85)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.03)';
          }
        }}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-2 min-w-0 pr-1">
          {selectedOption?.icon && (
            <span className="shrink-0 flex items-center justify-center">
              {selectedOption.icon}
            </span>
          )}
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
          {isFiltered && (
            <span 
              className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" 
              style={{ boxShadow: '0 0 5px rgba(99, 102, 241, 0.8)' }} 
            />
          )}
          <ChevronDown
            size={14}
            className="shrink-0 transition-transform duration-250 ease-in-out"
            style={{
              color: isOpen ? '#6366f1' : isFiltered ? '#6366f1' : '#64748b',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      {/* DROPDOWN MENU PANEL */}
      <div
        className="absolute origin-top rounded-[14px] border z-50 max-h-[320px] overflow-y-auto"
        style={{
          top: 'calc(100% + 6px)',
          [align === 'right' ? 'right' : 'left']: 0,
          minWidth: 'max(100%, 200px)',
          maxWidth: '300px',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(24px)',
          borderColor: 'rgba(226, 232, 240, 0.95)',
          padding: '6px',
          boxShadow: isOpen 
            ? '0 20px 48px -10px rgba(15, 23, 42, 0.16), 0 4px 16px rgba(15, 23, 42, 0.06)' 
            : '0 10px 30px rgba(15, 23, 42, 0.1)',
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
          transition: isOpen
            ? 'opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.22s'
            : 'opacity 0.14s ease, transform 0.14s ease, visibility 0.14s',
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
                  className="px-3 pt-2.5 pb-1 text-[0.68rem] font-extrabold uppercase tracking-wider select-none text-slate-400"
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
                className="w-full flex items-center justify-between px-3 py-2 rounded-[9px] text-[0.84rem] border-none cursor-pointer text-left transition-all duration-150"
                style={{
                  background: isSelected 
                    ? 'linear-gradient(135deg, rgba(238, 242, 255, 0.95), rgba(245, 243, 255, 0.95))' 
                    : 'transparent',
                  color: isSelected ? '#4338ca' : '#1e293b',
                  fontWeight: isSelected ? 700 : 550,
                  border: isSelected ? '1px solid rgba(99, 102, 241, 0.22)' : '1px solid transparent',
                  marginBottom: '2px',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.color = '#0f172a';
                    e.currentTarget.style.transform = 'translateX(2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#1e293b';
                    e.currentTarget.style.transform = 'none';
                  }
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-1">
                  {opt.icon && (
                    <span className="shrink-0 flex items-center justify-center">
                      {opt.icon}
                    </span>
                  )}
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {opt.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                  {opt.count !== undefined && (
                    <span
                      className="text-[0.7rem] px-2 py-0.5 rounded-full font-bold"
                      style={{
                        background: isSelected ? '#c7d2fe' : '#f1f5f9',
                        color: isSelected ? '#3730a3' : '#64748b',
                      }}
                    >
                      {opt.count}
                    </span>
                  )}
                  {isSelected && (
                    <span 
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(99, 102, 241, 0.12)' }}
                    >
                      <Check size={12} className="text-[#4f46e5] font-bold" />
                    </span>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
