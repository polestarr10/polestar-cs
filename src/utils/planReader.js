// Reads a weekly plan (Excel, CSV, or pasted text) into a day-wise
// checklist. Expected shapes, in any sheet:
//  - one column per weekday: day name, then optionally a date and an area/focus,
//    then one task per cell below;
//  - or days down a column, with the tasks to the right / on following rows;
//  - or plain text: "Monday: ..." lines followed by bulleted tasks.
// Targets ("Target ... 60 CBM") are picked up from anywhere in the file.
import * as XLSX from 'xlsx';
import { addDays, dayKey } from './nominations';
import { weekKey } from '../lib/team';

export const PLAN_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const DAY_ALIASES = {
  MONDAY: ['monday', 'mon'],
  TUESDAY: ['tuesday', 'tues', 'tue'],
  WEDNESDAY: ['wednesday', 'wed'],
  THURSDAY: ['thursday', 'thurs', 'thur', 'thu'],
  FRIDAY: ['friday', 'fri'],
  SATURDAY: ['saturday', 'sat'],
};

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

// A date from a cell: Date object, Excel serial number, or common text forms.
export function cellDate(v) {
  // Excel dates can come back a few seconds/hours before midnight because of
  // time zones, so snap to the nearest day.
  if (v instanceof Date && !isNaN(v)) {
    const d = new Date(v.getTime() + 12 * 3600000);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  if (typeof v === 'number' && v > 40000 && v < 60000) return new Date(Math.round((v - 25569) * 86400000) + new Date().getTimezoneOffset() * 60000);
  const s = clean(v);
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const d = new Date(y, Number(m[2]) - 1, Number(m[1]));
    return isNaN(d) ? null : d;
  }
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]{3})[a-z]*[\s,-]+(\d{2,4})$/i);
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return new Date(y, MONTHS[m[2].toLowerCase()], Number(m[1]));
  }
  return null;
}

// "Monday", "MONDAY 19/10/2026", "Mon -" -> { day, date }. Full names may carry
// a date after them; short forms must stand alone so "Mon Exports" isn't a day.
function matchDay(v) {
  const s = clean(v).replace(/[:\-–]+$/, '').trim();
  for (const [day, aliases] of Object.entries(DAY_ALIASES)) {
    for (const a of aliases) {
      const re = new RegExp(`^${a}\\b[\\s,:\\-–]*(.*)$`, 'i');
      const m = s.match(re);
      if (!m) continue;
      const rest = m[1].trim();
      if (!rest) return { day, date: null };
      if (a === aliases[0]) {
        const date = cellDate(rest);
        if (date) return { day, date };
      }
    }
  }
  return null;
}

// "Target: 60 CBM", or a "Target" cell with the number in the next cell.
const TARGET_RE = /(\d[\d,]*(?:\.\d+)?)\s*(cbm|teu|containers?|boxes|shipments?|bookings?|calls?|visits?|meetings?|inquiries|enquiries)\b/i;

export function findTargets(rows) {
  const found = [];
  const seen = new Set();
  const push = (label, value, unit) => {
    const key = `${label}|${value}|${unit}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ label, value: Number(String(value).replace(/,/g, '')), unit: unit.toUpperCase() === 'CBM' || unit.toUpperCase() === 'TEU' ? unit.toUpperCase() : unit.toLowerCase() });
  };
  rows.forEach((row) => row.forEach((cell, c) => {
    const s = clean(cell);
    if (!/target|goal|aim/i.test(s)) return;
    const m = s.match(TARGET_RE);
    if (m) { push(s.replace(TARGET_RE, '').replace(/[:\-–]+\s*$/, '').trim() || 'Target', m[1], m[2]); return; }
    // Number (and maybe unit) in the next non-empty cells of the row.
    const next = row.slice(c + 1).map(clean).filter(Boolean).slice(0, 2).join(' ');
    const n = next.match(TARGET_RE) || next.match(/^(\d[\d,]*(?:\.\d+)?)\s*([a-z]*)/i);
    if (n) push(s.replace(/[:\-–]+\s*$/, ''), n[1], n[2] || '');
  }));
  return found.filter(t => t.value > 0);
}

let uid = 0;
const newItem = (text) => ({ id: `${Date.now().toString(36)}-${(uid++).toString(36)}`, text, done: false, note: '' });

// Splits one day's cells into date, area/focus heading and tasks.
function buildDay(day, headerDate, cells) {
  let date = headerDate;
  const texts = [];
  for (const v of cells) {
    const d = cellDate(v);
    if (d && !date && !texts.length) { date = d; continue; }
    const s = clean(v);
    if (s && !/^#+$/.test(s)) texts.push(s);
  }
  // In the usual sheet the first line under the date is the area / focus for the day.
  const area = texts.length > 1 ? texts.shift() : '';
  return { day, date: date ? dayKey(date) : null, area, items: texts.map(newItem) };
}

function parseGrid(rows) {
  const hits = [];
  rows.forEach((row, r) => row.forEach((cell, c) => {
    const m = matchDay(cell);
    if (m) hits.push({ ...m, r, c });
  }));
  if (hits.length < 2) return null;

  const sameRow = hits.filter(h => h.r === hits[0].r).length >= 2;
  const days = [];
  if (sameRow) {
    // Days across a header row; tasks run down each column until the next header row.
    for (const h of hits) {
      const nextHeaderRow = hits.filter(x => x.c === h.c && x.r > h.r).map(x => x.r).sort((a, b) => a - b)[0] ?? rows.length;
      const cells = rows.slice(h.r + 1, nextHeaderRow).map(row => row[h.c]);
      days.push(buildDay(h.day, h.date, cells));
    }
  } else {
    // Days down a column; each day's tasks are to its right and on the rows until the next day.
    const sorted = [...hits].sort((a, b) => a.r - b.r);
    sorted.forEach((h, i) => {
      const end = sorted[i + 1]?.r ?? rows.length;
      const cells = [];
      for (let r = h.r; r < end; r++) cells.push(...(rows[r] || []).slice(r === h.r ? h.c + 1 : h.c));
      days.push(buildDay(h.day, h.date, cells));
    });
  }
  return days;
}

function parseLines(text) {
  const days = [];
  const general = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*(?:[-•*▪●◦]|\d+[.)])\s*/, '').trim();
    if (!line) continue;
    const head = line.match(/^([a-z]+)\b\s*(?:\(([^)]*)\))?\s*[:\-–]?\s*(.*)$/i);
    // Short forms ("Sat") only count when followed by ":" / "-" / "(", or alone.
    const dm = head && matchDay(head[1]) && (head[1].length >= 6 || /^[a-z]+\s*(?:[(:\-–]|$)/i.test(line)) ? matchDay(head[1]) : null;
    if (dm) {
      current = { day: dm.day, date: null, area: '', items: [] };
      // "Monday (19/10/2026): Belapur office" or "Monday 19/10/2026 - Belapur office"
      const bracketDate = head[2] && cellDate(head[2]);
      const rest = (bracketDate ? head[3] : [head[2], head[3]].filter(Boolean).join(' ')).trim();
      const [first, ...others] = rest.split(/\s+[-–]\s+|\s*[,:]\s*/);
      const date = bracketDate || cellDate(first);
      if (date) current.date = dayKey(date);
      current.area = (date && !bracketDate ? others.join(', ') : rest).trim();
      days.push(current);
      continue;
    }
    if (current) current.items.push(newItem(line));
    else general.push(line);
  }
  return days.length ? { days, general } : null;
}

// Merges repeated sections for the same day (e.g. a plan spread over two blocks).
function mergeDays(days) {
  const byDay = new Map();
  for (const d of days) {
    const prev = byDay.get(d.day);
    if (!prev) { byDay.set(d.day, { ...d }); continue; }
    prev.items.push(...d.items);
    prev.date = prev.date || d.date;
    prev.area = prev.area || d.area;
  }
  return PLAN_DAYS.filter(d => byDay.has(d)).map(d => byDay.get(d));
}

// Fills in the week and each day's date. fallbackWeek: 'YYYY-MM-DD' Monday.
function finish({ days, targets, extras, general, sourceName }, fallbackWeek) {
  const merged = mergeDays(days);
  const firstDated = merged.find(d => d.date);
  let weekStart = fallbackWeek;
  if (firstDated) {
    const monday = addDays(new Date(`${firstDated.date}T00:00:00`), -PLAN_DAYS.indexOf(firstDated.day));
    weekStart = weekKey(monday);
  }
  const monday = new Date(`${weekStart}T00:00:00`);
  const all = PLAN_DAYS.map((day, i) => {
    const d = merged.find(x => x.day === day) || { day, area: '', items: [] };
    return { ...d, date: d.date || dayKey(addDays(monday, i)) };
  });
  return {
    weekStart,
    sourceName,
    importedAt: new Date().toISOString(),
    datesFromFile: Boolean(firstDated),
    targets,
    days: all,
    general: (general || []).map(newItem),
    extras,
  };
}

// Returns a plan, or throws an Error with a message for the rep.
export async function readPlanFile(file, fallbackWeek) {
  const name = file.name || 'plan';
  if (/\.pdf$/i.test(name)) {
    throw new Error("PDFs can't be read reliably without the AI reader. Upload the Excel file instead, or copy the cells from Excel and paste them.");
  }
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const days = [];
  const targets = [];
  const extras = [];
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, defval: '' });
    targets.push(...findTargets(rows));
    const found = parseGrid(rows);
    if (found) days.push(...found);
    else {
      const kept = rows.filter(r => r.some(c => clean(c))).slice(0, 60)
        .map(r => r.map(c => (c instanceof Date ? c.toLocaleDateString('en-GB') : clean(c))));
      if (kept.length) extras.push({ sheet: sheetName, rows: kept });
    }
  }
  if (!days.length) {
    throw new Error("Couldn't find any weekdays (Monday, Tuesday…) in this file. The plan needs a day name above or beside each day's tasks.");
  }
  return finish({ days, targets, extras, sourceName: name }, fallbackWeek);
}

export function readPlanText(text, fallbackWeek) {
  const trimmed = (text || '').trim();
  if (!trimmed) throw new Error('Paste the plan first.');
  // Cells copied from Excel arrive tab-separated.
  if (trimmed.includes('\t')) {
    const rows = trimmed.split(/\r?\n/).map(l => l.split('\t'));
    const days = parseGrid(rows);
    if (days) return finish({ days, targets: findTargets(rows), extras: [], sourceName: 'Pasted from Excel' }, fallbackWeek);
  }
  const parsed = parseLines(trimmed);
  if (!parsed) throw new Error("Couldn't find any weekdays (Monday, Tuesday…) in the text. Start each day's tasks with the day name, e.g. \"Monday: Belapur office\".");
  const targets = findTargets(trimmed.split(/\r?\n/).map(l => [l]));
  return finish({ ...parsed, targets, extras: [], sourceName: 'Pasted text' }, fallbackWeek);
}
