import React, { useMemo } from 'react';
import { Repeat, XCircle, Clock, History } from 'lucide-react';
import { Row, Section } from './MyDay';
import { formatQuiet, FOLLOW_UP_AFTER_HOURS, MAX_FOLLOW_UPS } from '../utils/followUps';

const RECENT_DAYS = 7;

function fmtWhen(iso) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Everything about chasing quiet customers in one place: due, gone cold,
// scheduled next, and what was sent recently.
export default function FollowUps({ inquiries, now, followUps, onFollowUp, onCloseLost, onViewDetails }) {
  const recent = useMemo(() => {
    const since = now - RECENT_DAYS * 86400000;
    return inquiries
      .flatMap(inq => (inq.followUps || []).map(f => ({ inquiry: inq, ...f })))
      .filter(f => Date.parse(f.at) >= since)
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [inquiries, now]);

  return (
    <div className="space-y-3 mt-2">
      <div className="text-sm text-[#dcd2cd]">
        When a customer goes quiet {FOLLOW_UP_AFTER_HOURS}h after our reply, a follow-up falls due. Up to {MAX_FOLLOW_UPS} follow-ups, {FOLLOW_UP_AFTER_HOURS}h apart. A reply from the customer starts the count again.
      </div>

      <Section icon={Repeat} title="Due now" color="#c084fc" count={followUps.due.length}
        hint="Send these today, oldest silence first."
        empty="No follow-ups due right now.">
        {followUps.due.map(({ inquiry: inq, fu }) => (
          <Row key={inq.id} inquiry={inq} onOpen={onViewDetails} noteClass="text-[#c084fc]"
            note={`Follow-up ${fu.number} of ${MAX_FOLLOW_UPS} · no reply for ${formatQuiet(fu.hoursQuiet)}${inq.isQuoted ? '' : ' (we asked for details)'}`}>
            <button onClick={() => onFollowUp(inq)} className="btn-coral"><Repeat size={13} /><span>Follow up</span></button>
          </Row>
        ))}
      </Section>

      <Section icon={XCircle} title={`No reply after ${MAX_FOLLOW_UPS}`} color="#f87171" count={followUps.cold.length}
        hint="Close as lost, or try once more."
        empty="No customers have gone cold.">
        {followUps.cold.map(({ inquiry: inq, fu }) => (
          <Row key={inq.id} inquiry={inq} onOpen={onViewDetails} noteClass="text-[#f87171]"
            note={`${fu.sent} follow-ups sent · quiet ${formatQuiet(fu.hoursQuiet)}`}>
            <button onClick={() => onFollowUp(inq)} className="btn-dark"><Repeat size={13} /><span>Once more</span></button>
            <button onClick={() => onCloseLost(inq)} className="btn-dark text-[#f87171]"><XCircle size={13} /><span>Close as lost</span></button>
          </Row>
        ))}
      </Section>

      <Section icon={Clock} title="Coming up" color="#fbbf24" count={followUps.waiting.length}
        hint="Waiting on the customer; a follow-up falls due at the time shown."
        empty="Nothing scheduled.">
        {followUps.waiting.map(({ inquiry: inq, fu }) => (
          <Row key={inq.id} inquiry={inq} onOpen={onViewDetails}
            note={`Follow-up ${Math.min(fu.sent + 1, MAX_FOLLOW_UPS)} due in ${formatQuiet((fu.dueAt - now) / 3600000)} (${fmtWhen(fu.dueAt)})${fu.sent ? ` · ${fu.sent} sent` : ''}`}>
            <button onClick={() => onFollowUp(inq)} className="btn-dark"><Repeat size={13} /><span>Follow up early</span></button>
          </Row>
        ))}
      </Section>

      <Section icon={History} title={`Sent in the last ${RECENT_DAYS} days`} color="#34d399" count={recent.length}
        hint="Logged when you clicked “Mark follow-up sent”."
        empty="No follow-ups sent this week.">
        {recent.map(f => (
          <Row key={`${f.inquiry.id}-${f.at}`} inquiry={f.inquiry} onOpen={onViewDetails}
            note={`Follow-up ${f.number || ''} sent ${fmtWhen(f.at)}${f.by ? ` by ${f.by}` : ''}`} />
        ))}
      </Section>
    </div>
  );
}
