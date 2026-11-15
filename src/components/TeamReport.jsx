import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, FileSpreadsheet, Users, AlertTriangle } from 'lucide-react';
import { fetchTeamData, saveTargetDb } from '../lib/team';
import { teamWeekReport, weekRange, weekLabel, exportTeamReport, round1 } from '../utils/teamReport';
import { addDays, dayKey } from '../utils/nominations';

function TargetCell({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  if (editing) {
    const commit = async () => {
      const n = Number(draft);
      if (n > 0 && n !== value) await onSave(n);
      setEditing(false);
    };
    return (
      <td className="sheet-cell-editing">
        <input autoFocus type="number" min="1" step="0.1" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }} />
      </td>
    );
  }
  return (
    <td className="sheet-cell-editable font-mono" title="Click to set this rep's weekly target (applies from this week on)"
      onClick={() => { setDraft(value ?? ''); setEditing(true); }}>
      {value ?? <span className="text-warn">Set</span>}
    </td>
  );
}

function ItemList({ title, items, empty, color }) {
  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden">
      <div className="px-4 py-2.5 border-b border-line bg-panel-2 text-[14px] font-extrabold text-ink uppercase tracking-wider flex items-center gap-2">
        {title}<span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-raised" style={{ color }}>{items.length}</span>
      </div>
      {items.length === 0 ? <div className="px-4 py-3 text-sm text-ink-3">{empty}</div> : (
        <div className="divide-y divide-line-soft max-h-[320px] overflow-y-auto">
          {items.map((m, idx) => (
            <div key={`${m.rep}-${m.id}-${idx}`} className="px-4 py-2 text-sm flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="font-bold text-ink min-w-[120px]">{m.rep}</span>
              <span className="font-mono font-extrabold text-accent-ink">{m.id}</span>
              <span className="text-ink-2 truncate max-w-[220px]">{m.shipper}</span>
              <span className="font-bold" style={{ color }}>{m.issue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Manager-only: every rep's week, read-only except for setting targets.
export default function TeamReport({ currentUser, now }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anchor, setAnchor] = useState(() => new Date());

  const load = useCallback(async () => {
    setLoading(true);
    const d = await fetchTeamData();
    if (d) { setData(d); setError(''); } else setError("Couldn't load the team's data. Check your connection and try again.");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const range = useMemo(() => weekRange(anchor), [anchor]);
  const rows = useMemo(() => (data ? teamWeekReport(data, range, now) : []), [data, range, now]);

  const setTarget = async (repId, cbm) => {
    const week = dayKey(range.from);
    const err = await saveTargetDb(repId, week, cbm, currentUser.name);
    if (err) { setError(`Couldn't save the target: ${err}`); return; }
    setData(d => ({ ...d, targets: [...d.targets.filter(t => !(t.repId === repId && t.weekStart === week)), { repId, weekStart: week, targetCbm: cbm, setBy: currentUser.name }] }));
  };

  const team = rows.reduce((s, r) => ({ target: s.target + (r.target || 0), actual: s.actual + r.actual, bookings: s.bookings + r.bookings }), { target: 0, actual: 0, bookings: 0 });

  return (
    <div className="space-y-3 mt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setAnchor(addDays(range.from, -7))} className="btn-dark !px-2.5" title="Previous week"><ChevronLeft size={15} /></button>
          <span className="text-[15px] font-extrabold text-ink min-w-[240px] text-center">{weekLabel(range)}</span>
          <button onClick={() => setAnchor(addDays(range.from, 7))} className="btn-dark !px-2.5" title="Next week"><ChevronRight size={15} /></button>
          <button onClick={() => setAnchor(new Date())} className="btn-dark text-sm">This week</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="btn-dark text-sm disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /><span>Refresh</span>
          </button>
          <button onClick={() => exportTeamReport(rows, range, currentUser.name)} disabled={!rows.length} className="btn-green disabled:opacity-40">
            <FileSpreadsheet size={14} /><span>Download VP report</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm font-bold flex items-center gap-2 border border-danger/60 bg-[rgba(248,113,113,0.1)] text-danger-ink-2">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-surface border border-line text-center">
        {[
          ['Team target', team.target ? `${round1(team.target)} CBM` : 'Not set'],
          ['Booked', `${round1(team.actual)} CBM`],
          ['Achieved', team.target ? `${Math.round((team.actual / team.target) * 100)}%` : '—'],
        ].map(([label, value]) => (
          <div key={label}>
            <div className="text-[12px] text-ink-3 uppercase font-bold">{label}</div>
            <div className="text-[20px] font-extrabold font-mono text-ink">{value}</div>
          </div>
        ))}
      </div>

      <div className="scm-table-container overflow-x-auto rounded-xl border border-line">
        <table className="scm-table">
          <thead>
            <tr>
              <th>REP</th><th>TARGET (CBM)</th><th>BOOKED (CBM)</th><th>ACHIEVED</th><th>BOOKINGS</th>
              <th>INQUIRIES</th><th>REPLIED</th><th>AVG REPLY</th><th>LOST</th><th>UNREPLIED NOW</th><th>FOLLOW-UPS DUE</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-10 text-ink-3">
                {loading ? 'Loading…' : (<span className="inline-flex items-center gap-2"><Users size={15} /> No reps yet. Reps appear here after they sign in once.</span>)}
              </td></tr>
            ) : rows.map(r => (
              <tr key={r.rep.id}>
                <td>
                  <div className="font-bold text-ink">{r.rep.name}</div>
                  <div className="text-[12px] text-ink-3">{r.rep.role || r.rep.email}</div>
                </td>
                <TargetCell value={r.target} onSave={(n) => setTarget(r.rep.id, n)} />
                <td className="font-mono font-bold text-ink">
                  {r.actual}
                  {r.missingCbm > 0 && <div className="text-[11.5px] text-warn font-sans">{r.missingCbm} without CBM</div>}
                </td>
                <td className={`font-mono font-extrabold ${r.pct === null ? 'text-ink-3' : r.pct >= 100 ? 'text-good' : 'text-accent-ink'}`}>{r.pct === null ? '—' : `${r.pct}%`}</td>
                <td className="font-mono">{r.bookings}</td>
                <td className="font-mono">{r.received}</td>
                <td className="font-mono">{r.replied}</td>
                <td className="font-mono">{r.avgTat === null ? '—' : `${r.avgTat}m`}</td>
                <td className="font-mono">{r.lost}</td>
                <td className={`font-mono ${r.unrepliedNow ? 'text-danger-ink font-bold' : ''}`}>{r.unrepliedNow}</td>
                <td className={`font-mono ${r.followUpsDue ? 'text-purple-ink font-bold' : ''}`}>{r.followUpsDue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-[12.5px] text-ink-3">
        Booked CBM counts confirmed bookings by the day the customer confirmed. Click a target to change it; it applies from this week until you change it again. You can view the team's data here but not edit it.
      </div>

      <ItemList title="Missed this week" items={rows.flatMap(r => r.missed)} empty="Nothing missed this week." color="rgb(var(--c-danger-ink))" />
      <ItemList title="Outstanding right now" items={rows.flatMap(r => r.outstanding)} empty="Nothing outstanding." color="rgb(var(--c-purple-ink))" />

      <div className="rounded-xl border border-line bg-surface overflow-hidden">
        <div className="px-4 py-2.5 border-b border-line bg-panel-2 text-[14px] font-extrabold text-ink uppercase tracking-wider">Next week plan</div>
        <div className="divide-y divide-line-soft">
          {rows.map(r => (
            <div key={r.rep.id} className="px-4 py-2 text-sm flex flex-wrap items-center gap-x-5 gap-y-0.5">
              <span className="font-bold text-ink min-w-[120px]">{r.rep.name}</span>
              <span className="text-ink-2">Target: <b className="text-ink font-mono">{r.nextTarget ?? 'not set'}{r.nextTarget ? ' CBM' : ''}</b></span>
              <span className="text-ink-2">Open quotes: <b className="text-ink font-mono">{r.pipelineCount}</b> ({r.pipelineCbm} CBM)</span>
              <span className="text-ink-2">Expiring next week: <b className="text-warn font-mono">{r.expiringNext.length}</b></span>
              <span className="text-ink-2">Follow-ups to clear: <b className="text-purple-ink font-mono">{r.followUpsDue}</b></span>
            </div>
          ))}
          {rows.length === 0 && <div className="px-4 py-3 text-sm text-ink-3">No reps yet.</div>}
        </div>
      </div>
    </div>
  );
}
