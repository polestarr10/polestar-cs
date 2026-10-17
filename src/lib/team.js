// Rep profiles, weekly CBM targets and the manager's whole-team view.
// Managers are the login emails listed in the `managers` table; the database
// lets them read every rep's inquiries but not change them.
import { supabase, isSupabaseConfigured, mapRowToInquiry } from './supabase';
import { userKey } from '../utils/userStorage';
import { dayKey, startOfWeek } from '../utils/nominations';

const LOCAL_TARGETS_KEY = 'polestar_targets_v1';

export function weekKey(date) {
  return dayKey(startOfWeek(date));
}

// A target applies from its week onward until a later one replaces it.
export function targetForWeek(targets, repId, week) {
  const rows = targets
    .filter(t => t.repId === repId && t.weekStart <= week)
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
  return rows[0] ? rows[0].targetCbm : null;
}

const mapTarget = (r) => ({ repId: r.rep_id, weekStart: r.week_start, targetCbm: Number(r.target_cbm) || 0, setBy: r.set_by });

export async function fetchIsManager() {
  if (!supabase) return false;
  const { data, error } = await supabase.from('managers').select('email').limit(1);
  return !error && data.length > 0;
}

// Keeps the rep's name and role readable by managers (auth details aren't).
export async function syncProfileDb(user) {
  if (!supabase || !user?.id) return;
  const { error } = await supabase.from('profiles').upsert([{
    id: user.id, email: user.email, full_name: user.name, role: user.role || null, updated_at: new Date().toISOString(),
  }]);
  if (error) console.warn('Profile sync failed:', error.message);
}

export async function fetchTargets(repId) {
  if (!isSupabaseConfigured) {
    try {
      return JSON.parse(localStorage.getItem(userKey(LOCAL_TARGETS_KEY, repId))) || [];
    } catch {
      return [];
    }
  }
  let q = supabase.from('rep_targets').select('*');
  if (repId) q = q.eq('rep_id', repId);
  const { data, error } = await q;
  if (error) {
    console.warn('Targets fetch failed:', error.message);
    return [];
  }
  return data.map(mapTarget);
}

// Returns null on success, or an error message.
export async function saveTargetDb(repId, weekStart, targetCbm, setBy) {
  if (!isSupabaseConfigured) {
    const rows = (await fetchTargets(repId)).filter(t => t.weekStart !== weekStart);
    rows.push({ repId, weekStart, targetCbm, setBy });
    try {
      localStorage.setItem(userKey(LOCAL_TARGETS_KEY, repId), JSON.stringify(rows));
    } catch {
      return "Couldn't save the target in this browser.";
    }
    return null;
  }
  const { error } = await supabase.from('rep_targets').upsert([{
    rep_id: repId, week_start: weekStart, target_cbm: targetCbm, set_by: setBy, updated_at: new Date().toISOString(),
  }], { onConflict: 'rep_id,week_start' });
  return error ? error.message : null;
}

// Everything the team report needs. Returns null if the database can't be read.
export async function fetchTeamData() {
  if (!supabase) return null;
  const [profiles, inquiries, targets] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('inquiries').select('*'),
    supabase.from('rep_targets').select('*'),
  ]);
  const err = profiles.error || inquiries.error || targets.error;
  if (err) {
    console.warn('Team data fetch failed:', err.message);
    return null;
  }
  return {
    reps: profiles.data.map(p => ({ id: p.id, email: p.email, name: p.full_name || p.email, role: p.role })),
    inquiries: inquiries.data.map(mapRowToInquiry),
    targets: targets.data.map(mapTarget),
  };
}
