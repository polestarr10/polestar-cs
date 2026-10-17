import { useMemo, useEffect, useRef } from 'react';
import { followUpState, quoteExpiry } from '../utils/followUps';
import { userKey, readUserItem } from '../utils/userStorage';

const STORE_KEY = 'polestar_followup_alerts_v1';

// Lists what is waiting on the customer, and raises a desktop alert once per
// follow-up when it falls due.
export default function useFollowUpAlerts(inquiries, now, userId) {
  const lists = useMemo(() => {
    const due = [];
    const cold = [];
    const waiting = [];
    const expiring = [];
    for (const inq of inquiries) {
      const fu = followUpState(inq, now);
      if (fu?.stage === 'due') due.push({ inquiry: inq, fu });
      else if (fu?.stage === 'cold') cold.push({ inquiry: inq, fu });
      else if (fu?.stage === 'waiting') waiting.push({ inquiry: inq, fu });
      const exp = quoteExpiry(inq, now);
      if (exp) expiring.push({ inquiry: inq, exp });
    }
    due.sort((a, b) => b.fu.hoursQuiet - a.fu.hoursQuiet);
    cold.sort((a, b) => b.fu.hoursQuiet - a.fu.hoursQuiet);
    waiting.sort((a, b) => a.fu.dueAt - b.fu.dueAt);
    expiring.sort((a, b) => a.exp.daysLeft - b.exp.daysLeft);
    return { due, cold, waiting, expiring };
  }, [inquiries, now]);

  const alertedRef = useRef(null);
  if (alertedRef.current === null) {
    try {
      alertedRef.current = new Set(JSON.parse(readUserItem(STORE_KEY, userId)) || []);
    } catch {
      alertedRef.current = new Set();
    }
  }

  useEffect(() => {
    const keys = lists.due.map(d => d.fu.cycleKey);
    const fresh = lists.due.filter(d => !alertedRef.current.has(d.fu.cycleKey));
    alertedRef.current = new Set(keys);
    try {
      localStorage.setItem(userKey(STORE_KEY, userId), JSON.stringify(keys));
    } catch {}
    if (!fresh.length || !('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      new Notification(
        fresh.length === 1 ? `Follow up with ${fresh[0].inquiry.shipperName}` : `${fresh.length} customers need a follow-up`,
        { body: fresh.slice(0, 4).map(d => `${d.inquiry.id} · follow-up ${d.fu.number} of 3`).join('\n'), tag: 'polestar-follow-up' }
      );
    } catch {}
  }, [lists.due, userId]);

  return lists;
}
