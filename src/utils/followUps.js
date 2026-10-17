// Follow-ups when the customer goes quiet after we wrote to them, and alerts
// for quotes about to run past their validity date.
import { isAwaitingReply } from '../hooks/useReplyReminders';
import { formatRate } from './replyDraft';

export const FOLLOW_UP_AFTER_HOURS = 24;
export const MAX_FOLLOW_UPS = 3;
export const QUOTE_EXPIRY_WARN_DAYS = 2;

const CLOSED = ['BOOKING_WON', 'CLOSED_LOST'];
const HOUR = 3600000;

// The ball is in the customer's court: we replied (quote or a question) and the
// inquiry is still open.
export function isWaitingOnCustomer(inquiry) {
  return Boolean(inquiry.hasReplied && inquiry.repliedAt) && !CLOSED.includes(inquiry.status) && !isAwaitingReply(inquiry);
}

// Only follow-ups sent after our latest reply count, so a customer reply
// followed by our answer starts a fresh cycle of 3.
export function followUpsSinceReply(inquiry) {
  const since = Date.parse(inquiry.repliedAt);
  return (inquiry.followUps || []).filter(f => Date.parse(f.at) >= since);
}

// stage: 'waiting' (not due yet) | 'due' (send follow-up no. `number`) | 'cold' (3 sent, still silent)
export function followUpState(inquiry, now = Date.now()) {
  if (!isWaitingOnCustomer(inquiry)) return null;
  const repliedAt = Date.parse(inquiry.repliedAt);
  if (isNaN(repliedAt)) return null;
  const sent = followUpsSinceReply(inquiry);
  const lastContact = Math.max(repliedAt, ...sent.map(f => Date.parse(f.at)).filter(t => !isNaN(t)));
  const hoursQuiet = Math.max(0, (now - lastContact) / HOUR);
  const base = { sent: sent.length, lastContact, hoursQuiet, cycleKey: `${inquiry.id}@${inquiry.repliedAt}#${sent.length}` };
  if (hoursQuiet < FOLLOW_UP_AFTER_HOURS) return { ...base, stage: 'waiting', dueAt: lastContact + FOLLOW_UP_AFTER_HOURS * HOUR };
  if (sent.length < MAX_FOLLOW_UPS) return { ...base, stage: 'due', number: sent.length + 1 };
  return { ...base, stage: 'cold' };
}

function endOfDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d)) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

// Open quotes whose validity ends within QUOTE_EXPIRY_WARN_DAYS, or has passed.
// daysLeft: 0 = expires today, negative = expired that many days ago.
export function quoteExpiry(inquiry, now = Date.now()) {
  if (!inquiry.isQuoted || !inquiry.quoteValidity || CLOSED.includes(inquiry.status)) return null;
  const end = endOfDay(inquiry.quoteValidity);
  if (!end) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((new Date(`${inquiry.quoteValidity}T00:00:00`) - today) / 86400000);
  if (daysLeft > QUOTE_EXPIRY_WARN_DAYS) return null;
  return { daysLeft, expired: end.getTime() < now };
}

export function formatExpiry({ daysLeft, expired }) {
  if (expired) return daysLeft === -1 ? 'expired yesterday' : `expired ${-daysLeft} days ago`;
  if (daysLeft === 0) return 'expires today';
  if (daysLeft === 1) return 'expires tomorrow';
  return `expires in ${daysLeft} days`;
}

export function formatQuiet(hours) {
  const h = Math.floor(hours);
  return h < 48 ? `${h}h` : `${Math.floor(h / 24)}d ${h % 24}h`;
}

// ---- Follow-up email draft ----

function fmtDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function buildFollowUpSubject(inquiry) {
  const original = (inquiry.emailSubject || '').trim();
  if (original && original !== 'No Subject') {
    const base = /^re:/i.test(original) ? original : `Re: ${original}`;
    return `${base} [Ref ${inquiry.id}]`;
  }
  return `Follow-up: Freight Quotation ${inquiry.id}: ${inquiry.polCode || inquiry.pol} to ${inquiry.podCode || inquiry.pod}`;
}

export function buildFollowUpBody(inquiry, number, currentUser) {
  const name = (inquiry.contactPerson || '').split(/\s+-\s+/)[0].trim() || 'Sir/Madam';
  const route = `${inquiry.pol || inquiry.polCode} to ${inquiry.pod || inquiry.podCode}`;
  const rate = inquiry.quotedRate || (inquiry.quotedAmountTotal > 0 ? formatRate(inquiry.quotedCurrency, inquiry.quotedAmountTotal) : '');
  const validity = inquiry.quoteValidity ? fmtDate(inquiry.quoteValidity) : '';
  const sentOn = fmtDate(inquiry.repliedAt);

  let lines;
  if (!inquiry.isQuoted) {
    lines = [
      `We are following up on your freight inquiry for ${route} (Ref: ${inquiry.id}).`,
      '',
      'To send you our best rate, we still need the shipment details we asked for. Kindly share them at your earliest convenience.',
    ];
  } else if (number === 1) {
    lines = [
      `We are following up on our quotation sent on ${sentOn} for ${route}, ${inquiry.containerType}${rate ? ` at ${rate}` : ''} (Ref: ${inquiry.id}).`,
      validity ? `The rate is valid until ${validity}.` : null,
      '',
      'Kindly let us know if you would like to proceed with the booking, or if you need any changes to the quotation.',
    ];
  } else if (number === 2) {
    lines = [
      `Gentle reminder on our quotation for ${route}, ${inquiry.containerType}${rate ? ` at ${rate}` : ''} (Ref: ${inquiry.id}).`,
      validity ? `The rate is valid until ${validity}, subject to space availability.` : 'The rate is subject to space availability.',
      '',
      'If the cargo readiness date, routing or rate needs to change, please let us know and we will revise the offer.',
    ];
  } else {
    lines = [
      `We have not heard back on our quotation for ${route} (Ref: ${inquiry.id}).`,
      '',
      'Could you please let us know whether this shipment is still planned? If so, we will be happy to hold the rate and secure space for you. If plans have changed, a short note would help us close the inquiry on our side.',
    ];
  }

  const signature = [currentUser?.name || 'Polestar CS Team', currentUser?.role, 'Polestar Consolidators & Freight Forwarders Pvt Ltd'].filter(Boolean);
  return [`Dear ${name},`, '', ...lines.filter(l => l !== null), '', 'Best regards,', ...signature].join('\n');
}
