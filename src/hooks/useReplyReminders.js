import { useState, useEffect, useRef } from 'react';

export const REMINDER_INTERVAL_MIN = 30;
const STORE_KEY = 'polestar_reply_reminders_v1';
const AWAITING_REPLY_STATUSES = ['INQUIRY_RECEIVED', 'UNDER_REVIEW', 'FOLLOWUP_NEEDED', 'NEGOTIATING'];

export function isAwaitingReply(inquiry) {
  return !inquiry.hasReplied && AWAITING_REPLY_STATUSES.includes(inquiry.status || 'INQUIRY_RECEIVED');
}

// Waiting is counted from the customer's latest message (awaitingSince), or
// from when the inquiry arrived if they haven't written again.
export function minutesWaiting(inquiry, now) {
  const t = Date.parse(inquiry.awaitingSince || inquiry.receivedAt);
  return isNaN(t) ? 0 : Math.max(0, Math.floor((now - t) / 60000));
}

export function formatWaiting(min) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function loadShown() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveShown(shown) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(shown));
  } catch {}
}

function notifyDesktop(items) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(
      items.length === 1 ? `${items[0].id} still needs a quotation reply` : `${items.length} inquiries still need a quotation reply`,
      { body: items.slice(0, 4).map(i => `${i.id} · ${i.shipperName}`).join('\n'), tag: 'polestar-reply-reminder' }
    );
  } catch {}
}

// Every 30 minutes an inquiry sits without a reply (counted from when the email
// was received), it is raised again in the reminder popup.
export default function useReplyReminders(inquiries) {
  const [now, setNow] = useState(Date.now());
  const [dueIds, setDueIds] = useState([]);
  const shownRef = useRef(loadShown());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const shown = shownRef.current;
    const newlyDue = [];
    const stillAwaiting = {};

    for (const inq of inquiries) {
      if (!isAwaitingReply(inq)) continue;
      // Keyed by the waiting-start time so a new customer message starts a fresh cycle.
      const key = `${inq.id}@${inq.awaitingSince || inq.receivedAt}`;
      const slot = Math.floor(minutesWaiting(inq, now) / REMINDER_INTERVAL_MIN);
      stillAwaiting[key] = shown[key] || 0;
      if (slot >= 1 && (shown[key] || 0) < slot) {
        stillAwaiting[key] = slot;
        newlyDue.push(inq);
      }
    }

    shownRef.current = stillAwaiting;
    saveShown(stillAwaiting);

    if (newlyDue.length) {
      setDueIds(prev => [...new Set([...prev, ...newlyDue.map(i => i.id)])]);
      notifyDesktop(newlyDue);
    }
  }, [inquiries, now]);

  const dueInquiries = inquiries.filter(i => dueIds.includes(i.id) && isAwaitingReply(i));

  return {
    now,
    dueInquiries,
    dismissAll: () => setDueIds([]),
    dismissOne: (id) => setDueIds(prev => prev.filter(x => x !== id)),
  };
}
