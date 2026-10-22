'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import type { Dispatch, SetStateAction } from 'react';

/**
 * useState that outlives the page: searches and their results are still there when the user
 * navigates away and comes back, so nothing is lost and no paid search runs twice.
 *
 * The value lives in a store for this browser tab, not in the component. A search that finishes
 * after the user has left the page still lands in the store and shows on return.
 * - persist (default): also kept in sessionStorage, so it survives a page refresh (cleared when the tab closes).
 * - persist: false: memory only. Use it for "loading" flags, which must not survive a refresh.
 * clearPageState() wipes everything; it runs on sign-out and on the sign-in page.
 */

// Bump the version to drop state saved by an older build (v1/v2 could hold previous searches).
const PREFIX = 'bdos:page:v3:';
const memory = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();
// Keys that were actually set (memory also caches defaults that were only read).
const written = new Set<string>();

let olderVersionsPurged = false;
function purgeOlderVersions(store: Storage) {
  try {
    for (let i = store.length - 1; i >= 0; i--) {
      const k = store.key(i);
      if (k && k.startsWith('bdos:page:') && !k.startsWith(PREFIX)) {
        store.removeItem(k);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const store = window.sessionStorage;
    if (store && !olderVersionsPurged) {
      olderVersionsPurged = true;
      purgeOlderVersions(store);
    }
    return store;
  } catch {
    return null; // blocked storage (privacy mode)
  }
}

function readStored(key: string): { found: boolean; value?: unknown } {
  const raw = storage()?.getItem(PREFIX + key);
  if (raw == null) return { found: false };
  try {
    return { found: true, value: JSON.parse(raw) };
  } catch {
    return { found: false };
  }
}

export function readPageState<T>(key: string, fallback: T, persist = true): T {
  if (memory.has(key)) return memory.get(key) as T;
  const stored = persist ? readStored(key) : { found: false };
  // Remember the fallback too, so every read returns the same object (useSyncExternalStore needs that).
  const value = stored.found ? (stored.value as T) : fallback;
  memory.set(key, value);
  return value;
}

export function writePageState<T>(key: string, value: T, persist = true) {
  memory.set(key, value);
  written.add(key);
  if (persist) {
    try {
      storage()?.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Over the storage quota: still kept in memory for this visit.
    }
  }
  listeners.get(key)?.forEach((notify) => notify());
}

/** Tests only: drops the in-memory copy, as a page reload does (the tab's storage stays). */
export function forgetPageMemoryForTests() {
  memory.clear();
  written.clear();
}

/** True when this key has a saved value (in memory or the tab's storage). */
export function hasPageState(key: string): boolean {
  return written.has(key) || readStored(key).found;
}

/** Forgets every saved page state, e.g. on sign-out, so the next user does not see these results. */
export function clearPageState() {
  memory.clear();
  written.clear();
  const store = storage();
  if (!store) return;
  for (let i = store.length - 1; i >= 0; i--) {
    const k = store.key(i);
    if (k?.startsWith(PREFIX)) store.removeItem(k);
  }
}

export function usePageState<T>(key: string, initial: T | (() => T), options: { persist?: boolean } = {}): [T, Dispatch<SetStateAction<T>>] {
  const persist = options.persist !== false;
  // The initial value is fixed on first render so reads stay stable.
  const [fallback] = useState(initial);

  const subscribe = useCallback((notify: () => void) => {
    let set = listeners.get(key);
    if (!set) listeners.set(key, (set = new Set()));
    set.add(notify);
    return () => { set!.delete(notify); };
  }, [key]);

  const value = useSyncExternalStore(
    subscribe,
    () => readPageState(key, fallback, persist),
    // The server has no saved state: it renders the initial value, the browser then shows the saved one.
    () => fallback,
  );

  // Works after the component is gone too: a search that finishes later still saves its results.
  const setValue = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    const current = readPageState(key, fallback, persist);
    writePageState(key, typeof next === 'function' ? (next as (prev: T) => T)(current) : next, persist);
  }, [key, fallback, persist]);

  return [value, setValue];
}
