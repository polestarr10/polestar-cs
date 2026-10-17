// The rep's weekly plan (reviewed with the VP), one per week. Saved to the
// database when there is one, and always cached on this device.
import { supabase, isSupabaseConfigured } from './supabase';
import { userKey } from '../utils/userStorage';

const CACHE_KEY = 'polestar_weekly_plans_v1';

function readCache(userId) {
  try {
    return JSON.parse(localStorage.getItem(userKey(CACHE_KEY, userId))) || {};
  } catch {
    return {};
  }
}

function writeCache(userId, plans) {
  try {
    localStorage.setItem(userKey(CACHE_KEY, userId), JSON.stringify(plans));
  } catch {}
}

export async function fetchPlan(userId, weekStart) {
  const cached = readCache(userId)[weekStart] || null;
  if (!isSupabaseConfigured) return cached;
  const { data, error } = await supabase
    .from('weekly_plans')
    .select('plan')
    .eq('owner_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();
  if (error) {
    console.warn('Plan fetch failed, using this device copy:', error.message);
    return cached;
  }
  return data?.plan || null;
}

// Returns null on success, or an error message (the plan is still kept on this device).
export async function savePlan(userId, plan) {
  const all = readCache(userId);
  all[plan.weekStart] = plan;
  writeCache(userId, all);
  if (!isSupabaseConfigured) return null;
  const { error } = await supabase.from('weekly_plans').upsert([{
    owner_id: userId, week_start: plan.weekStart, plan, updated_at: new Date().toISOString(),
  }], { onConflict: 'owner_id,week_start' });
  return error ? error.message : null;
}

export async function deletePlan(userId, weekStart) {
  const all = readCache(userId);
  delete all[weekStart];
  writeCache(userId, all);
  if (!isSupabaseConfigured) return null;
  const { error } = await supabase.from('weekly_plans').delete().eq('owner_id', userId).eq('week_start', weekStart);
  return error ? error.message : null;
}
