import React, { useState, useEffect, useMemo } from 'react';
import { X, FileSpreadsheet, Download, Check, Table } from 'lucide-react';
import { exportInquiriesToExcel, exportColorCodedHtmlExcel, reportMetrics } from '../utils/excelExporter';
import { dayKey, startOfWeek, addDays, formatDay } from '../utils/nominations';

const PREFS_KEY = 'polestar_report_prefs_v1';

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
  } catch {
    return {};
  }
}

const LONG = { day: '2-digit', month: 'short', year: 'numeric' };

function periodFor(key) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (key === 'today') return { from: today, to: addDays(today, 1), label: `Daily – ${formatDay(today, LONG)}`, stamp: dayKey(today) };
  if (key === 'week') {
    const from = startOfWeek(today);
    return { from, to: addDays(from, 7), label: `Weekly – ${formatDay(from, LONG)} to ${formatDay(addDays(from, 6), LONG)}`, stamp: `week_${dayKey(from)}` };
  }
  return { from: null, to: null, label: 'All inquiries', stamp: `all_${dayKey(today)}` };
}

export default function ExportModal({ isOpen, onClose, inquiries, currentUser }) {
  const [period, setPeriod] = useState('today');
  const [preparedBy, setPreparedBy] = useState('');
  const [recipient, setRecipient] = useState('');
  const [branch, setBranch] = useState('');
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const prefs = loadPrefs();
    setPreparedBy(currentUser?.name ? `${currentUser.name}${currentUser.role ? ` (${currentUser.role})` : ''}` : '');
    setRecipient(prefs.recipient || '');
    setBranch(prefs.branch || '');
    setDone(false);
  }, [isOpen, currentUser]);

  const range = periodFor(period);
  const window_ = range.from ? { from: range.from, to: range.to } : null;
  const m = useMemo(() => reportMetrics(inquiries, window_), [inquiries, range.from?.getTime(), range.to?.getTime()]);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ recipient, branch }));
    } catch {}
    const opts = { periodLabel: range.label, fileStamp: range.stamp, preparedBy, recipient, branch, range: window_ };
    if (exportFormat === 'xlsx') exportInquiriesToExcel(inquiries, opts);
    else exportColorCodedHtmlExcel(inquiries, opts);
    setDone(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-surface border border-emerald-500/50 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.25)]">

        <div className="flex items-center justify-between px-5 py-3 border-b border-line bg-panel-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-good" />
            <span className="text-[15px] font-extrabold text-ink uppercase tracking-wider">Export inquiry report</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full bg-raised hover:bg-good-tint text-ink-2 hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm">
          <div className="flex items-center rounded-full border border-line-3 overflow-hidden w-fit">
            {[['today', 'Today'], ['week', 'This week'], ['all', 'All']].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setPeriod(k)}
                className={`px-4 py-1.5 font-extrabold ${period === k ? 'bg-emerald-500 text-on-accent' : 'text-ink-2 hover:text-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-panel border border-line-2 text-center">
            {[
              ['New inquiries', m.total, 'text-ink'],
              ['Quotes sent', m.quotesSent, 'text-good'],
              ['Bookings', m.won, 'text-good-2'],
              ['Waiting on us now', m.awaiting, m.awaiting ? 'text-accent-ink' : 'text-ink'],
            ].map(([label, value, color]) => (
              <div key={label}>
                <div className="text-[12px] text-ink-3 uppercase font-bold">{label}</div>
                <div className={`text-[20px] font-extrabold font-mono ${color}`}>{value}</div>
              </div>
            ))}
          </div>
          <div className="text-[12.5px] text-ink-3">
            {range.label} · counts what you did in this period (quotes, follow-ups, bookings), plus what is waiting right now{m.revised ? ` · ${m.revised} revised quote${m.revised === 1 ? '' : 's'}` : ''}{m.won ? ` · ${m.bookedCbm} CBM booked` : ''}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-[12.5px] font-extrabold text-ink-2 block mb-1">Prepared by</span>
              <input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} className="scm-input w-full" />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-extrabold text-ink-2 block mb-1">For (optional)</span>
              <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="e.g. VP Customer Service" className="scm-input w-full" />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-extrabold text-ink-2 block mb-1">Branch (optional)</span>
              <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. Mundra" className="scm-input w-full" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              ['xlsx', FileSpreadsheet, 'Standard Excel (.xlsx)', 'Summary, all inquiries, and pending actions'],
              ['color_xls', Table, 'Colour-coded sheet (.xls)', 'One sheet with status colours'],
            ].map(([key, Icon, title, sub]) => (
              <button
                key={key}
                onClick={() => setExportFormat(key)}
                className={`p-3 rounded-xl border text-left transition-all ${exportFormat === key ? 'bg-good-tint/60 border-emerald-500 text-ink' : 'bg-panel border-line-2 text-ink-2'}`}
              >
                <div className="font-bold flex items-center gap-1.5"><Icon size={14} className="text-good" />{title}</div>
                <div className="text-[12.5px] text-ink-3 mt-0.5">{sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-line bg-panel-2">
          <button onClick={onClose} className="btn-dark">Cancel</button>
          <button onClick={handleExport} className="btn-green">
            {done ? <Check size={14} /> : <Download size={14} />}
            <span>{done ? 'Downloaded!' : `Download (${m.activityCount} inquiries with activity)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
