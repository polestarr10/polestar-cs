// Weekly target-vs-actual report per rep (CBM), the items they missed, and the
// plan for next week. Every figure comes from the inquiries themselves.
import * as XLSX from 'xlsx';
import { getNominations, nominationsInRange, totals, addDays, formatDay, dayKey } from './nominations';
import { isAwaitingReply, minutesWaiting, formatWaiting, REMINDER_INTERVAL_MIN } from '../hooks/useReplyReminders';
import { followUpState, quoteExpiry, isWaitingOnCustomer, formatQuiet, formatExpiry } from './followUps';
import { targetForWeek, weekKey } from '../lib/team';

const inRange = (iso, { from, to }) => {
  const t = Date.parse(iso || '');
  return !isNaN(t) && t >= from.getTime() && t < to.getTime();
};

function lostAt(inquiry) {
  const e = [...(inquiry.auditLog || [])].reverse().find(x => /declined|closed as lost|CLOSED_LOST/i.test(x.action || ''));
  return e?.timestamp || inquiry.updatedAt;
}

export function weekRange(anchor) {
  const from = new Date(`${weekKey(anchor)}T00:00:00`);
  return { from, to: addDays(from, 7) };
}

export function weekLabel({ from }) {
  const opts = { day: '2-digit', month: 'short', year: 'numeric' };
  return `${formatDay(from, opts)} – ${formatDay(addDays(from, 6), opts)}`;
}

export const round1 = (n) => Math.round(n * 10) / 10;

// Booked CBM against target for one rep's inquiries in the week starting range.from.
export function cbmProgress(inquiries, targets, repId, range) {
  const booked = nominationsInRange(getNominations(inquiries), range);
  const t = totals(booked);
  const target = targetForWeek(targets, repId, dayKey(range.from));
  return {
    target,
    actual: round1(t.volumeCbm),
    pct: target ? Math.round((t.volumeCbm / target) * 100) : null,
    bookings: t.shipments,
    teu: t.teu,
    missingCbm: booked.filter(n => !(n.volumeCbm > 0)).length,
  };
}

export function repWeekReport(rep, inquiries, targets, range, now = Date.now()) {
  const progress = cbmProgress(inquiries, targets, rep.id, range);
  const received = inquiries.filter(i => inRange(i.receivedAt, range));
  const replied = received.filter(i => i.hasReplied || i.isQuoted || i.status === 'BOOKING_WON');
  const tats = received.map(i => i.responseTatMinutes).filter(t => typeof t === 'number' && t >= 0);
  const lost = inquiries.filter(i => i.status === 'CLOSED_LOST' && inRange(lostAt(i), range));

  const missed = [];
  const add = (i, issue) => missed.push({ rep: rep.name, id: i.id, shipper: i.shipperName, issue });
  for (const i of received) {
    if (typeof i.responseTatMinutes === 'number' && i.responseTatMinutes > REMINDER_INTERVAL_MIN) {
      add(i, `Reply took ${formatWaiting(i.responseTatMinutes)} (target ${REMINDER_INTERVAL_MIN} min)`);
    }
  }
  for (const i of lost) add(i, `Lost: ${i.lostReason || 'no reason given'}${i.lostNote ? ` (${i.lostNote})` : ''}`);
  for (const i of inquiries) {
    if (i.isQuoted && i.quoteValidity && i.status !== 'BOOKING_WON' && i.status !== 'CLOSED_LOST') {
      const end = new Date(`${i.quoteValidity}T23:59:59`);
      if (end >= range.from && end < range.to && end.getTime() < now) add(i, `Quote expired ${formatDay(end)} without a booking`);
    }
  }

  // Open right now, whatever week is on screen.
  const outstanding = [];
  const out = (i, issue) => outstanding.push({ rep: rep.name, id: i.id, shipper: i.shipperName, issue });
  for (const i of inquiries) {
    if (isAwaitingReply(i) && minutesWaiting(i, now) >= REMINDER_INTERVAL_MIN) out(i, `Not replied for ${formatWaiting(minutesWaiting(i, now))}`);
    const fu = followUpState(i, now);
    if (fu?.stage === 'due') out(i, `Follow-up ${fu.number} overdue (quiet ${formatQuiet(fu.hoursQuiet)})`);
    if (fu?.stage === 'cold') out(i, `No response after 3 follow-ups (quiet ${formatQuiet(fu.hoursQuiet)})`);
  }

  // Next week: target and the open quotes that could still book.
  const next = { from: range.to, to: addDays(range.to, 7) };
  const pipeline = inquiries.filter(i => i.isQuoted && isWaitingOnCustomer(i));
  const expiringNext = pipeline.filter(i => {
    if (!i.quoteValidity) return false;
    const end = new Date(`${i.quoteValidity}T23:59:59`);
    return end >= next.from && end < next.to;
  });

  return {
    rep,
    ...progress,
    received: received.length,
    replied: replied.length,
    avgTat: tats.length ? Math.round(tats.reduce((a, b) => a + b, 0) / tats.length) : null,
    lost: lost.length,
    unrepliedNow: inquiries.filter(isAwaitingReply).length,
    followUpsDue: inquiries.filter(i => ['due', 'cold'].includes(followUpState(i, now)?.stage)).length,
    missed,
    outstanding,
    nextTarget: targetForWeek(targets, rep.id, dayKey(next.from)),
    pipelineCount: pipeline.length,
    pipelineCbm: round1(pipeline.reduce((s, i) => s + (Number(i.volumeCbm) || 0), 0)),
    expiringNext: expiringNext.map(i => ({ rep: rep.name, id: i.id, shipper: i.shipperName, issue: `Quote valid until ${formatDay(i.quoteValidity)}${quoteExpiry(i, now) ? ` (${formatExpiry(quoteExpiry(i, now))})` : ''}` })),
  };
}

export function teamWeekReport({ reps, inquiries, targets }, range, now = Date.now()) {
  const byOwner = new Map();
  for (const i of inquiries) {
    if (!byOwner.has(i.ownerId)) byOwner.set(i.ownerId, []);
    byOwner.get(i.ownerId).push(i);
  }
  return reps
    .map(rep => repWeekReport(rep, byOwner.get(rep.id) || [], targets, range, now))
    .sort((a, b) => a.rep.name.localeCompare(b.rep.name));
}

export function exportTeamReport(rows, range, preparedBy) {
  const pct = (r) => (r.pct === null ? 'No target' : `${r.pct}%`);
  const summary = rows.map(r => ({
    'Rep': r.rep.name,
    'Target (CBM)': r.target ?? 'Not set',
    'Booked (CBM)': r.actual,
    'Achieved': pct(r),
    'Bookings': r.bookings,
    'TEU': r.teu,
    'Bookings without CBM': r.missingCbm,
    'Inquiries received': r.received,
    'Replied': r.replied,
    'Avg reply time (min)': r.avgTat ?? '',
    'Lost': r.lost,
    'Unreplied now': r.unrepliedNow,
    'Follow-ups overdue now': r.followUpsDue,
  }));
  const t = rows.reduce((s, r) => ({ target: s.target + (r.target || 0), actual: s.actual + r.actual, bookings: s.bookings + r.bookings }), { target: 0, actual: 0, bookings: 0 });
  summary.push({ 'Rep': 'TEAM TOTAL', 'Target (CBM)': round1(t.target), 'Booked (CBM)': round1(t.actual), 'Achieved': t.target ? `${Math.round((t.actual / t.target) * 100)}%` : 'No target', 'Bookings': t.bookings });

  const missed = rows.flatMap(r => r.missed).map(m => ({ 'Rep': m.rep, 'Inquiry': m.id, 'Shipper': m.shipper, 'What was missed': m.issue }));
  const outstanding = rows.flatMap(r => r.outstanding).map(m => ({ 'Rep': m.rep, 'Inquiry': m.id, 'Shipper': m.shipper, 'Open item': m.issue }));
  const plan = rows.map(r => ({
    'Rep': r.rep.name,
    'Next week target (CBM)': r.nextTarget ?? 'Not set',
    'Open quotes awaiting customer': r.pipelineCount,
    'Open quotes volume (CBM)': r.pipelineCbm,
    'Quotes expiring next week': r.expiringNext.length,
    'Follow-ups to clear': r.followUpsDue,
  }));
  const expiring = rows.flatMap(r => r.expiringNext).map(m => ({ 'Rep': m.rep, 'Inquiry': m.id, 'Shipper': m.shipper, 'Note': m.issue }));

  const header = [
    ['Polestar Consolidators & Freight Forwarders Pvt Ltd'],
    [`Weekly CS Report (target vs actual, CBM): ${weekLabel(range)}`],
    [`Prepared by: ${preparedBy || 'CS Manager'} on ${new Date().toLocaleString('en-IN')}`],
    [],
  ];
  const sheet = (rowsArr, empty, withHeader = false) => {
    const data = rowsArr.length ? rowsArr : [{ Note: empty }];
    const ws = withHeader ? XLSX.utils.aoa_to_sheet(header) : XLSX.utils.json_to_sheet(data);
    if (withHeader) XLSX.utils.sheet_add_json(ws, data, { origin: 'A5' });
    ws['!cols'] = Object.keys(data[0]).map(k => ({ wch: Math.max(14, k.length + 2) }));
    return ws;
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet(summary, 'No reps yet.', true), 'Target vs Actual');
  XLSX.utils.book_append_sheet(wb, sheet(missed, 'Nothing missed this week.'), 'Missed This Week');
  XLSX.utils.book_append_sheet(wb, sheet(outstanding, 'Nothing outstanding.'), 'Outstanding Now');
  XLSX.utils.book_append_sheet(wb, sheet(plan, 'No reps yet.'), 'Next Week Plan');
  XLSX.utils.book_append_sheet(wb, sheet(expiring, 'No quotes expire next week.'), 'Expiring Next Week');
  XLSX.writeFile(wb, `Polestar_Weekly_Team_Report_${dayKey(range.from)}.xlsx`);
}
