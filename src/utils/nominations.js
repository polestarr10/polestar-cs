// Nomination sheet: confirmed bookings (status BOOKING_WON), bucketed by the
// day the customer confirmed, with daily and period totals.
import * as XLSX from 'xlsx';

const TEU_PER_BOX = { '20': 1, '40': 2, '45': 2.25 };

// "2x40' HC" -> { count: 2, size: '40' }; LCL / air -> count 0.
export function parseEquipment(containerType) {
  const m = (containerType || '').match(/(\d{1,3})\s*x\s*(20|40|45)/i);
  if (m) return { count: Number(m[1]), size: m[2] };
  const single = (containerType || '').match(/\b(20|40|45)\s*'/);
  return single ? { count: 1, size: single[1] } : { count: 0, size: null };
}

// The time the customer confirmed. Older records without confirmedAt fall back
// to when the status was set to won.
export function confirmationTime(inquiry) {
  if (inquiry.confirmedAt) return inquiry.confirmedAt;
  const wonEntry = [...(inquiry.auditLog || [])].reverse().find(e => /BOOKING_WON|Booking confirmed/i.test(e.action || ''));
  return wonEntry?.timestamp || inquiry.updatedAt || inquiry.receivedAt;
}

export function toNomination(inquiry) {
  const n = inquiry.nomination || {};
  const equipment = n.containerType || inquiry.containerType || '';
  const parsed = parseEquipment(equipment);
  const containers = n.containerCount !== undefined && n.containerCount !== '' ? Number(n.containerCount) || 0 : parsed.count;
  return {
    inquiry,
    id: inquiry.id,
    confirmedAt: confirmationTime(inquiry),
    bookingRef: n.bookingRef || '',
    shipperName: inquiry.shipperName || '',
    contactPerson: n.confirmedBy || inquiry.contactPerson || '',
    pol: inquiry.polCode || inquiry.pol || '',
    pod: inquiry.podCode || inquiry.pod || '',
    equipment,
    containers,
    teu: parsed.size ? containers * TEU_PER_BOX[parsed.size] : 0,
    volumeCbm: Number(inquiry.volumeCbm) || 0,
    grossWeightKg: Number(inquiry.grossWeightKg) || 0,
    commodity: inquiry.commodity || '',
    rate: n.finalRate || inquiry.quotedRate || '',
    carrier: n.carrier || inquiry.preferredCarrier || '',
    etd: n.etd || '',
    handledBy: n.confirmedByRep || inquiry.assignedTo || '',
    remarks: n.remarks || '',
  };
}

export function getNominations(inquiries) {
  return inquiries
    .filter(i => i.status === 'BOOKING_WON')
    .map(toNomination)
    .sort((a, b) => new Date(a.confirmedAt) - new Date(b.confirmedAt));
}

// Inquiries that could still turn into a nomination, most promising first.
const CANDIDATE_ORDER = { NEGOTIATING: 0, QUOTED_REPLIED: 0, FOLLOWUP_NEEDED: 1, UNDER_REVIEW: 2, INQUIRY_RECEIVED: 3 };

export function lastActivity(inquiry) {
  const log = inquiry.auditLog || [];
  const last = log[log.length - 1];
  return last ? { at: last.timestamp, action: last.action } : { at: inquiry.receivedAt, action: 'Inquiry received' };
}

export function getNominationCandidates(inquiries) {
  return inquiries
    .filter(i => i.status in CANDIDATE_ORDER)
    .sort((a, b) =>
      CANDIDATE_ORDER[a.status] - CANDIDATE_ORDER[b.status] ||
      new Date(lastActivity(b).at) - new Date(lastActivity(a).at));
}

// ---- Dates (local time, weeks run Monday–Sunday) ----

export function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function startOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function addMonths(date, n) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function formatDay(date, opts = { weekday: 'short', day: '2-digit', month: 'short' }) {
  return new Date(date).toLocaleDateString('en-GB', opts);
}

const LONG = { day: '2-digit', month: 'short', year: 'numeric' };

// period: 'week' | 'month' | 'all'; anchor: any date inside the period.
export function periodRange(period, anchor) {
  if (period === 'week') {
    const from = startOfWeek(anchor);
    const to = addDays(from, 7);
    return { from, to, label: `${formatDay(from, LONG)} – ${formatDay(addDays(to, -1), LONG)}` };
  }
  if (period === 'month') {
    const from = startOfMonth(anchor);
    return { from, to: addMonths(from, 1), label: from.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) };
  }
  return { from: null, to: null, label: 'All time' };
}

export function nominationsInRange(nominations, { from, to }) {
  return nominations.filter(n => {
    const t = new Date(n.confirmedAt).getTime();
    return (!from || t >= from.getTime()) && (!to || t < to.getTime());
  });
}

export function totals(list) {
  return {
    shipments: list.length,
    containers: list.reduce((s, n) => s + n.containers, 0),
    teu: list.reduce((s, n) => s + n.teu, 0),
    volumeCbm: list.reduce((s, n) => s + n.volumeCbm, 0),
    grossWeightKg: list.reduce((s, n) => s + n.grossWeightKg, 0),
  };
}

// One row per calendar day in the range (or per day with shipments for "all time").
export function summarizeByDay(list, { from, to }) {
  const keys = from && to
    ? Array.from({ length: Math.round((to - from) / 86400000) }, (_, i) => dayKey(addDays(from, i)))
    : [...new Set(list.map(n => dayKey(n.confirmedAt)))].sort();
  return keys.map(key => {
    const dayList = list.filter(n => dayKey(n.confirmedAt) === key);
    return { key, date: new Date(`${key}T00:00:00`), list: dayList, ...totals(dayList) };
  });
}

// ---- Excel report for the period on screen ----

export function exportNominationReport(nominations, range, preparedBy) {
  const list = nominationsInRange(nominations, range);
  const days = summarizeByDay(list, range);
  const all = totals(list);
  const fmtNum = (n, d = 0) => Number(n.toFixed(d));
  const dayRow = (label, t) => ({
    'Date': label,
    'Shipments Confirmed': t.shipments,
    'Containers': t.containers,
    'TEU': fmtNum(t.teu, 2),
    'Volume (CBM)': fmtNum(t.volumeCbm, 2),
    'Gross Weight (KG)': t.grossWeightKg,
  });

  const summaryRows = [
    ...days.map(d => dayRow(formatDay(d.date, { weekday: 'long', ...LONG }), d)),
    dayRow('TOTAL', all),
  ];

  const detailRows = list.map((n, i) => ({
    'S.No': i + 1,
    'Confirmed On': new Date(n.confirmedAt).toLocaleString('en-IN'),
    'Inquiry Ref': n.id,
    'Booking / Nomination No.': n.bookingRef,
    'Shipper': n.shipperName,
    'Confirmed By (Customer)': n.contactPerson,
    'POL': n.pol,
    'POD': n.pod,
    'Equipment': n.equipment,
    'Containers': n.containers,
    'TEU': n.teu,
    'Volume (CBM)': n.volumeCbm,
    'Gross Weight (KG)': n.grossWeightKg,
    'Commodity': n.commodity,
    'Final Rate': n.rate,
    'Carrier': n.carrier,
    'ETD': n.etd,
    'Handled By': n.handledBy,
    'Remarks': n.remarks,
  }));

  const header = [
    ['Polestar Consolidators & Freight Forwarders Pvt Ltd'],
    [`Nomination Report: ${range.label}`],
    [`Prepared by: ${preparedBy || 'CS Desk'} on ${new Date().toLocaleString('en-IN')}`],
    [],
  ];

  const wb = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet(header);
  XLSX.utils.sheet_add_json(summarySheet, summaryRows, { origin: 'A5' });
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 18 }];
  const detailSheet = XLSX.utils.json_to_sheet(detailRows.length ? detailRows : [{ 'Note': 'No confirmed shipments in this period.' }]);
  detailSheet['!cols'] = Object.keys(detailRows[0] || { Note: '' }).map(k => ({ wch: Math.max(12, k.length + 2) }));

  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(wb, detailSheet, 'Nominations');
  const stamp = range.from ? `${dayKey(range.from)}_to_${dayKey(addDays(range.to, -1))}` : `all_to_${dayKey(new Date())}`;
  XLSX.writeFile(wb, `Polestar_Nominations_${stamp}.xlsx`);
}
