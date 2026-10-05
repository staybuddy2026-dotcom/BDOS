'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import s from './ui.module.css';

/**
 * Centered dialog with a title, a close button and Escape / backdrop-click to close
 * (both disabled while `busy`). Put the buttons in `actions`; render a <form> as `children` when needed.
 */
export function Modal({ title, icon, onClose, busy = false, wide = false, actions, children }: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return (
    <div className={s.backdrop} onClick={() => !busy && onClose()}>
      <div className={s.modal} style={wide ? { maxWidth: 560, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' } : undefined} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <h3 className={s.modalTitle}>{icon} {title}</h3>
          <button type="button" className={s.iconBtn} onClick={onClose} disabled={busy} aria-label="Close"><X size={16} /></button>
        </div>
        {children}
        {actions && <div className={s.modalActions}>{actions}</div>}
      </div>
    </div>
  );
}
