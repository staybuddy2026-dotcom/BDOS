'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import s from './ui.module.css';

/**
 * One toast at a time, bottom right. Errors stay up longer so the reason can be read.
 *
 *   const { toast, notify } = useToast();
 *   notify('Saved.');  notify('Could not save.', true);
 *   return <>{toast}...</>;
 */
export function useToast() {
  const [current, setCurrent] = useState<{ msg: string; error: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((msg: string, error = false) => {
    if (timer.current) clearTimeout(timer.current);
    setCurrent({ msg, error });
    timer.current = setTimeout(() => setCurrent(null), error ? 6500 : 3200);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const toast = current ? (
    <div className={`${s.toast} ${current.error ? s.toastError : ''}`} role="status" aria-live="polite">
      {current.error ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />} {current.msg}
    </div>
  ) : null;

  return { toast, notify };
}
