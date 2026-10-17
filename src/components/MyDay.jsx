import React, { useState } from 'react';
import { Send, Repeat, CalendarClock, Hourglass, Target, CheckCircle2, XCircle, Pencil, AlertTriangle } from 'lucide-react';
import { isAwaitingReply, minutesWaiting, formatWaiting, REMINDER_INTERVAL_MIN } from '../hooks/useReplyReminders';
import { formatQuiet, formatExpiry, MAX_FOLLOW_UPS } from '../utils/followUps';
import { TaskRow, patchItem } from './WeeklyPlan';
import { dayKey } from '../utils/nominations';
import { ListChecks } from 'lucide-react';

export function Row({ inquiry, note, noteClass = 'text-[#dcd2cd]', onOpen, children }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#181311] cursor-pointer" onClick={() => onOpen(inquiry)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-extrabold text-[#FFA08C] text-sm">{inquiry.id}</span>
          <span className="text-sm font-semibold text-white truncate">{inquiry.shipperName}</span>
        </div>
        <div className="text-[12.5px] font-mono text-[#b3a59e]">
          {inquiry.polCode || inquiry.pol} ➔ {inquiry.podCode || inquiry.pod} · {inquiry.containerType}
          {inquiry.quotedRate ? ` · ${inquiry.quotedRate}` : ''}
        </div>
        <div className={`text-[12.5px] font-bold ${noteClass}`}>{note}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function Section({ icon: Icon, title, hint, count, color, empty, children }) {
  return (
    <div className="rounded-xl border border-[#342b27] bg-[#0d0b0a] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#342b27] bg-[#110e0d]">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color }} />
          <span className="text-[14px] font-extrabold text-white uppercase tracking-wider">{title}</span>
          <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-[#181412]" style={{ color }}>{count}</span>
        </div>
        <span className="text-[12.5px] text-[#b3a59e] hidden md:block">{hint}</span>
      </div>
      {count === 0
        ? <div className="px-4 py-3 text-sm text-[#b3a59e]">{empty}</div>
        : <div className="divide-y divide-[#2a231f] max-h-[360px] overflow-y-auto">{children}</div>}
    </div>
  );
}

function TargetCard({ progress, canEditTarget, onSetTarget }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const { target, actual, pct, bookings, missingCbm } = progress;

  const save = async (e) => {
    e.preventDefault();
    const n = Number(value);
    if (!(n > 0)) return;
    if (await onSetTarget(n)) setEditing(false);
  };

  return (
    <div className="rounded-xl border border-[#FFA08C]/40 bg-[#0d0b0a] p-4 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target size={17} className="text-[#FFA08C]" />
          <span className="text-[14px] font-extrabold text-white uppercase tracking-wider">This week's target</span>
        </div>
        {editing ? (
          <form onSubmit={save} className="flex items-center gap-2">
            <input autoFocus type="number" min="1" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} className="scm-input w-28 font-mono" placeholder="CBM" />
            <button type="submit" className="btn-coral text-sm">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="btn-dark text-sm">Cancel</button>
          </form>
        ) : canEditTarget ? (
          <button onClick={() => { setValue(target || ''); setEditing(true); }} className="btn-dark text-sm">
            <Pencil size={12} />
            <span>{target ? 'Change target' : 'Set weekly target'}</span>
          </button>
        ) : null}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[26px] font-extrabold font-mono text-white">{actual}</span>
        <span className="text-[15px] font-bold text-[#dcd2cd]">{target ? `/ ${target} CBM booked` : 'CBM booked'}</span>
        {pct !== null && <span className={`text-[15px] font-extrabold ${pct >= 100 ? 'text-emerald-400' : 'text-[#FFA08C]'}`}>{pct}%</span>}
        <span className="text-[13px] text-[#b3a59e] ml-1">from {bookings} confirmed booking{bookings === 1 ? '' : 's'}</span>
      </div>
      {target ? (
        <div className="h-2.5 rounded-full bg-[#181412] overflow-hidden">
          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-[#FFA08C]'}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      ) : (
        <div className="text-[13px] text-[#b3a59e]">
          No weekly target set yet. Agree it with the VP, then set it here or finalise your weekly plan.
        </div>
      )}
      {missingCbm > 0 && (
        <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-amber-300">
          <AlertTriangle size={13} /> {missingCbm} booking{missingCbm === 1 ? ' has' : 's have'} no CBM recorded, so {missingCbm === 1 ? "it doesn't" : "they don't"} count yet. Add the volume in the inquiry details.
        </div>
      )}
    </div>
  );
}

// Today's part of the rep's weekly plan.
function TodayPlan({ plan, now, onChangePlan, onOpenPlan }) {
  if (plan === undefined) return null;
  if (!plan) {
    return (
      <div className="rounded-xl border border-dashed border-[#3d332e] bg-[#0d0b0a] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-[#dcd2cd]"><ListChecks size={16} className="text-[#FFA08C]" />No plan for this week yet. Make one and today's checklist shows up here.</span>
        <button onClick={onOpenPlan} className="btn-dark text-sm">Plan this week</button>
      </div>
    );
  }
  const index = plan.days.findIndex(d => d.date === dayKey(new Date(now)));
  const today = plan.days[index];
  const done = today ? today.items.filter(i => i.done).length : 0;
  return (
    <Section icon={ListChecks} title={today ? `Today's plan${today.area ? `: ${today.area}` : ''}` : "Today's plan"} color="#FFA08C"
      count={today ? today.items.length - done : 0}
      hint={today ? `${done} of ${today.items.length} done` : ''}
      empty={today ? "Everything on today's plan is done." : 'Nothing planned for today (Sunday, or a day the plan leaves out).'}>
      {today && today.items.filter(i => !i.done).map(item => (
        <TaskRow key={item.id} item={item}
          onToggle={(v) => onChangePlan(plan.weekStart, p => patchItem(p, index, item.id, { done: v }))}
          onNote={(note) => onChangePlan(plan.weekStart, p => patchItem(p, index, item.id, { note }))} />
      ))}
      <div className="px-4 py-2 text-right"><button onClick={onOpenPlan} className="text-[13px] font-bold text-[#FFA08C] hover:text-white underline">Open the full week</button></div>
    </Section>
  );
}

// The rep's to-do list for today, most urgent first.
export default function MyDay({ inquiries, now, followUps, progress, canEditTarget, onSetTarget, onReply, onFollowUp, onConfirm, onCloseLost, onViewDetails, plan, onChangePlan, onOpenPlan }) {
  const replyNow = inquiries.filter(isAwaitingReply).sort((a, b) => minutesWaiting(b, now) - minutesWaiting(a, now));
  const followToday = [...followUps.due, ...followUps.cold];
  const awaitingNomination = followUps.waiting.filter(w => w.inquiry.isQuoted);

  return (
    <div className="space-y-3 mt-2">
      <TargetCard progress={progress} canEditTarget={canEditTarget} onSetTarget={onSetTarget} />

      <TodayPlan plan={plan} now={now} onChangePlan={onChangePlan} onOpenPlan={onOpenPlan} />

      <Section icon={Send} title="Reply now" color="#f87171" count={replyNow.length}
        hint={`Customers waiting on us. Aim to reply within ${REMINDER_INTERVAL_MIN} min.`}
        empty="Nobody is waiting on a reply.">
        {replyNow.map(inq => {
          const waited = minutesWaiting(inq, now);
          const isCustomerReply = inq.awaitingSince && inq.awaitingSince !== inq.receivedAt;
          return (
            <Row key={inq.id} inquiry={inq} onOpen={onViewDetails}
              noteClass={waited >= REMINDER_INTERVAL_MIN ? 'text-[#f87171]' : 'text-amber-300'}
              note={`${isCustomerReply ? 'Customer replied' : 'New inquiry'} · waiting ${formatWaiting(waited)}`}>
              <button onClick={() => onReply(inq)} className="btn-coral"><Send size={13} /><span>Reply</span></button>
            </Row>
          );
        })}
      </Section>

      <Section icon={Repeat} title="Follow up today" color="#c084fc" count={followToday.length}
        hint={`Customer silent 24h+ after our message. Up to ${MAX_FOLLOW_UPS} follow-ups, 24h apart.`}
        empty="No follow-ups due.">
        {followUps.due.map(({ inquiry: inq, fu }) => (
          <Row key={inq.id} inquiry={inq} onOpen={onViewDetails} noteClass="text-[#c084fc]"
            note={`Follow-up ${fu.number} of ${MAX_FOLLOW_UPS} due · no reply for ${formatQuiet(fu.hoursQuiet)}${inq.isQuoted ? '' : ' (we asked for details)'}`}>
            <button onClick={() => onFollowUp(inq)} className="btn-coral"><Repeat size={13} /><span>Follow up</span></button>
          </Row>
        ))}
        {followUps.cold.map(({ inquiry: inq, fu }) => (
          <Row key={inq.id} inquiry={inq} onOpen={onViewDetails} noteClass="text-[#f87171]"
            note={`No reply after ${MAX_FOLLOW_UPS} follow-ups · quiet ${formatQuiet(fu.hoursQuiet)}. Close it or try once more.`}>
            <button onClick={() => onFollowUp(inq)} className="btn-dark"><Repeat size={13} /><span>Once more</span></button>
            <button onClick={() => onCloseLost(inq)} className="btn-dark text-[#f87171]"><XCircle size={13} /><span>Close as lost</span></button>
          </Row>
        ))}
      </Section>

      <Section icon={CalendarClock} title="Quotes expiring" color="#fbbf24" count={followUps.expiring.length}
        hint="Open quotes within 2 days of their validity date, or past it."
        empty="No quotes about to expire.">
        {followUps.expiring.map(({ inquiry: inq, exp }) => (
          <Row key={inq.id} inquiry={inq} onOpen={onViewDetails} noteClass={exp.expired ? 'text-[#f87171]' : 'text-amber-300'}
            note={`Quote ${formatExpiry(exp)} · valid until ${new Date(`${inq.quoteValidity}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}>
            <button onClick={() => onReply(inq)} className="btn-dark"><Send size={13} /><span>Revise quote</span></button>
          </Row>
        ))}
      </Section>

      <Section icon={Hourglass} title="Waiting on customer" color="#34d399" count={awaitingNomination.length}
        hint="Quoted; waiting for the customer to confirm. Mark confirmed when the nomination arrives."
        empty="No open quotes waiting on a customer.">
        {awaitingNomination.map(({ inquiry: inq, fu }) => (
          <Row key={inq.id} inquiry={inq} onOpen={onViewDetails}
            note={`Quoted ${formatQuiet((now - Date.parse(inq.repliedAt)) / 3600000)} ago · next follow-up in ${formatQuiet((fu.dueAt - now) / 3600000)}${fu.sent ? ` · ${fu.sent} sent` : ''}`}>
            <button onClick={() => onConfirm(inq)} className="btn-green"><CheckCircle2 size={13} /><span>Customer confirmed</span></button>
          </Row>
        ))}
      </Section>
    </div>
  );
}
