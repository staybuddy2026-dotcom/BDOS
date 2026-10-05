'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CornerDownLeft, Kanban, Loader2, Search } from 'lucide-react';
import { navSections } from './nav';
import { searchDealsAction } from '@/features/search/actions';
import type { DealHit } from '@/features/search/actions';
import { STAGE_LABELS } from '@/features/crm/types';
import type { UserRole } from '@prisma/client';
import { canSeeAllDeals } from '@/lib/roles';
import s from './CommandPalette.module.css';

type Result = { key: string; label: string; hint: string; href: string; icon: React.ElementType; group: 'Pages' | 'Deals' };

/**
 * Ctrl+K / Cmd+K (or the search box in the sidebar): jump to any page, or find a deal by company,
 * contact name or email. Arrow keys move, Enter opens, Escape closes.
 */
export function CommandPalette({ role }: { role: UserRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [deals, setDeals] = useState<DealHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  const show = () => { setQuery(''); setDeals([]); setActive(0); setOpen(true); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); show(); }
    };
    const onOpen = () => show();
    window.addEventListener('keydown', onKey);
    window.addEventListener('bdos:open-command', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('bdos:open-command', onOpen); };
  }, []);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  // Deal search: debounced, and stale answers are dropped.
  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      setSearching(true);
      searchDealsAction(query)
        .then((hits) => { if (id === requestId.current) setDeals(hits); })
        .catch(() => { if (id === requestId.current) setDeals([]); })
        .finally(() => { if (id === requestId.current) setSearching(false); });
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const isAdmin = role === 'ADMIN';
    const pages = navSections
      .flatMap((section) => section.items.map((item) => ({ item, section: section.label })))
      .filter(({ item }) => (!item.managersOnly || canSeeAllDeals(role)) && (!item.adminOnly || isAdmin))
      .filter(({ item, section }) => !q || item.name.toLowerCase().includes(q) || section.toLowerCase().includes(q))
      .slice(0, q ? 6 : 8)
      .map(({ item, section }): Result => ({ key: `p-${item.href}`, label: item.name, hint: section, href: item.href, icon: item.icon, group: 'Pages' }));
    const dealResults = q.length < 2 ? [] : deals.map((d): Result => ({
      key: `d-${d.id}`,
      label: d.company,
      hint: [STAGE_LABELS[d.stage], d.contact, d.ownerName ? `owner ${d.ownerName}` : 'unassigned'].filter(Boolean).join(' · '),
      href: `/crm?deal=${d.id}`,
      icon: Kanban,
      group: 'Deals',
    }));
    return [...dealResults, ...pages];
  }, [query, deals, role]);

  if (!open) return null;

  const go = (r: Result | undefined) => {
    if (!r) return;
    setOpen(false);
    router.push(r.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(results.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
  };

  return (
    <div className={s.backdrop} onClick={() => setOpen(false)}>
      <div className={s.panel} role="dialog" aria-modal="true" aria-label="Search" onClick={(e) => e.stopPropagation()}>
        <div className={s.inputRow}>
          <div className={s.searchIconWrap}>
            {searching ? <Loader2 size={18} className={s.spin} /> : <Search size={18} />}
          </div>
          <input
            ref={inputRef}
            className={s.input}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search deals by company, contact or email, or jump to a page…"
            aria-label="Search"
            role="combobox"
            aria-expanded
            aria-controls="command-results"
            aria-activedescendant={results[active] ? `cmd-${results[active].key}` : undefined}
          />
          <kbd className={s.kbd}>ESC</kbd>
        </div>

        <ul id="command-results" role="listbox" className={s.list}>
          {results.length === 0 && (
            <li className={s.empty}>
              {searching ? (
                <div className={s.emptyState}>
                  <Loader2 size={16} className={s.spin} />
                  <span>Searching deals and pages…</span>
                </div>
              ) : query.trim().length < 2 ? (
                <div className={s.emptyState}>
                  <span>Type to search deals, or choose a page…</span>
                </div>
              ) : (
                <div className={s.emptyState}>
                  <span>No results found for &ldquo;{query.trim()}&rdquo;</span>
                </div>
              )}
            </li>
          )}
          {results.map((r, i) => {
            const Icon = r.icon;
            const firstOfGroup = i === 0 || results[i - 1].group !== r.group;
            return (
              <li key={r.key} role="presentation">
                {firstOfGroup && (
                  <div className={s.group}>
                    <span>{r.group}</span>
                    <span className={s.groupCount}>{results.filter((x) => x.group === r.group).length}</span>
                  </div>
                )}
                <div
                  id={`cmd-${r.key}`}
                  role="option"
                  aria-selected={i === active}
                  className={`${s.item} ${i === active ? s.itemActive : ''}`}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(r)}
                >
                  <div className={s.itemIconWrap}>
                    <Icon size={16} className={s.itemIcon} />
                  </div>
                  <span className={s.itemLabel}>{r.label}</span>
                  <span className={s.itemHint}>{r.hint}</span>
                  {i === active && (
                    <div className={s.enterAction}>
                      <span>Open</span>
                      <CornerDownLeft size={11} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className={s.footer}>
          <div className={s.footerLeft}>
            <span className={s.footerKey}><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
            <span className={s.footerKey}><kbd>↵</kbd> Select</span>
            <span className={s.footerKey}><kbd>Esc</kbd> Close</span>
          </div>
          <div className={s.footerRight}>
            <span className={s.footerNote}>
              {results.length} {results.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
