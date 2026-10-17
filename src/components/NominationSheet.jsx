import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Plus, Search } from 'lucide-react';
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
      <td className="sheet-cell-editing">
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

export default function NominationSheet({ inquiries, onViewDetails, onAddNomination, onEditNomination, currentUser }) {
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
        <span className="text-[#b3a59e] ml-3">Click a booking no., containers, carrier, ETD or remarks cell to edit it.</span>
      </div>

      {/* Sheet */}
      <div className="sheet-wrap">
        <table className="sheet-grid">
          <thead>
            <tr>
              <th className="sheet-rownum"></th>
              <th>Confirmed</th>
              <th>Inquiry Ref</th>
              <th>Booking No.</th>
              <th>Shipper</th>
              <th>Customer Contact</th>
              <th>POL</th>
              <th>POD</th>
              <th>Equipment</th>
              <th className="num">Cntrs</th>
              <th className="num">TEU</th>
              <th className="num">Gross Wt (kg)</th>
              <th className="num">CBM</th>
              <th>Commodity</th>
              <th>Final Rate</th>
              <th>Carrier</th>
              <th>ETD</th>
              <th>Handled By</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="sheet-rownum">1</td>
                <td colSpan={18} className="!py-10 text-center text-[#dcd2cd]">
                  No nominations {period === 'all' ? 'yet' : 'in this period'}. Click <b className="text-white">Add nomination</b> to convert a quoted inquiry.
                </td>
              </tr>
            ) : rows.map((n, i) => (
              <tr key={n.id}>
                <td className="sheet-rownum">{i + 1}</td>
                <td className="font-mono">{formatDay(n.confirmedAt, { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                <td className="font-mono font-extrabold text-[#FFA08C] cursor-pointer hover:underline" onClick={() => onViewDetails(n.inquiry)}>{n.id}</td>
                <EditableCell value={n.bookingRef} className="font-mono font-bold" onSave={(v) => onEditNomination(n.inquiry, { bookingRef: v.trim() })} />
                <td className="font-semibold text-white max-w-[220px] truncate" title={n.shipperName}>{n.shipperName}</td>
                <td className="max-w-[160px] truncate" title={n.contactPerson}>{n.contactPerson}</td>
                <td className="font-mono">{n.pol}</td>
                <td className="font-mono">{n.pod}</td>
                <td>{n.equipment}</td>
                <EditableCell value={String(n.containers)} type="number" className="num font-mono" onSave={(v) => onEditNomination(n.inquiry, { containerCount: Number(v) || 0 })} />
                <td className="num font-mono">{fmtTeu(n.teu)}</td>
                <td className="num font-mono">{n.grossWeightKg ? n.grossWeightKg.toLocaleString() : '—'}</td>
                <td className="num font-mono">{n.volumeCbm || '—'}</td>
                <td className="max-w-[200px] truncate" title={n.commodity}>{n.commodity}</td>
                <td className="font-mono font-bold text-emerald-400">{n.rate}</td>
                <EditableCell value={n.carrier} onSave={(v) => onEditNomination(n.inquiry, { carrier: v.trim() })} />
                <EditableCell value={n.etd} type="date" className="font-mono" onSave={(v) => onEditNomination(n.inquiry, { etd: v })} />
                <td className="max-w-[160px] truncate" title={n.handledBy}>{n.handledBy}</td>
                <EditableCell value={n.remarks} className="max-w-[240px] truncate" onSave={(v) => onEditNomination(n.inquiry, { remarks: v.trim() })} />
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td className="sheet-rownum"></td>
                <td colSpan={8} className="font-extrabold">TOTAL ({sum.shipments} shipments)</td>
                <td className="num font-mono font-extrabold">{sum.containers}</td>
                <td className="num font-mono font-extrabold">{fmtTeu(sum.teu)}</td>
                <td className="num font-mono font-extrabold">{sum.grossWeightKg.toLocaleString()}</td>
                <td className="num font-mono font-extrabold">{Number(sum.volumeCbm.toFixed(2))}</td>
                <td colSpan={6}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
