// Helps the rep write next week's plan: how the last two weeks went, tasks
// suggested from their own inquiries, and the Excel to send the VP for review.
import * as XLSX from 'xlsx';
import { addDays, dayKey, formatDay, getNominations } from './nominations';
import { repWeekReport, round1 } from './teamReport';
import { followUpState, isWaitingOnCustomer } from './followUps';
import { PLAN_DAYS } from './planReader';

const LONG = { day: '2-digit', month: 'short', year: 'numeric' };
const monday = (weekStart) => new Date(`${weekStart}T00:00:00`);
const route = (i) => `${i.polCode || i.pol || '?'} ➔ ${i.podCode || i.pod || '?'}`;

let uid = 0;
const newId = () => `${Date.now().toString(36)}-${(uid++).toString(36)}`;

export function blankPlan(weekStart) {
  const m = monday(weekStart);
  return {
    weekStart,
    sourceName: 'Created in the app',
    importedAt: new Date().toISOString(),
    datesFromFile: false,
    status: 'draft',
    proposedTargetCbm: null,
    reviewNote: '',
    targets: [],
    general: [],
    extras: [],
    days: PLAN_DAYS.map((day, i) => ({ day, date: dayKey(addDays(m, i)), area: '', items: [] })),
  };
}

// The two full weeks before the plan's week: "this week" (just finished or
// finishing) and "last week", for the comparison the VP looks at.
export function performanceReview(inquiries, targets, rep, weekStart, now = Date.now()) {
  const m = monday(weekStart);
  const recent = { from: addDays(m, -7), to: m };
  const previous = { from: addDays(m, -14), to: addDays(m, -7) };
  const stats = (range) => {
    const r = repWeekReport(rep, inquiries, targets, range, now);
    const quotes = inquiries.filter(i => i.isQuoted && i.repliedAt && Date.parse(i.repliedAt) >= range.from && Date.parse(i.repliedAt) < range.to).length;
    return { ...r, quotes, range, conversion: quotes ? Math.round((r.bookings / quotes) * 100) : null };
  };
  return { recent: stats(recent), previous: stats(previous) };
}

export const REVIEW_ROWS = [
  ['Target (CBM)', r => r.target ?? '—'],
  ['Booked (CBM)', r => r.actual, true],
  ['Achieved', r => (r.pct === null ? '—' : `${r.pct}%`), true, r => r.pct],
  ['Bookings', r => r.bookings, true],
  ['Inquiries received', r => r.received, true],
  ['Quotes sent', r => r.quotes, true],
  ['Quote → booking', r => (r.conversion === null ? '—' : `${r.conversion}%`), true, r => r.conversion],
  ['Avg reply time', r => (r.avgTat === null ? '—' : `${r.avgTat} min`), false, r => r.avgTat],
  ['Lost', r => r.lost, false],
];

// Task ideas from the rep's own data, most urgent first. Each quote gets only its most urgent suggestion.
export function buildSuggestions(inquiries, weekStart, now = Date.now()) {
  const m = monday(weekStart);
  const weekEnd = addDays(m, 7);
  const out = [];
  const seen = new Set();
  const add = (key, text, reason) => {
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ key, text, reason });
  };

  for (const i of inquiries) {
    const fu = followUpState(i, now);
    if (fu?.stage === 'cold') add(`quote-${i.id}`, `Call ${i.shipperName}: no reply to quote ${i.id} (${route(i)})`, 'Gone quiet');
  }
  for (const i of inquiries) {
    if (!i.isQuoted || !i.quoteValidity || !isWaitingOnCustomer(i)) continue;
    const end = new Date(`${i.quoteValidity}T23:59:59`);
    if (end < weekEnd) add(`quote-${i.id}`, `Push ${i.shipperName} to confirm quote ${i.id} before it expires ${formatDay(end, { day: '2-digit', month: 'short' })}`, 'Quote expiring');
  }
  for (const i of inquiries) {
    if (i.isQuoted && isWaitingOnCustomer(i)) add(`quote-${i.id}`, `Follow up ${i.shipperName} on quote ${i.id} (${route(i)}${i.quotedRate ? `, ${i.quotedRate}` : ''})`, 'Open quote');
  }
  const fourWeeksAgo = addDays(m, -28).getTime();
  for (const i of inquiries) {
    if (i.status === 'CLOSED_LOST' && /price/i.test(i.lostReason || '') && Date.parse(i.updatedAt || i.receivedAt) >= fourWeeksAgo) {
      add(`price-${i.shipperName}`, `Revisit ${i.shipperName} with a sharper rate for ${route(i)}`, 'Lost on price');
    }
  }
  const repeat = getNominations(inquiries).filter(n => Date.parse(n.confirmedAt) >= fourWeeksAgo).reverse();
  for (const n of repeat) {
    add(`repeat-${n.shipperName}`, `Ask ${n.shipperName} for their next shipment (booked ${round1(n.volumeCbm)} CBM, ${n.pol} ➔ ${n.pod})`, 'Repeat business');
  }
  return out;
}

// The plan in the familiar layout (a column per day: day, date, area, tasks),
// plus the performance comparison and the proposed target.
export function exportPlanExcel(plan, review, preparedBy) {
  const m = monday(plan.weekStart);
  const label = `${formatDay(m, LONG)} – ${formatDay(addDays(m, 5), LONG)}`;
  const height = Math.max(0, ...plan.days.map(d => d.items.length));
  const grid = [
    plan.days.map(d => d.day),
    plan.days.map(d => formatDay(`${d.date}T00:00:00`, { day: '2-digit', month: 'short', year: 'numeric' })),
    plan.days.map(d => d.area || ''),
    ...Array.from({ length: height }, (_, r) => plan.days.map(d => (d.items[r] ? d.items[r].text : ''))),
  ];
  const planSheet = XLSX.utils.aoa_to_sheet(grid);
  planSheet['!cols'] = plan.days.map(() => ({ wch: 34 }));

  const perf = [
    ['Polestar Consolidators & Freight Forwarders Pvt Ltd'],
    [`Weekly plan for ${label}`],
    [`Prepared by: ${preparedBy || 'CS'} on ${new Date().toLocaleString('en-IN')}`],
    [],
    ['Proposed target for this week (CBM)', plan.proposedTargetCbm ?? 'Not set'],
    ['Status', plan.status === 'final' || plan.status === 'approved'
      ? `Finalised with VP${plan.finalizedAt ? ` on ${new Date(plan.finalizedAt).toLocaleDateString('en-GB')}` : ''}`
      : 'Draft'],
    ["VP's comments", plan.reviewNote || ''],
    [],
    ['', `Week of ${formatDay(review.recent.range.from, LONG)}`, `Week of ${formatDay(review.previous.range.from, LONG)}`],
    ...REVIEW_ROWS.map(([name, get]) => [name, get(review.recent), get(review.previous)]),
  ];
  if (plan.general.length) perf.push([], ['Any day this week'], ...plan.general.map(i => [i.text]));
  const perfSheet = XLSX.utils.aoa_to_sheet(perf);
  perfSheet['!cols'] = [{ wch: 36 }, { wch: 24 }, { wch: 24 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, planSheet, 'Plan');
  XLSX.utils.book_append_sheet(wb, perfSheet, 'Performance & Target');
  XLSX.writeFile(wb, `Polestar_Weekly_Plan_${plan.weekStart}.xlsx`);
}

export function suggestionToItem(text) {
  return { id: newId(), text, done: false, note: '' };
}
