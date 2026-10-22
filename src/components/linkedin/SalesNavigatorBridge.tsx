'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Bookmark, CheckCircle2, ClipboardPaste, Compass, Info, Kanban, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { importSalesNavLeadsAction } from '@/features/linkedin/salesnavActions';
import type { SalesNavImportRow } from '@/features/linkedin/salesnavActions';
import {
  buildSalesNavBookmarklet,
  decodeBookmarkPayload,
  isPublicProfileUrl,
  isSalesNavLeadUrl,
  MAX_SALESNAV_IMPORT,
  parseSalesNavInput,
} from '@/features/linkedin/salesnav';
import type { SalesNavLead } from '@/features/linkedin/salesnav';
import s from '@/components/ui/ui.module.css';
import { useToast } from '@/components/ui/useToast';
import { usePageState } from '@/lib/usePageState';

type Row = SalesNavLead & { key: number };

const STATUS_BADGE: Record<SalesNavImportRow['status'], string> = {
  created: s.badgeGreen,
  claimed: s.badgeIndigo,
  added: s.badgeAmber,
  error: s.badgeRed,
};
const STATUS_LABEL: Record<SalesNavImportRow['status'], string> = { created: 'New deal', claimed: 'Claimed', added: 'Added', error: 'Not imported' };

// Starts from the clock so rows restored from an earlier visit never share a key with new ones.
let nextKey = Date.now();
const withKeys = (leads: SalesNavLead[]): Row[] => leads.map((l) => ({ ...l, key: nextKey++ }));

export function SalesNavigatorBridge({ enrichAvailable }: { enrichAvailable: boolean }) {
  const params = useSearchParams();
  const { toast, notify } = useToast();
  const bookmarkRef = useRef<HTMLAnchorElement>(null);
  // Leads handed over by the bookmark (?leads=...), read once when the page opens.
  const [initial] = useState(() => decodeBookmarkPayload(params.get('leads') || ''));
  // Leads waiting to be imported and the last import's results are kept for this browser tab.
  const [rows, setRows] = usePageState<Row[]>('salesnav.rows', []);
  const [fromBookmark, setFromBookmark] = useState(initial.length > 0);
  const [pasted, setPasted] = usePageState('salesnav.pasted', '');
  const [enrich, setEnrich] = useState(enrichAvailable);
  const [importing, setImporting] = usePageState('salesnav.importing', false, { persist: false });
  const [results, setResults] = usePageState<SalesNavImportRow[] | null>('salesnav.results', null);

  // React refuses javascript: links in JSX, so the bookmark's address is set on the element directly.
  useEffect(() => {
    bookmarkRef.current?.setAttribute('href', buildSalesNavBookmarklet(window.location.origin));
  }, []);

  // Leads handed over by the bookmark go on top of any still waiting (each lead only once).
  useEffect(() => {
    if (!initial.length) return;
    const ids = new Set(initial.map((l) => l.url || l.name));
    setRows((prev) => [...withKeys(initial), ...prev.filter((r) => !ids.has(r.url || r.name))].slice(0, MAX_SALESNAV_IMPORT));
    setResults(null);
  }, [initial, setRows, setResults]);

  const addPasted = () => {
    const leads = parseSalesNavInput(pasted);
    if (!leads.length) return notify('No leads found. Paste one per line: a LinkedIn URL, or "Name, Title, Company, URL".', true);
    setRows((prev) => [...prev, ...withKeys(leads)].slice(0, MAX_SALESNAV_IMPORT));
    setPasted('');
    setResults(null);
    notify(`${leads.length} lead${leads.length === 1 ? '' : 's'} ready to import.`);
  };

  const update = (key: number, field: keyof SalesNavLead, value: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const runImport = async () => {
    const leads = rows.map((r): SalesNavLead => ({ name: r.name, title: r.title, company: r.company, url: r.url }));
    if (!leads.length) return;
    setImporting(true);
    try {
      const res = await importSalesNavLeadsAction(leads, { enrich });
      if (res.error) return notify(res.error, true);
      setResults(res.rows);
      const ok = res.rows.filter((r) => r.status !== 'error').length;
      notify(`${ok} of ${res.rows.length} lead${res.rows.length === 1 ? '' : 's'} in your CRM (${res.created} new deal${res.created === 1 ? '' : 's'}).`, !ok);
      // Keep only what failed, so it can be fixed and imported again.
      const failed = new Set(res.rows.filter((r) => r.status === 'error').map((r) => r.name));
      setRows((prev) => prev.filter((r) => failed.has(r.name) || (!r.name && failed.has(r.url || ''))));
      setFromBookmark(false);
    } catch {
      notify('The import failed. Please try again.', true);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={s.root}>
      {toast}

      <div className={`${s.notice} ${s.noticeInfo}`}>
        <Info size={16} className={s.noticeIcon} />
        <span>
          LinkedIn only gives Sales Navigator access to its enterprise partners, so nothing syncs on its own. This page is the bridge:
          one click sends leads from Sales Navigator here, and every contact in the CRM has a <strong>Sales Navigator</strong> button
          and an <strong>InMail sent</strong> log. Your LinkedIn account is never automated, so it stays safe.
        </span>
      </div>

      {/* 1. The bookmark */}
      <section className={s.card}>
        <div>
          <h3 className={s.cardTitle}><span className={s.iconTile}><Bookmark size={16} /></span> 1. Add the &quot;Send to CRM&quot; button to your browser (once)</h3>
          <p className={s.cardSubtitle}>Drag this button onto your bookmarks bar. If the bar is hidden, press Ctrl+Shift+B (Cmd+Shift+B on a Mac).</p>
        </div>
        <div className={s.actionGroup}>
          {/* The href (a javascript: bookmark) is set in an effect. */}
          <a ref={bookmarkRef} className={`${s.btn} ${s.btnPrimary}`} onClick={(e) => { e.preventDefault(); notify('Drag this button to your bookmarks bar, then click it on a Sales Navigator page.', true); }} draggable>
            <Compass size={14} /> Send to CRM
          </a>
        </div>
        <ol className={s.cardSubtitle} style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.7 }}>
          <li>In Sales Navigator, open a <strong>lead</strong>, your <strong>lead list</strong>, or <strong>search results</strong>.</li>
          <li>Click <strong>Send to CRM</strong> in your bookmarks bar. The leads on that page (up to 25) open here.</li>
          <li>Check the details below and click <strong>Import to CRM</strong>.</li>
        </ol>
      </section>

      {/* 2. Paste */}
      <section className={s.card}>
        <div>
          <h3 className={s.cardTitle}><span className={s.iconTile}><ClipboardPaste size={16} /></span> Or paste leads</h3>
          <p className={s.cardSubtitle}>One per line: a LinkedIn or Sales Navigator URL, or <code>Name, Title, Company, URL</code>. Rows copied from a spreadsheet work too.</p>
        </div>
        <textarea
          className={s.input}
          rows={4}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder={'Riya Shah, CTO, Acme Health, https://www.linkedin.com/in/riya-shah\nhttps://www.linkedin.com/sales/lead/ACwAAB...'}
          aria-label="Paste Sales Navigator leads"
        />
        <div className={s.actionGroup}>
          <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={addPasted} disabled={!pasted.trim()}>
            <ClipboardPaste size={14} /> Add to the list
          </button>
        </div>
      </section>

      {/* 3. Review and import */}
      <section className={s.card}>
        <div className={s.cardHeader}>
          <div>
            <h3 className={s.cardTitle}><span className={s.iconTile}><UploadCloud size={16} /></span> Leads to import ({rows.length})</h3>
            <p className={s.cardSubtitle}>
              {fromBookmark ? 'Sent from Sales Navigator. ' : ''}Fix any name, title or company before importing. Each lead becomes a contact on a deal you own.
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className={s.cardSubtitle}>No leads yet. Use the Send to CRM button in Sales Navigator, or paste them above.</p>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr><th>Name</th><th>Title</th><th>Company</th><th>Link</th><th aria-label="Remove" /></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td><input className={s.input} value={r.name} onChange={(e) => update(r.key, 'name', e.target.value)} aria-label="Name" placeholder="Name (required)" /></td>
                    <td><input className={s.input} value={r.title || ''} onChange={(e) => update(r.key, 'title', e.target.value)} aria-label="Title" /></td>
                    <td><input className={s.input} value={r.company || ''} onChange={(e) => update(r.key, 'company', e.target.value)} aria-label="Company" /></td>
                    <td>
                      {r.url ? (
                        <a className={s.link} href={r.url} target="_blank" rel="noopener noreferrer">
                          {isSalesNavLeadUrl(r.url) ? 'Sales Navigator' : isPublicProfileUrl(r.url) ? 'LinkedIn profile' : 'Link'}
                        </a>
                      ) : <span className={s.cellSub}>None</span>}
                    </td>
                    <td>
                      <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))} aria-label={`Remove ${r.name || 'lead'}`}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <label className={s.cardSubtitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={enrich} disabled={!enrichAvailable} onChange={(e) => setEnrich(e.target.checked)} />
          {enrichAvailable
            ? 'Fill in a missing title or company from the public LinkedIn profile (one paid Apify run per lead that needs it).'
            : 'Filling in missing details needs the LinkedIn (Apify) connection under Settings > LinkedIn. Leads are imported as shown.'}
        </label>

        <div className={s.actionGroup}>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={runImport} disabled={importing || !rows.length || rows.some((r) => !r.name.trim() && !isPublicProfileUrl(r.url))}>
            {importing ? <Loader2 size={14} className={s.spin} /> : <UploadCloud size={14} />} Import to CRM
          </button>
          {rows.some((r) => !r.name.trim() && !isPublicProfileUrl(r.url)) && <span className={s.cellSub}>Every lead needs a name (or a public profile URL to read it from).</span>}
        </div>
      </section>

      {results && (
        <section className={s.card}>
          <h3 className={s.cardTitle}><span className={s.iconTile}><CheckCircle2 size={16} /></span> Import results</h3>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>Lead</th><th>Company</th><th>Result</th><th aria-label="Open deal" /></tr></thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={`${r.name}-${i}`}>
                    <td className={s.cellStrong}>{r.name}</td>
                    <td>{r.company}</td>
                    <td><span className={`${s.badge} ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span> <span className={s.cellSub}>{r.message}</span></td>
                    <td>
                      {r.dealId && (
                        <Link className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} href={`/crm?deal=${r.dealId}`}><Kanban size={13} /> Open deal <ArrowRight size={12} /></Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
