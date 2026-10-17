import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Upload, ClipboardPaste, Target, Trash2, Plus, X, MessageSquare, FileSpreadsheet, AlertTriangle, ListChecks, Download, BarChart3, Lightbulb, Presentation, Sparkles, CheckCircle2 } from 'lucide-react';
import { readPlanFile, readPlanText } from '../utils/planReader';
import { blankPlan, performanceReview, buildSuggestions, exportPlanExcel, REVIEW_ROWS } from '../utils/planBuilder';
import { buildSamplePlan } from '../data/samplePlan';
import { weekKey, targetForWeek } from '../lib/team';
import { addDays, dayKey, formatDay } from '../utils/nominations';

const LONG = { day: '2-digit', month: 'short', year: 'numeric' };
const titleCase = (d) => d.charAt(0) + d.slice(1).toLowerCase();

export function planProgress(plan) {
  const items = plan ? [...plan.general, ...plan.days.flatMap(d => d.items)] : [];
  return { done: items.filter(i => i.done).length, total: items.length };
}

// Returns the plan with one task changed, added (patch=null + text) or removed.
export function patchItem(plan, dayIndex, itemId, patch) {
  const apply = (items) => patch === null
    ? items.filter(i => i.id !== itemId)
    : items.map(i => (i.id === itemId ? { ...i, ...patch, ...(patch.done !== undefined ? { doneAt: patch.done ? new Date().toISOString() : null } : {}) } : i));
  if (dayIndex === -1) return { ...plan, general: apply(plan.general) };
  return { ...plan, days: plan.days.map((d, i) => (i === dayIndex ? { ...d, items: apply(d.items) } : d)) };
}

export function addItem(plan, dayIndex, text) {
  const item = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, text, done: false, note: '' };
  if (dayIndex === -1) return { ...plan, general: [...plan.general, item] };
  return { ...plan, days: plan.days.map((d, i) => (i === dayIndex ? { ...d, items: [...d.items, item] } : d)) };
}

export function TaskRow({ item, onToggle, onNote, onDelete }) {
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(item.note || '');
  return (
    <div className="group px-3 py-1.5">
      <div className="flex items-start gap-2">
        <input type="checkbox" checked={item.done} onChange={(e) => onToggle(e.target.checked)} className="mt-1 w-4 h-4 accent-[#FFA08C] shrink-0 cursor-pointer" />
        <span className={`flex-1 text-sm ${item.done ? 'line-through text-[#8a7d77]' : 'text-white'}`}>{item.text}</span>
        {onNote && (
          <button onClick={() => { setNote(item.note || ''); setEditingNote(v => !v); }} className={`p-0.5 ${item.note ? 'text-[#FFA08C]' : 'text-[#6f625c] opacity-0 group-hover:opacity-100'} hover:text-white`} title="Add a note">
            <MessageSquare size={13} />
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="p-0.5 text-[#6f625c] opacity-0 group-hover:opacity-100 hover:text-[#f87171]" title="Remove task">
            <X size={13} />
          </button>
        )}
      </div>
      {editingNote ? (
        <form onSubmit={(e) => { e.preventDefault(); onNote(note.trim()); setEditingNote(false); }} className="mt-1 ml-6 flex gap-1.5">
          <input autoFocus value={note} onChange={(e) => setNote(e.target.value)} className="scm-input flex-1 !py-1 text-[13px]" placeholder="e.g. Met purchase head, rates requested for 2x40'" />
          <button type="submit" className="btn-dark text-[12.5px]">Save</button>
        </form>
      ) : item.note ? (
        <div className="ml-6 text-[12.5px] text-[#dcd2cd] italic">{item.note}</div>
      ) : null}
    </div>
  );
}

function AddTask({ onAdd }) {
  const [text, setText] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onAdd(text.trim()); setText(''); } }} className="flex items-center gap-1.5 px-3 py-2 border-t border-[#2a231f]">
      <Plus size={13} className="text-[#6f625c] shrink-0" />
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task" className="flex-1 bg-transparent text-sm text-white placeholder:text-[#6f625c] outline-none" />
    </form>
  );
}

// The day's area / focus (e.g. the location being covered). Click to edit.
function AreaField({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  if (editing) {
    const commit = () => { setEditing(false); if (draft.trim() !== (value || '')) onSave(draft.trim()); };
    return (
      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className="mt-0.5 w-full bg-[#090706] border border-[#FFA08C]/60 rounded px-1.5 py-0.5 text-[13px] font-bold text-[#FFA08C] outline-none" placeholder="Area / focus, e.g. office + calls" />
    );
  }
  return (
    <button onClick={() => { setDraft(value || ''); setEditing(true); }} className={`block w-full text-left text-[13px] font-bold truncate ${value ? 'text-[#FFA08C]' : 'text-[#6f625c] hover:text-[#dcd2cd]'}`} title={value || 'Set the area / focus for this day'}>
      {value || '+ Area / focus'}
    </button>
  );
}

function DayCard({ day, index, isToday, isPast, onChange }) {
  const done = day.items.filter(i => i.done).length;
  const left = day.items.length - done;
  return (
    <div className={`rounded-xl border bg-[#0d0b0a] overflow-hidden flex flex-col ${isToday ? 'border-[#FFA08C] shadow-[0_0_18px_rgba(255,160,140,0.25)]' : 'border-[#342b27]'}`}>
      <div className={`px-3 py-2 border-b border-[#342b27] ${isToday ? 'bg-[rgba(255,160,140,0.12)]' : 'bg-[#110e0d]'}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-extrabold text-white tracking-wider">
            {day.day}
            {isToday && <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full bg-[#FFA08C] text-[#0d0b0a] align-middle">TODAY</span>}
          </span>
          <span className="text-[12.5px] font-mono text-[#dcd2cd]">{formatDay(`${day.date}T00:00:00`, { day: '2-digit', month: 'short' })}</span>
        </div>
        <AreaField value={day.area} onSave={(area) => onChange(p => ({ ...p, days: p.days.map((d, i) => (i === index ? { ...d, area } : d)) }))} />
        {day.items.length > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-[#181412] overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${(done / day.items.length) * 100}%` }} />
            </div>
            <span className={`text-[12px] font-bold ${isPast && left ? 'text-[#f87171]' : 'text-[#b3a59e]'}`}>
              {isPast && left ? `${left} not done` : `${done}/${day.items.length}`}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 divide-y divide-[#1f1916] max-h-[420px] overflow-y-auto">
        {day.items.length === 0 && <div className="px-3 py-2 text-[13px] text-[#6f625c]">Nothing planned.</div>}
        {day.items.map(item => (
          <TaskRow key={item.id} item={item}
            onToggle={(v) => onChange(p => patchItem(p, index, item.id, { done: v }))}
            onNote={(note) => onChange(p => patchItem(p, index, item.id, { note }))}
            onDelete={() => onChange(p => patchItem(p, index, item.id, null))} />
        ))}
      </div>
      <AddTask onAdd={(text) => onChange(p => addItem(p, index, text))} />
    </div>
  );
}

function ImportPanel({ week, onImported, onCancel }) {
  const [mode, setMode] = useState('file');
  const [text, setText] = useState('');
  const [fallback, setFallback] = useState(week);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const thisWeek = weekKey(new Date());
  const nextWeek = dayKey(addDays(new Date(`${thisWeek}T00:00:00`), 7));

  const run = async (reader) => {
    setBusy(true);
    setError('');
    try {
      onImported(await reader());
    } catch (e) {
      setError(e.message || "Couldn't read the plan.");
    }
    setBusy(false);
  };

  return (
    <div className="rounded-xl border border-[#FFA08C]/50 bg-[#0d0b0a] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center rounded-full border border-[#3d332e] overflow-hidden">
          {[['file', Upload, 'Upload Excel / CSV'], ['text', ClipboardPaste, 'Paste text']].map(([k, Icon, label]) => (
            <button key={k} onClick={() => setMode(k)} className={`px-3.5 py-1.5 text-sm font-extrabold flex items-center gap-1.5 ${mode === k ? 'bg-[#FFA08C] text-[#0d0b0a]' : 'text-[#dcd2cd] hover:text-white'}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[13px] text-[#dcd2cd]">
          If the plan has no dates, it's for
          <select value={fallback} onChange={(e) => setFallback(e.target.value)} className="scm-select !py-1">
            <option value={thisWeek}>this week</option>
            <option value={nextWeek}>next week</option>
            {week !== thisWeek && week !== nextWeek && <option value={week}>week of {formatDay(`${week}T00:00:00`, LONG)}</option>}
          </select>
        </label>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg text-sm font-bold flex items-start gap-2 border border-[#f87171]/60 bg-[rgba(248,113,113,0.1)] text-[#fca5a5]">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {mode === 'file' ? (
        <div className="space-y-2">
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="w-full py-8 rounded-xl border-2 border-dashed border-[#3d332e] hover:border-[#FFA08C] text-[#dcd2cd] hover:text-white flex flex-col items-center gap-2 disabled:opacity-50">
            <FileSpreadsheet size={26} className="text-emerald-400" />
            <span className="font-bold">{busy ? 'Reading…' : 'Choose the plan file (.xlsx, .xls or .csv)'}</span>
            <span className="text-[12.5px] text-[#b3a59e]">Every sheet is read. Day columns become the daily checklist; target figures are picked up; other sheets are kept for reference.</span>
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) run(() => readPlanFile(f, fallback)); }} />
        </div>
      ) : (
        <div className="space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="scm-input w-full font-mono text-[13px]"
            placeholder={'Paste cells copied from Excel, or text like:\n\nTarget this week: 60 CBM\nMonday (19/10): Area name\n- Task one\n- Task two\nTuesday: Another area\n- Task three'} />
          <button onClick={() => run(() => readPlanText(text, fallback))} disabled={busy || !text.trim()} className="btn-coral disabled:opacity-40">
            <ListChecks size={14} /><span>Read plan</span>
          </button>
        </div>
      )}
      <div className="flex justify-end">
        <button onClick={onCancel} className="btn-dark text-sm">Cancel</button>
      </div>
    </div>
  );
}

// For now the plan is reviewed in person on the rep's laptop, so it is either a
// draft or finalised with the VP. (Older plans may say 'approved'.)
const isFinal = (plan) => plan?.status === 'final' || plan?.status === 'approved';

function StatusPill({ plan }) {
  return isFinal(plan) ? (
    <span className="text-[12.5px] font-extrabold px-2.5 py-1 rounded-full border bg-[rgba(16,185,129,0.12)] text-emerald-300 border-emerald-500/50">
      Finalised with VP{plan.finalizedAt ? ` · ${new Date(plan.finalizedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}
    </span>
  ) : (
    <span className="text-[12.5px] font-extrabold px-2.5 py-1 rounded-full border bg-[#181412] text-[#dcd2cd] border-[#3d332e]">Draft</span>
  );
}

function TargetInput({ plan, onChange, big }) {
  return (
    <input type="number" min="0" step="0.1" defaultValue={plan.proposedTargetCbm ?? ''} key={`target-${plan.weekStart}-${plan.proposedTargetCbm}`}
      onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== (plan.proposedTargetCbm ?? null)) onChange(p => ({ ...p, proposedTargetCbm: v })); }}
      className={`scm-input font-mono font-bold ${big ? 'w-40 !text-[22px]' : 'w-32'}`} placeholder="e.g. 60" />
  );
}

function NotesInput({ plan, onChange, rows = 3 }) {
  return (
    <textarea defaultValue={plan.reviewNote || ''} key={`note-${plan.weekStart}-${plan.reviewNote || ''}`} rows={rows}
      onBlur={(e) => { if (e.target.value !== (plan.reviewNote || '')) onChange(p => ({ ...p, reviewNote: e.target.value })); }}
      className="scm-input w-full text-sm" placeholder="What the VP said: changes to the plan, target, customers to focus on." />
  );
}

// Full-screen view for going through the plan with the VP on the rep's laptop.
function PresentView({ plan, review, officialTarget, repName, weekLabel, today, onChange, onFinalise, onClose, onDownload }) {
  const final = isFinal(plan);
  const { done, total } = planProgress(plan);
  return (
    <div className="fixed inset-0 z-50 bg-[#080605] overflow-y-auto">
      <div className="max-w-7xl mx-auto p-5 space-y-4 pb-24">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[13px] font-extrabold text-[#FFA08C] uppercase tracking-wider">Weekly plan review</div>
            <div className="text-[24px] font-extrabold text-white">{repName}</div>
            <div className="text-[15px] text-[#dcd2cd] font-semibold">{weekLabel} · {total} tasks planned{done ? `, ${done} done` : ''}</div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill plan={plan} />
            <button onClick={onDownload} className="btn-dark"><Download size={14} /><span>Excel</span></button>
            <button onClick={onClose} className="btn-dark"><X size={14} /><span>Close</span></button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 rounded-xl border border-[#342b27] bg-[#0d0b0a] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#342b27] bg-[#110e0d] text-[14px] font-extrabold text-white uppercase tracking-wider flex items-center gap-2"><BarChart3 size={15} className="text-[#FFA08C]" />Last two weeks</div>
            <Review review={review} />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-[#FFA08C]/40 bg-[#0d0b0a] p-4 space-y-2">
              <div className="text-[13px] font-extrabold text-[#dcd2cd] uppercase tracking-wider flex items-center gap-1.5"><Target size={14} className="text-[#FFA08C]" />Target for this week (CBM)</div>
              <div className="flex items-center gap-3 flex-wrap">
                <TargetInput plan={plan} onChange={onChange} big />
                <span className="text-[13px] text-[#b3a59e]">
                  {officialTarget ? `Target currently saved: ${officialTarget} CBM` : 'No target saved for this week yet'}
                  <br />Finalising saves this as your target for the week.
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-[#342b27] bg-[#0d0b0a] p-4 space-y-2">
              <div className="text-[13px] font-extrabold text-[#dcd2cd] uppercase tracking-wider flex items-center gap-1.5"><MessageSquare size={14} className="text-[#FFA08C]" />VP's comments</div>
              <NotesInput plan={plan} onChange={onChange} rows={5} />
            </div>
          </div>
        </div>

        {plan.general.length > 0 && (
          <div className="rounded-xl border border-[#342b27] bg-[#0d0b0a] overflow-hidden">
            <div className="px-3 py-2 border-b border-[#342b27] bg-[#110e0d] font-extrabold text-white tracking-wider">ANY DAY THIS WEEK</div>
            <div className="divide-y divide-[#1f1916]">
              {plan.general.map(item => (
                <TaskRow key={item.id} item={item}
                  onToggle={(v) => onChange(p => patchItem(p, -1, item.id, { done: v }))}
                  onNote={(note) => onChange(p => patchItem(p, -1, item.id, { note }))}
                  onDelete={() => onChange(p => patchItem(p, -1, item.id, null))} />
              ))}
            </div>
            <AddTask onAdd={(text) => onChange(p => addItem(p, -1, text))} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {plan.days.map((d, i) => (
            <DayCard key={d.day} day={d} index={i} isToday={d.date === today} isPast={d.date < today} onChange={onChange} />
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 border-t border-[#342b27] bg-[#0d0b0a]/95 backdrop-blur px-5 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-[#dcd2cd]">
            {final ? 'Finalised. You can still tick tasks off and make small changes during the week.' : 'Make the changes the VP asks for above, then finalise the plan together.'}
          </span>
          {final ? (
            <button onClick={() => onChange(p => ({ ...p, status: 'draft', finalizedAt: null }))} className="btn-dark">Reopen as draft</button>
          ) : (
            <button onClick={onFinalise} className="btn-green"><CheckCircle2 size={14} /><span>Finalise plan with VP</span></button>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, open, onToggle, right, children }) {
  return (
    <div className="rounded-xl border border-[#342b27] bg-[#0d0b0a] overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-[#110e0d] hover:bg-[#181412] text-left">
        <span className="flex items-center gap-2 text-[14px] font-extrabold text-white uppercase tracking-wider"><Icon size={15} className="text-[#FFA08C]" />{title}</span>
        <span className="flex items-center gap-3 text-[12.5px] text-[#b3a59e]">{right}{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
      </button>
      {open && <div className="border-t border-[#342b27]">{children}</div>}
    </div>
  );
}

// Side-by-side numbers for the two weeks before the plan week, with the change.
function Review({ review }) {
  const { recent, previous } = review;
  const week = (r) => formatDay(r.range.from, { day: '2-digit', month: 'short' });
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[12px] text-[#b3a59e] uppercase">
            <th className="text-left px-4 py-2 font-bold"></th>
            <th className="text-right px-4 py-2 font-bold">Week of {week(recent)}</th>
            <th className="text-right px-4 py-2 font-bold">Week of {week(previous)}</th>
            <th className="text-right px-4 py-2 font-bold">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1f1916]">
          {REVIEW_ROWS.map(([name, get, higherIsBetter, num]) => {
            const a = num ? num(recent) : get(recent);
            const b = num ? num(previous) : get(previous);
            const diff = typeof a === 'number' && typeof b === 'number' ? Math.round((a - b) * 10) / 10 : null;
            const good = diff === null || diff === 0 || higherIsBetter === undefined ? null : (diff > 0) === Boolean(higherIsBetter);
            return (
              <tr key={name}>
                <td className="px-4 py-1.5 text-[#dcd2cd] font-semibold">{name}</td>
                <td className="px-4 py-1.5 text-right font-mono font-bold text-white">{get(recent)}</td>
                <td className="px-4 py-1.5 text-right font-mono text-[#dcd2cd]">{get(previous)}</td>
                <td className={`px-4 py-1.5 text-right font-mono font-bold ${good === null ? 'text-[#8a7d77]' : good ? 'text-emerald-400' : 'text-[#f87171]'}`}>
                  {diff === null || diff === 0 ? '—' : `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {recent.missed.length > 0 && (
        <div className="px-4 py-2.5 border-t border-[#342b27] text-[13px] text-[#dcd2cd]">
          <span className="font-bold text-[#f87171]">Missed in the week of {week(recent)}:</span>{' '}
          {recent.missed.slice(0, 6).map(m => `${m.id} (${m.issue})`).join('; ')}{recent.missed.length > 6 ? ` and ${recent.missed.length - 6} more` : ''}
        </div>
      )}
    </div>
  );
}

function Suggestions({ suggestions, plan, onAdd }) {
  const [dayFor, setDayFor] = useState({});
  const planned = new Set([...plan.general, ...plan.days.flatMap(d => d.items)].map(i => i.text));
  if (!suggestions.length) {
    return <div className="px-4 py-3 text-sm text-[#b3a59e]">No suggestions yet: no open quotes, quiet customers, price losses or recent bookings to build on.</div>;
  }
  return (
    <div className="divide-y divide-[#1f1916] max-h-[380px] overflow-y-auto">
      {suggestions.map(s => {
        const added = planned.has(s.text);
        const target = dayFor[s.key] ?? 0;
        return (
          <div key={s.key} className="px-4 py-2 flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] font-extrabold px-2 py-0.5 rounded-full bg-[#181412] text-[#c084fc] shrink-0">{s.reason}</span>
            <span className={`flex-1 min-w-[200px] text-sm ${added ? 'text-[#8a7d77] line-through' : 'text-white'}`}>{s.text}</span>
            {added ? <span className="text-[12.5px] font-bold text-emerald-400">Added</span> : (
              <span className="flex items-center gap-1.5 shrink-0">
                <select value={target} onChange={(e) => setDayFor(m => ({ ...m, [s.key]: Number(e.target.value) }))} className="scm-select !py-1 text-[13px]">
                  {plan.days.map((d, i) => <option key={d.day} value={i}>{titleCase(d.day)}</option>)}
                  <option value={-1}>Any day</option>
                </select>
                <button onClick={() => onAdd(target, s.text)} className="btn-dark text-[13px]"><Plus size={13} /><span>Add</span></button>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// The rep's own weekly plan: written from their numbers, sent to the VP to
// check, then worked through day by day (Monday–Saturday).
export default function WeeklyPlan({ plans, loadPlan, onSavePlan, onChangePlan, onDeletePlan, now, notify, inquiries, targets, currentUser, onSetTarget }) {
  const [week, setWeek] = useState(() => weekKey(new Date()));
  const [importing, setImporting] = useState(false);
  const [showExtra, setShowExtra] = useState(null);
  const [open, setOpen] = useState({ review: true, suggest: true, vp: false });
  const [presenting, setPresenting] = useState(false);

  useEffect(() => { if (!(week in plans)) loadPlan(week); }, [week]);

  const plan = plans[week];
  const today = dayKey(new Date(now));
  const monday = new Date(`${week}T00:00:00`);
  const thisWeek = weekKey(new Date());
  const nextWeek = dayKey(addDays(new Date(`${thisWeek}T00:00:00`), 7));
  const { done, total } = planProgress(plan);
  const review = useMemo(
    () => performanceReview(inquiries, targets, { id: currentUser.id, name: currentUser.name }, week, now),
    [inquiries, targets, currentUser.id, currentUser.name, week, now]
  );
  const suggestions = useMemo(() => buildSuggestions(inquiries, week, now), [inquiries, week, now]);
  const officialTarget = targetForWeek(targets, currentUser.id, week);
  const weekName = week === thisWeek ? 'this week' : week === nextWeek ? 'next week' : `the week of ${formatDay(monday, LONG)}`;

  const handleImported = async (newPlan) => {
    const existing = plans[newPlan.weekStart] ?? await loadPlan(newPlan.weekStart);
    if (existing && !window.confirm(`There's already a plan for the week of ${formatDay(`${newPlan.weekStart}T00:00:00`, LONG)}. Replace it? Ticks and notes on the old plan will be lost.`)) return;
    await onSavePlan({ status: 'draft', proposedTargetCbm: null, reviewNote: '', ...newPlan });
    setWeek(newPlan.weekStart);
    setImporting(false);
    const tasks = planProgress(newPlan).total;
    const days = newPlan.days.filter(d => d.items.length).length;
    notify(`Plan read: ${tasks} task${tasks === 1 ? '' : 's'} across ${days} day${days === 1 ? '' : 's'}${newPlan.datesFromFile ? '' : ' (no dates in the file, so placed in the week you picked)'}`);
  };

  const change = (fn) => onChangePlan(week, fn);

  // Agreed with the VP: lock in the plan and save its target as the week's target.
  const finalise = async () => {
    const cbm = Number(plan.proposedTargetCbm);
    change(p => ({ ...p, status: 'final', finalizedAt: new Date().toISOString() }));
    if (cbm > 0 && cbm !== officialTarget) await onSetTarget(cbm, week);
    else if (!(cbm > 0)) notify('Plan finalised. No target was entered, so your weekly target is unchanged.');
  };

  return (
    <div className="space-y-3 mt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setWeek(dayKey(addDays(monday, -7)))} className="btn-dark !px-2.5" title="Previous week"><ChevronLeft size={15} /></button>
          <span className="text-[15px] font-extrabold text-white min-w-[230px] text-center">
            {formatDay(monday, LONG)} – {formatDay(addDays(monday, 5), LONG)}
          </span>
          <button onClick={() => setWeek(dayKey(addDays(monday, 7)))} className="btn-dark !px-2.5" title="Next week"><ChevronRight size={15} /></button>
          <div className="flex items-center rounded-full border border-[#3d332e] overflow-hidden">
            {[[thisWeek, 'This week'], [nextWeek, 'Next week']].map(([k, label]) => (
              <button key={k} onClick={() => setWeek(k)} className={`px-3 py-1 text-[13px] font-extrabold ${week === k ? 'bg-[#FFA08C] text-[#0d0b0a]' : 'text-[#dcd2cd] hover:text-white'}`}>{label}</button>
            ))}
          </div>
        </div>
        {plan && !importing && (
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill plan={plan} />
            <button onClick={() => setPresenting(true)} className="btn-coral"><Presentation size={14} /><span>Review with VP</span></button>
            <button onClick={() => exportPlanExcel(plan, review, currentUser.name)} className="btn-dark text-sm" title="Download the plan as Excel"><Download size={13} /><span>Excel</span></button>
            <button onClick={() => setImporting(true)} className="btn-dark text-sm" title="Load a corrected or existing plan from Excel or text"><Upload size={13} /><span>Import</span></button>
            <button onClick={() => window.confirm(`Remove the plan for ${weekName}?`) && onDeletePlan(week)} className="btn-dark text-sm text-[#f87171]" title="Remove plan"><Trash2 size={13} /></button>
          </div>
        )}
      </div>

      {importing && <ImportPanel week={week} onImported={handleImported} onCancel={() => setImporting(false)} />}

      {plan?.isSample && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-[#c084fc]/60 bg-[rgba(192,132,252,0.08)]">
          <span className="text-sm font-bold text-[#d8b4fe]">This is a sample plan with made-up companies, to show how the page works. Remove it before making your real plan.</span>
          <button onClick={() => onDeletePlan(week)} className="btn-dark text-sm"><Trash2 size={13} /><span>Remove sample</span></button>
        </div>
      )}

      {presenting && plan && (
        <PresentView plan={plan} review={review} officialTarget={officialTarget} repName={currentUser.name} today={today}
          weekLabel={`${formatDay(monday, LONG)} – ${formatDay(addDays(monday, 5), LONG)}`}
          onChange={change} onFinalise={finalise} onClose={() => setPresenting(false)} onDownload={() => exportPlanExcel(plan, review, currentUser.name)} />
      )}

      <Panel title="How the last two weeks went" icon={BarChart3} open={open.review} onToggle={() => setOpen(o => ({ ...o, review: !o.review }))}
        right={review.recent.target ? `${review.recent.actual} / ${review.recent.target} CBM` : `${review.recent.actual} CBM booked`}>
        <Review review={review} />
      </Panel>

      {plan === undefined ? (
        <div className="text-sm text-[#b3a59e]">Loading…</div>
      ) : !plan ? (
        !importing && (
          <div className="rounded-xl border border-dashed border-[#3d332e] p-8 text-center space-y-3">
            <ListChecks size={26} className="mx-auto text-[#FFA08C]" />
            <div className="font-extrabold text-white">No plan for {weekName} yet</div>
            <div className="text-sm text-[#dcd2cd] max-w-lg mx-auto">
              Start a plan and fill each day using the review above and the suggested tasks. Then open "Review with VP" on your laptop, go through it together, and finalise it.
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => onSavePlan(blankPlan(week))} className="btn-coral"><Plus size={14} /><span>Start plan for {weekName}</span></button>
              <button onClick={() => setImporting(true)} className="btn-dark"><Upload size={14} /><span>Import from Excel / text</span></button>
              <button onClick={() => onSavePlan(buildSamplePlan(week))} className="btn-dark text-[#d8b4fe]"><Sparkles size={14} /><span>Load sample plan</span></button>
            </div>
          </div>
        )
      ) : (
        <>
          <div className="rounded-xl border border-[#342b27] bg-[#0d0b0a] p-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <div className="text-[12px] text-[#b3a59e] uppercase font-bold">Progress</div>
              <div className="text-[20px] font-extrabold font-mono text-white">{done}/{total} <span className="text-[13px] font-sans text-[#dcd2cd]">tasks done</span></div>
            </div>
            <label className="block">
              <div className="text-[12px] text-[#b3a59e] uppercase font-bold flex items-center gap-1"><Target size={12} />Proposed target (CBM)</div>
              <TargetInput plan={plan} onChange={change} />
            </label>
            {plan.targets.map((t, i) => (
              <div key={i}>
                <div className="text-[12px] text-[#b3a59e] uppercase font-bold flex items-center gap-1"><Target size={12} />{t.label}</div>
                <div className="text-[20px] font-extrabold font-mono text-[#FFA08C]">{t.value.toLocaleString()} <span className="text-[13px] font-sans">{t.unit}</span></div>
              </div>
            ))}
            <div className="ml-auto text-[12.5px] text-[#8a7d77]">{plan.sourceName} · {new Date(plan.importedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
          </div>

          <Panel title="Suggested tasks from your inquiries" icon={Lightbulb} open={open.suggest} onToggle={() => setOpen(o => ({ ...o, suggest: !o.suggest }))} right={`${suggestions.length}`}>
            <Suggestions suggestions={suggestions} plan={plan} onAdd={(dayIndex, text) => change(p => addItem(p, dayIndex, text))} />
          </Panel>

          <Panel title="VP's comments" icon={MessageSquare} open={open.vp} onToggle={() => setOpen(o => ({ ...o, vp: !o.vp }))} right={plan.reviewNote ? 'has notes' : ''}>
            <div className="p-3">
              <NotesInput plan={plan} onChange={change} />
            </div>
          </Panel>

          <div className="rounded-xl border border-[#342b27] bg-[#0d0b0a] overflow-hidden">
            <div className="px-3 py-2 border-b border-[#342b27] bg-[#110e0d] font-extrabold text-white tracking-wider">ANY DAY THIS WEEK</div>
            <div className="divide-y divide-[#1f1916]">
              {plan.general.map(item => (
                <TaskRow key={item.id} item={item}
                  onToggle={(v) => change(p => patchItem(p, -1, item.id, { done: v }))}
                  onNote={(note) => change(p => patchItem(p, -1, item.id, { note }))}
                  onDelete={() => change(p => patchItem(p, -1, item.id, null))} />
              ))}
            </div>
            <AddTask onAdd={(text) => change(p => addItem(p, -1, text))} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {plan.days.map((d, i) => (
              <DayCard key={d.day} day={d} index={i} isToday={d.date === today} isPast={d.date < today} onChange={change} />
            ))}
          </div>

          {plan.extras.length > 0 && (
            <div className="space-y-2">
              <div className="text-[13px] font-extrabold text-[#dcd2cd] uppercase tracking-wider">Other sheets in the imported file</div>
              {plan.extras.map(x => (
                <div key={x.sheet} className="rounded-xl border border-[#342b27] bg-[#0d0b0a] overflow-hidden">
                  <button onClick={() => setShowExtra(showExtra === x.sheet ? null : x.sheet)} className="w-full text-left px-3 py-2 font-bold text-white hover:bg-[#181412] flex items-center gap-2">
                    <FileSpreadsheet size={14} className="text-emerald-400" />{x.sheet}
                    <span className="text-[12px] text-[#b3a59e] font-normal">{x.rows.length} rows · {showExtra === x.sheet ? 'hide' : 'show'}</span>
                  </button>
                  {showExtra === x.sheet && (
                    <div className="overflow-x-auto border-t border-[#342b27]">
                      <table className="text-[13px] w-full">
                        <tbody>
                          {x.rows.map((r, ri) => (
                            <tr key={ri} className={ri === 0 ? 'font-bold text-white bg-[#110e0d]' : 'text-[#dcd2cd]'}>
                              {r.map((c, ci) => <td key={ci} className="px-2 py-1 border-b border-r border-[#1f1916] whitespace-nowrap">{c}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
