import { useState, useEffect, useRef, useCallback } from 'react';
import { isSupabaseConfigured, upsertInquiryDb, deleteInquiryDb } from '../lib/supabase';

const STORE_KEY = 'polestar_pending_sync_v1';
const RETRY_MS = 60000;

function load() {
  try {
    const p = JSON.parse(localStorage.getItem(STORE_KEY));
    return { upserts: p?.upserts || [], deletes: p?.deletes || [] };
  } catch {
    return { upserts: [], deletes: [] };
  }
}

function store(p) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(p));
  } catch {}
}

// Saves inquiries to Supabase. A failed save is queued on this device and
// retried every minute and whenever the connection comes back, so nothing is
// lost silently. Without Supabase, everything stays in this browser only.
export default function useDbSync(getInquiry, onSaveFailed) {
  const [pending, setPending] = useState(load);
  const [syncing, setSyncing] = useState(false);
  const pendingRef = useRef(pending);

  const update = useCallback((fn) => {
    const next = fn(pendingRef.current);
    pendingRef.current = next;
    store(next);
    setPending(next);
  }, []);

  const persist = useCallback(async (inquiry) => {
    if (!isSupabaseConfigured || !inquiry) return;
    const ok = await upsertInquiryDb(inquiry);
    if (ok) {
      update(p => ({ ...p, upserts: p.upserts.filter(id => id !== inquiry.id) }));
    } else {
      update(p => ({ upserts: [...new Set([...p.upserts, inquiry.id])], deletes: p.deletes.filter(id => id !== inquiry.id) }));
      onSaveFailed?.(inquiry.id);
    }
  }, [update, onSaveFailed]);

  const persistDelete = useCallback(async (id) => {
    if (!isSupabaseConfigured) return;
    const ok = await deleteInquiryDb(id);
    update(p => ({
      upserts: p.upserts.filter(x => x !== id),
      deletes: ok ? p.deletes.filter(x => x !== id) : [...new Set([...p.deletes, id])],
    }));
    if (!ok) onSaveFailed?.(id);
  }, [update, onSaveFailed]);

  const flush = useCallback(async () => {
    const { upserts, deletes } = pendingRef.current;
    if (!isSupabaseConfigured || (!upserts.length && !deletes.length)) return;
    setSyncing(true);
    const failedUpserts = [];
    for (const id of upserts) {
      const item = getInquiry(id);
      if (item && !(await upsertInquiryDb(item))) failedUpserts.push(id);
    }
    const failedDeletes = [];
    for (const id of deletes) {
      if (!(await deleteInquiryDb(id))) failedDeletes.push(id);
    }
    update(() => ({ upserts: failedUpserts, deletes: failedDeletes }));
    setSyncing(false);
  }, [getInquiry, update]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const timer = setInterval(flush, RETRY_MS);
    window.addEventListener('online', flush);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', flush);
    };
  }, [flush]);

  return {
    pendingCount: pending.upserts.length + pending.deletes.length,
    pendingRef,
    syncing,
    persist,
    persistDelete,
    flush,
  };
}
