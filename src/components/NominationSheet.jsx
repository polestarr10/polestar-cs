import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Plus, Search, X } from 'lucide-react';
import {
  getNominations,
  periodRange,
  nominationsInRange,
  totals,
  addDays,
  addMonths,
  formatDay,
  exportNominationReport,
} from '../utils/nominations';

const fmtTeu = (n) => (Number.isInteger(n) ? n : n.toFixed(2));

// A cell that turns into an input on click, like a spreadsheet. Saves on Enter or blur.
function EditableCell({ value, type = 'text', onSave, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  if (editing) {
    const commit = () => {
      setEditing(false);
      if (String(draft) !== String(value ?? '')) onSave(draft);
    };
    return (
      <td className="sheet-cell-editing" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
          }}
        />
      </td>
    );
  }
  return (
    <td
      className={`sheet-cell-editable ${className}`}
      onClick={(e) => { e.stopPropagation(); setDraft(value ?? ''); setEditing(true); }}
      title="Click to edit"
    >
      {value || <span className="text-[#6f625c]">—</span>}
    </td>
  );
}

// Everything about one booking. Fields save as you leave them.
function BookingDetails({ n, onClose, onEdit, onViewInquiry }) {
  const field = (label, key, value, opts = {}) => (
    <label className={`block ${opts.wide ? 'col-span-2' : ''}`}>
      <span className="text-[12px] font-bold text-[#b3a59e] block mb-0.5">{label}</span>
      <input
        type={opts.type || 'text'}
        defaultValue={value ?? ''}
        key={`${n.id}-${key}-${value}`}
        onBlur={(e) => { if (String(e.target.value) !== String(value ?? '')) onEdit({ [key]: opts.type === 'number' ? Number(e.target.value) || 0 : e.target.value.trim() }); }}
        className="scm-input w-full text-sm"
      />
    </label>
  );
  const info = (label, value) => (
    <div>
      <div className="text-[12px] font-bold text-[#b3a59e]">{label}</div>
      <div className="text-sm text-white font-semibold">{value || '—'}</div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#0d0b0a] border border-emerald-500/50 rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#342b27] bg-[#110e0d]">
          <span className="text-[15px] font-extrabold text-white uppercase tracking-wider">Booking: <span className="font-mono text-[#FFA08C]">{n.id}</span></span>
          <button onClick={onClose} className="p-1 rounded-full bg-[#181412] text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {info('Customer', n.shipperName)}
            {info('Confirmed', formatDay(n.confirmedAt, { day: '2-digit', month: 'short', year: 'numeric' }))}
            {info('Route', `${n.pol} ➔ ${n.pod}`)}
            {info('Commodity', n.commodity)}
            {info('Gross weight', n.grossWeightKg ? `${n.grossWeightKg.toLocaleString()} kg` : '')}
            {info('CBM / TEU', `${n.volumeCbm || '—'} CBM · ${fmtTeu(n.teu)} TEU`)}
            {info('Final rate', n.rate)}
            {info('Handled by', n.handledBy)}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#342b27]">
            {field('Booking / nomination no.', 'bookingRef', n.bookingRef)}
            {field('Confirmed by (customer)', 'confirmedBy', n.contactPerson)}
            {field('Equipment', 'containerType', n.equipment)}
            {field('No. of containers', 'containerCount', n.containers, { type: 'number' })}
            {field('Carrier', 'carrier', n.carrier)}
            {field('ETD', 'etd', n.etd, { type: 'date' })}
            {field('Remarks', 'remarks', n.remarks, { wide: true })}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-[#342b27] bg-[#110e0d] flex justify-between gap-2">
          <button onClick={onViewInquiry} className="btn-dark">Open full inquiry</button>
          <button onClick={onClose} className="btn-green">Done</button>
        </div>
      </div>
    </div>
  );
}

export default function NominationSheet({ inquiries, onViewDetails, onAddNomination, onEditNomination, currentUser }) {
  const [openId, setOpenId] = useState(null);
  const [period, setPeriod] = useState('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [search, setSearch] = useState('');

  const nominations = useMemo(() => getNominations(inquiries), [inquiries]);
  const range = useMemo(() => periodRange(period, anchor), [period, anchor]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return nominationsInRange(nominations, range).filter(n => !q ||
      [n.id, n.bookingRef, n.shipperName, n.pol, n.pod, n.carrier, n.commodity, n.handledBy]
        .some(v => (v || '').toLowerCase().includes(q)));
  }, [nominations, range, search]);
  const sum = totals(rows);

  const step = (dir) => setAnchor(period === 'week' ? addDays(range.from, 7 * dir) : addMonths(range.from, dir));

  return (
    <div className="space-y-3 mt-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onAddNomination} className="btn-green">
            <Plus size={14} />
            <span>Add nomination</span>
          </button>
          <div className="flex items-center rounded-full border border-[#3d332e] overflow-hidden">
            {[['week', 'Week'], ['month', 'Month'], ['all', 'All']].map(([k, label]) => (
              <button
                key={k}
                onClick={() => { setPeriod(k); setAnchor(new Date()); }}
                className={`px-3.5 py-1.5 text-sm font-extrabold ${period === k ? 'bg-[#FFA08C] text-[#0d0b0a]' : 'text-[#dcd2cd] hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {period !== 'all' && (
            <div className="flex items-center gap-1">
              <button onClick={() => step(-1)} className="btn-dark !px-2.5" title="Previous"><ChevronLeft size={15} /></button>
              <span className="text-[15px] font-extrabold text-white min-w-[220px] text-center">{range.label}</span>
              <button onClick={() => step(1)} className="btn-dark !px-2.5" title="Next"><ChevronRight size={15} /></button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#b3a59e]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sheet…" className="scm-input scm-input-icon w-56" />
          </div>
          <button onClick={() => exportNominationReport(nominations, range, currentUser?.name)} className="btn-coral">
            <FileSpreadsheet size={14} />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      <div className="text-sm text-[#dcd2cd] font-semibold">
        <span className="text-white font-extrabold">{sum.shipments}</span> shipments ·{' '}
        <span className="text-white font-extrabold">{sum.containers}</span> containers ·{' '}
        <span className="text-white font-extrabold">{fmtTeu(sum.teu)}</span> TEU ·{' '}
        <span className="text-white font-extrabold">{(sum.grossWeightKg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}</span> MT
        <span className="text-[#b3a59e] ml-3">Click a booking for all its details. Booking no. and ETD can be edited right in the sheet.</span>
      </div>

      {openId && (() => {
        const n = nominations.find(x => x.id === openId);
        return n ? (
          <BookingDetails n={n} onClose={() => setOpenId(null)}
            onEdit={(patch) => onEditNomination(n.inquiry, patch)}
            onViewInquiry={() => { setOpenId(null); onViewDetails(n.inquiry); }} />
        ) : null;
      })()}

      {/* Sheet */}
      <div className="sheet-wrap">
        <table className="sheet-grid">
          <thead>
            <tr>
              <th className="sheet-rownum"></th>
              <th>Confirmed</th>
              <th>Inquiry Ref</th>
              <th>Booking No.</th>
              <th>Customer</th>
              <th>Route</th>
              <th>Equipment</th>
              <th className="num">CBM</th>
              <th>Final Rate</th>
              <th>ETD</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="sheet-rownum">1</td>
                <td colSpan={9} className="!py-10 text-center text-[#dcd2cd]">
                  No nominations {period === 'all' ? 'yet' : 'in this period'}. Click <b className="text-white">Add nomination</b> to convert a quoted inquiry.
                </td>
              </tr>
            ) : rows.map((n, i) => (
              <tr key={n.id} className="cursor-pointer hover:bg-[#181311]" onClick={() => setOpenId(n.id)} title="Click for full booking details">
                <td className="sheet-rownum">{i + 1}</td>
                <td className="font-mono">{formatDay(n.confirmedAt, { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                <td className="font-mono font-extrabold text-[#FFA08C]">{n.id}</td>
                <EditableCell value={n.bookingRef} className="font-mono font-bold" onSave={(v) => onEditNomination(n.inquiry, { bookingRef: v.trim() })} />
                <td className="font-semibold text-white max-w-[260px] truncate" title={n.shipperName}>{n.shipperName}</td>
                <td className="font-mono whitespace-nowrap">{n.pol} ➔ {n.pod}</td>
                <td>{n.equipment}</td>
                <td className="num font-mono">{n.volumeCbm || '—'}</td>
                <td className="font-mono font-bold text-emerald-400">{n.rate}</td>
                <EditableCell value={n.etd} type="date" className="font-mono" onSave={(v) => onEditNomination(n.inquiry, { etd: v })} />
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td className="sheet-rownum"></td>
                <td colSpan={6} className="font-extrabold">TOTAL ({sum.shipments} shipments)</td>
                <td className="num font-mono font-extrabold">{Number(sum.volumeCbm.toFixed(2))}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
