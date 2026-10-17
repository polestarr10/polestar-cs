// Browser storage keys scoped to one rep, so two reps sharing a computer
// never see each other's cached inquiries or unsynced saves.
export function userKey(baseKey, userId) {
  return `${baseKey}:${userId}`;
}

// Reads this rep's saved value. Data saved before keys were per-rep is handed
// to the first rep who signs in on this device, then the old copy is removed.
export function readUserItem(baseKey, userId) {
  try {
    const key = userKey(baseKey, userId);
    const own = localStorage.getItem(key);
    if (own !== null) return own;
    const legacy = localStorage.getItem(baseKey);
    if (legacy !== null) {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(baseKey);
    }
    return legacy;
  } catch {
    return null;
  }
}
