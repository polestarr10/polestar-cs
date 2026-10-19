// CS inquiry report (daily / weekly) as Excel. Every figure is computed from
// the inquiries themselves; anything that can't be measured says so.
import * as XLSX from 'xlsx';
import { STATUS_CONFIG } from '../components/StatusBadge';
import { isAwaitingReply, minutesWaiting, formatWaiting, REMINDER_INTERVAL_MIN } from '../hooks/useReplyReminders';

const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const statusLabel = (s) => STATUS_CONFIG[s]?.label || s || '';

// Quoted amounts per currency, e.g. "USD 3,450 · INR 12,000" (never summed across currencies).
function quotedByCurrency(list) {
  const sums = {};
  for (const i of list) {
    if (!i.isQuoted || !(i.quotedAmountTotal > 0)) continue;
    const c = i.quotedCurrency || 'USD';
    sums[c] = (sums[c] || 0) + i.quotedAmountTotal;
  }
  const parts = Object.entries(sums).map(([c, v]) => `${c} ${v.toLocaleString()}`);
  return parts.length ? parts.join(' · ') : 'None quoted';
}

const QUOTE_RE = /Quotation reply sent|Revised quotation sent/i;
const REVISED_RE = /Revised quotation sent/i;
const LOST_RE = /declined|closed as lost|CLOSED_LOST/i;

// range: { from: Date, to: Date } or null for all time.
const inRange = (iso, range) => {
  const t = Date.parse(iso || '');
  if (isNaN(t)) return false;
  return !range || (t >= range.from.getTime() && t < range.to.getTime());
};

const entriesInRange = (i, range, re) => (i.auditLog || []).filter(e => re.test(e.action || '') && inRange(e.timestamp, range));

// Every inquiry something happened to in the period, with what happened.
export function activityInRange(inquiries, range) {
  return inquiries
    .map(i => {
      const events = [
        inRange(i.receivedAt, range) && { at: i.receivedAt, what: 'Inquiry received' },
        ...(i.auditLog || []).filter(e => inRange(e.timestamp, range) && !/^Logged from email/i.test(e.action || '')).map(e => ({ at: e.timestamp, what: e.action })),
      ].filter(Boolean).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      return events.length ? { inquiry: i, events } : null;
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.events[b.events.length - 1].at) - Date.parse(a.events[a.events.length - 1].at));
}

export function reportMetrics(inquiries, range = null, now = Date.now()) {
  const received = inquiries.filter(i => inRange(i.receivedAt, range));
  const quoteEntries = inquiries.flatMap(i => entriesInRange(i, range, QUOTE_RE).map(e => ({ i, e })));
  const quotedInquiries = [...new Set(quoteEntries.map(q => q.i))];
  const revised = quoteEntries.filter(q => REVISED_RE.test(q.e.action)).length;
  const followUps = inquiries.reduce((n, i) => n + (i.followUps || []).filter(f => inRange(f.at, range)).length, 0);
  const customerReplies = inquiries.reduce((n, i) => n + entriesInRange(i, range, /^Customer replied/i).length, 0);
  const won = inquiries.filter(i => i.status === 'BOOKING_WON' && inRange(i.confirmedAt, range));
  const lost = inquiries.filter(i => i.status === 'CLOSED_LOST' && entriesInRange(i, range, LOST_RE).length > 0);
  // Reply speed: how long the customer waited for each reply we sent in the period.
  const tats = inquiries.filter(i => inRange(i.repliedAt, range)).map(i => i.responseTatMinutes).filter(t => typeof t === 'number' && t >= 0);
  const avgTat = tats.length ? Math.round(tats.reduce((a, b) => a + b, 0) / tats.length) : null;
  const onTime = tats.length ? Math.round((tats.filter(t => t <= REMINDER_INTERVAL_MIN).length / tats.length) * 100) : null;
  // Right now, whatever the period.
  const awaiting = inquiries.filter(isAwaitingReply);
  const waitingOnCustomer = inquiries.filter(i => i.hasReplied && !['BOOKING_WON', 'CLOSED_LOST'].includes(i.status) && !isAwaitingReply(i));
  return {
    total: received.length,
    quotesSent: quoteEntries.length,
    quotedCount: quotedInquiries.length,
    revised,
    followUps,
    customerReplies,
    won: won.length,
    bookedCbm: Math.round(won.reduce((s, i) => s + (Number(i.volumeCbm) || 0), 0) * 100) / 100,
    lost: lost.length,
    awaiting: awaiting.length,
    overdue: awaiting.filter(i => minutesWaiting(i, now) >= REMINDER_INTERVAL_MIN).length,
    waitingOnCustomer: waitingOnCustomer.length,
    avgTat,
    onTime,
    tatSample: tats.length,
    quoted: quotedByCurrency(quotedInquiries),
    activityCount: activityInRange(inquiries, range).length,
  };
}

// What the inquiry is waiting on, from its real state and history.
function pendingReason(i, now) {
  if (isAwaitingReply(i)) {
    const waited = formatWaiting(minutesWaiting(i, now));
    return i.awaitingSince && i.awaitingSince !== i.receivedAt
      ? `Customer replied; awaiting our response for ${waited}`
      : `Awaiting our first reply for ${waited}`;
  }
  const log = i.auditLog || [];
  const last = log[log.length - 1];
  return last ? `${statusLabel(i.status)} – last: ${last.action}` : statusLabel(i.status);
}

function header(opts) {
  return [
    ['Polestar Consolidators & Freight Forwarders Pvt Ltd'],
    [`CS Inquiry Report – ${opts.periodLabel || ''}`],
    [`Prepared by: ${opts.preparedBy || 'CS Desk'}${opts.recipient ? `   |   For: ${opts.recipient}` : ''}${opts.branch ? `   |   Branch: ${opts.branch}` : ''}`],
    [`Generated: ${fmtDateTime(new Date().toISOString())}`],
    [],
  ];
}

// Values are text so the column reads cleanly in Excel.
function summaryRows(m) {
  return [
    ['IN THIS PERIOD', ''],
    ['New inquiries received', String(m.total)],
    ['Quotations sent', `${m.quotesSent}${m.revised ? ` (incl. ${m.revised} revised)` : ''} to ${m.quotedCount} customer${m.quotedCount === 1 ? '' : 's'}`],
    ['Follow-ups sent', String(m.followUps)],
    ['Customer replies logged', String(m.customerReplies)],
    ['Bookings confirmed', `${m.won}${m.won ? ` (${m.bookedCbm} CBM)` : ''}`],
    ['Closed / lost', String(m.lost)],
    ['Average reply time', m.avgTat === null ? 'No replies sent yet' : `${m.avgTat} min (over ${m.tatSample} repl${m.tatSample === 1 ? 'y' : 'ies'})`],
    [`Replies within ${REMINDER_INTERVAL_MIN} min`, m.onTime === null ? '-' : `${m.onTime}%`],
    ['Value of quotes sent', m.quoted],
    [],
    ['RIGHT NOW', ''],
    ['Waiting for our reply', `${m.awaiting}${m.overdue ? ` (${m.overdue} waiting over ${REMINDER_INTERVAL_MIN} min)` : ''}`],
    ['Waiting on the customer', String(m.waitingOnCustomer)],
  ];
}

// inquiries: all of the rep's inquiries; opts.range: the period ({ from, to }) or null.
export function exportInquiriesToExcel(inquiries, opts = {}) {
  const now = Date.now();
  const range = opts.range || null;
  const m = reportMetrics(inquiries, range, now);
  const activity = activityInRange(inquiries, range);
  const fmtTime = (iso) => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const masterRows = activity.map(({ inquiry: i, events }, idx) => ({
    'S.No': idx + 1,
    'Inquiry Ref': i.id,
    'What happened in this period': events.map(e => `${fmtTime(e.at)}: ${e.what}`).join('\n'),
    'Received': fmtDateTime(i.receivedAt),
    'Shipper / Company': i.shipperName || '',
    'GSTIN': i.gstin || '',
    'Contact Person': i.contactPerson || '',
    'Email': i.contactEmail || '',
    'Phone': i.contactPhone || '',
    'POL': i.pol || '',
    'POD': i.pod || '',
    'Mode': i.routingMode || '',
    'Equipment': i.containerType || '',
    'Gross Wt (KG)': i.grossWeightKg || '',
    'Volume (CBM)': i.volumeCbm || '',
    'Commodity': i.commodity || '',
    'Incoterms': i.incoterms || '',
    'Import / Export': i.direction || '',
    'Packages': i.packages || '',
    'HSN Code': i.hsnCode || '',
    'Pickup Address': i.pickupAddress || '',
    'Handled By': i.assignedTo || '',
    'Replied?': i.hasReplied ? 'Yes' : 'No',
    'Replied At': fmtDateTime(i.repliedAt),
    'Reply Time (min)': typeof i.responseTatMinutes === 'number' ? i.responseTatMinutes : '',
    'Quoted Rate': i.quotedRate || '',
    'Free Days at POD': i.freeDaysAtPod || '',
    'Status': statusLabel(i.status),
    'Lost Reason': i.lostReason || '',
    'Summary': i.conversationGist || '',
  }));

  const pendingRows = inquiries
    .filter(i => !['BOOKING_WON', 'CLOSED_LOST'].includes(i.status))
    // Ours to answer first (longest wait at the top), then those waiting on the customer.
    .sort((a, b) => (isAwaitingReply(b) - isAwaitingReply(a)) || (minutesWaiting(b, now) - minutesWaiting(a, now)))
    .map((i, idx) => ({
      'Priority': idx + 1,
      'Inquiry Ref': i.id,
      'Shipper': i.shipperName || '',
      'Route': `${i.polCode || i.pol || '?'} -> ${i.podCode || i.pod || '?'}`,
      'Equipment / Cargo': [i.containerType, i.commodity].filter(Boolean).join(' – '),
      'Status': statusLabel(i.status),
      'Where it stands': pendingReason(i, now),
      'Handled By': i.assignedTo || '',
      'Urgent': i.urgency === 'HIGH' ? 'Yes' : '',
    }));

  const wb = XLSX.utils.book_new();

  const summary = XLSX.utils.aoa_to_sheet([...header(opts), ['Metric', 'Value'], ...summaryRows(m)]);
  summary['!cols'] = [{ wch: 36 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, summary, 'Summary');

  const master = XLSX.utils.json_to_sheet(masterRows.length ? masterRows : [{ Note: 'No activity in this period.' }]);
  master['!cols'] = Object.keys(masterRows[0] || { Note: '' }).map(k => ({ wch: k === 'Summary' || k.startsWith('What happened') ? 60 : Math.max(12, k.length + 2) }));
  XLSX.utils.book_append_sheet(wb, master, 'Inquiries');

  const pending = XLSX.utils.json_to_sheet(pendingRows.length ? pendingRows : [{ Note: 'Nothing pending.' }]);
  pending['!cols'] = [{ wch: 9 }, { wch: 16 }, { wch: 30 }, { wch: 20 }, { wch: 36 }, { wch: 20 }, { wch: 55 }, { wch: 24 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, pending, 'Pending_Actions');

  const filename = `Polestar_CS_Report_${opts.fileStamp || new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  return { filename, metrics: m };
}

const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STATUS_STYLE = {
  BOOKING_WON: 'background:#d1fae5;color:#065f46;font-weight:bold;',
  QUOTED_REPLIED: 'background:#ecfdf5;color:#047857;font-weight:600;',
  NEGOTIATING: 'background:#fef9c3;color:#854d0e;font-weight:600;',
  INQUIRY_RECEIVED: 'background:#fef3c7;color:#92400e;font-weight:600;',
  UNDER_REVIEW: 'background:#e0f2fe;color:#0369a1;font-weight:600;',
  FOLLOWUP_NEEDED: 'background:#f3e8ff;color:#6b21a8;font-weight:600;',
  CLOSED_LOST: 'background:#ffe4e6;color:#9f1239;font-weight:600;',
};

// Colour-coded sheet (HTML that Excel opens as .xls).
export function exportColorCodedHtmlExcel(inquiries, opts = {}) {
  const now = Date.now();
  const m = reportMetrics(inquiries, opts.range || null, now);
  const list = activityInRange(inquiries, opts.range || null).map(a => a.inquiry);
  const cell = 'border:1px solid #cbd5e1;padding:6px 8px;font-size:10pt;';
  const th = 'background:#1e293b;color:#f8fafc;font-weight:bold;border:1px solid #cbd5e1;padding:8px;font-size:10pt;';

  const rows = list.map(i => `
    <tr>
      <td style="${cell}font-family:monospace;font-weight:bold;">${escapeHtml(i.id)}</td>
      <td style="${cell}">${escapeHtml(fmtDateTime(i.receivedAt))}</td>
      <td style="${cell}font-weight:600;">${escapeHtml(i.shipperName)}</td>
      <td style="${cell}">${escapeHtml(i.pol)}</td>
      <td style="${cell}">${escapeHtml(i.pod)}</td>
      <td style="${cell}">${escapeHtml(i.containerType)}</td>
      <td style="${cell}text-align:right;">${i.grossWeightKg ? escapeHtml(i.grossWeightKg.toLocaleString()) + ' KG' : ''}</td>
      <td style="${cell}">${escapeHtml(i.commodity)}</td>
      <td style="${cell}">${escapeHtml(i.assignedTo)}</td>
      <td style="${cell}text-align:center;font-weight:bold;color:${i.hasReplied ? '#16a34a' : '#ea580c'};">${i.hasReplied ? `Yes${typeof i.responseTatMinutes === 'number' ? ` (${i.responseTatMinutes} min)` : ''}` : 'No'}</td>
      <td style="${cell}font-weight:bold;">${escapeHtml(i.quotedRate)}</td>
      <td style="${cell}${STATUS_STYLE[i.status] || ''}">${escapeHtml(statusLabel(i.status))}</td>
      <td style="${cell}color:#475569;">${escapeHtml(i.conversationGist)}</td>
    </tr>`).join('');

  const summary = summaryRows(m).map(([k, v]) => `<tr><td style="${cell}font-weight:bold;background:#f1f5f9;">${escapeHtml(k)}</td><td colspan="4" style="${cell}">${escapeHtml(v)}</td></tr>`).join('');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta http-equiv="content-type" content="text/plain; charset=UTF-8"/></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;">
<table style="border-collapse:collapse;">
  <tr><td colspan="13" style="font-size:15pt;font-weight:bold;padding:8px;">Polestar Consolidators &amp; Freight Forwarders Pvt Ltd</td></tr>
  <tr><td colspan="13" style="font-size:11pt;padding:4px 8px;">CS Inquiry Report – ${escapeHtml(opts.periodLabel || '')}</td></tr>
  <tr><td colspan="13" style="font-size:10pt;padding:4px 8px;">Prepared by: ${escapeHtml(opts.preparedBy || 'CS Desk')}${opts.recipient ? ` | For: ${escapeHtml(opts.recipient)}` : ''}${opts.branch ? ` | Branch: ${escapeHtml(opts.branch)}` : ''} | Generated: ${escapeHtml(fmtDateTime(new Date().toISOString()))}</td></tr>
  <tr><td colspan="13" style="height:8px;"></td></tr>
  ${summary}
  <tr><td colspan="13" style="height:12px;"></td></tr>
  <tr>
    <th style="${th}">Inquiry Ref</th><th style="${th}">Received</th><th style="${th}">Shipper</th><th style="${th}">POL</th>
    <th style="${th}">POD</th><th style="${th}">Equipment</th><th style="${th}">Gross Wt</th><th style="${th}">Commodity</th>
    <th style="${th}">Handled By</th><th style="${th}">Replied?</th><th style="${th}">Quoted Rate</th><th style="${th}">Status</th><th style="${th}">Summary</th>
  </tr>
  ${rows || `<tr><td colspan="13" style="${cell}">No activity in this period.</td></tr>`}
</table>
</body></html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Polestar_CS_Report_${opts.fileStamp || new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return { metrics: m };
}
