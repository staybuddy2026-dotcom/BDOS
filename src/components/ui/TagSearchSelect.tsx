'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import t from './tagSearchSelect.module.css';

const toList = (value: string) => value.split(',').map((v) => v.trim()).filter(Boolean);

/**
 * Searchable multi-select: type to filter the suggestions, pick several, or add your own value.
 * The value is a comma-separated string, so it drops in where a plain "A, B" text input was.
 * Keys: ↑/↓ move, Enter or comma adds, Backspace on an empty field removes the last value, Esc closes.
 */
export function TagSearchSelect({ value, onChange, options, placeholder, label, disabled = false, maxOptions = 50 }: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  label: string;
  disabled?: boolean;
  maxOptions?: number;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  /** The list is rendered into <body> with fixed position, so no card or transformed parent can clip or offset it. */
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = controlRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom;
      const up = below < 240 && r.top > below;
      setMenuStyle(up
        ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + 6, maxHeight: Math.min(280, r.top - 12) }
        : { left: r.left, width: r.width, top: r.bottom + 6, maxHeight: Math.min(280, below - 12) });
    };
    place();
    // The box grows when it expands its chips or a value is added, so follow its size too.
    const ro = new ResizeObserver(place);
    if (controlRef.current) ro.observe(controlRef.current);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { ro.disconnect(); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);

  const selected = toList(value);
  /** Not editing: one line with the first value and a "+N more" pill. Editing: every value as a chip. */
  const compact = !open && selected.length > 1;
  const shown = compact ? selected.slice(0, 1) : selected;
  const isSelected = (v: string) => selected.some((x) => x.toLowerCase() === v.toLowerCase());
  const q = query.trim().toLowerCase();

  /** Matches that start with the query first, then the rest; selected values stay listed with a tick. */
  const items = useMemo(() => {
    const matches = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
    const sorted = q ? [...matches].sort((a, b) => Number(!a.toLowerCase().startsWith(q)) - Number(!b.toLowerCase().startsWith(q))) : matches;
    const list = sorted.slice(0, maxOptions).map((v) => ({ value: v, custom: false }));
    const exact = options.some((o) => o.toLowerCase() === q) || selected.some((s) => s.toLowerCase() === q);
    // The typed text is offered last, so Enter picks the best suggestion when there is one.
    return q && !exact ? [...list, { value: query.trim(), custom: true }] : list;
  }, [options, q, query, selected, maxOptions]);

  const commit = (list: string[]) => onChange(list.join(', '));
  const toggle = (v: string) => {
    commit(isSelected(v) ? selected.filter((x) => x.toLowerCase() !== v.toLowerCase()) : [...selected, v]);
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
  };
  const remove = (v: string) => commit(selected.filter((x) => x !== v));

  const move = (delta: number) => {
    if (!open) { setOpen(true); return; }
    const next = (active + delta + items.length) % Math.max(items.length, 1);
    setActive(next);
    listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      // With nothing typed and the list closed, Enter submits the search form as before.
      if (open && items[active]) { e.preventDefault(); toggle(items[active].value); }
      else if (q) { e.preventDefault(); toggle(query.trim()); }
    } else if (e.key === ',') {
      e.preventDefault();
      if (q && !isSelected(query.trim())) toggle(query.trim());
    } else if (e.key === 'Escape') { setOpen(false); }
    else if (e.key === 'Backspace' && !query && selected.length) { remove(selected[selected.length - 1]); }
  };

  return (
    <div className={`${t.wrap} ${disabled ? t.disabled : ''}`}>
      <div ref={controlRef} className={`${t.control} ${open ? t.controlOpen : ''}`} onMouseDown={(e) => {
        // A click anywhere on the box (not on a chip or button) focuses the field and opens the list.
        if ((e.target as HTMLElement).closest('button, input')) return;
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }}>
        <div className={t.values}>
        {shown.map((v) => (
          <span key={v} className={t.tag} title={v}>
            <span className={t.tagText}>{v}</span>
            <button type="button" className={t.tagRemove} aria-label={`Remove ${v}`} disabled={disabled} onClick={() => remove(v)}><X size={12} /></button>
          </span>
        ))}
        {compact && (
          <button type="button" className={t.more} title={selected.slice(1).join(', ')} disabled={disabled}
            onClick={() => { inputRef.current?.focus(); setOpen(true); }}>
            +{selected.length - 1} more
          </button>
        )}
        <input
          ref={inputRef}
          className={`${t.input} ${compact ? t.inputCompact : ''}`}
          size={1}
          autoComplete="off"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && items[active] ? `${listId}-${active}` : undefined}
          placeholder={compact ? '' : selected.length ? 'Add more…' : placeholder}
          value={query}
          disabled={disabled}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { setOpen(false); setQuery(''); }}
          onKeyDown={onKeyDown}
        />
        </div>
        <div className={t.actions}>
        {selected.length > 1 && (
          <button type="button" className={t.iconBtn} aria-label={`Clear ${label}`} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => commit([])}><X size={14} /></button>
        )}
        <button type="button" className={t.iconBtn} aria-label={open ? 'Close list' : 'Open list'} tabIndex={-1} disabled={disabled}
          onMouseDown={(e) => { e.preventDefault(); if (open) setOpen(false); else { inputRef.current?.focus(); setOpen(true); } }}>
          <ChevronDown size={16} className={`${t.chevron} ${open ? t.chevronOpen : ''}`} />
        </button>
        </div>
      </div>

      {open && !disabled && typeof document !== 'undefined' && createPortal(
        <ul ref={listRef} id={listId} role="listbox" aria-multiselectable="true" aria-label={label} className={t.menu} style={menuStyle}>
          {items.length === 0 ? (
            <li className={t.none}>No suggestions. Type a value and press Enter.</li>
          ) : items.map((item, i) => {
            const on = !item.custom && isSelected(item.value);
            return (
              <li
                key={`${item.custom ? 'custom' : 'opt'}-${item.value}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={on}
                className={`${t.option} ${i === active ? t.optionActive : ''} ${on ? t.optionOn : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => toggle(item.value)}
              >
                {item.custom
                  ? <><Plus size={14} className={t.optionIcon} /> Add “{item.value}”</>
                  : <><span className={t.optionText}>{item.value}</span>{on && <Check size={14} className={t.optionIcon} />}</>}
              </li>
            );
          })}
        </ul>,
        document.body,
      )}
    </div>
  );
}
