import React, { useState, useEffect, useMemo } from 'react';
import { X, Copy, Check, Send, Globe2, RotateCcw, UserPlus, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { copyQuote } from '../utils/richCopy';
import { buildComposeLink, findPlaceholders } from '../utils/replyDraft';
import { signatureList } from '../utils/signatures';
import {
  isExWorks, agentsForInquiry, initialAgentFields, buildAgentSubject, buildAgentBody,
  agentRequestMissing, newAgentId,
} from '../utils/agentRequest';

function Field({ label, missing, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className={`text-[12.5px] font-extrabold block mb-1 ${missing ? 'text-warn' : 'text-ink-2'}`}>
        {label}{missing && ' *'}
      </span>
      {children}
    </label>
  );
}

function ago(iso) {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (min < 60) return `${min} min ago`;
  if (min < 48 * 60) return `${Math.round(min / 60)} h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// Drafts the rate request to an agent for an ex-works inquiry. The rep sends it
// as a new email, then marks it sent so the inquiry shows who was asked.
export default function AgentRequestModal({ isOpen, onClose, inquiry, currentUser, onMarkSent, onSaveAgents }) {
  const [a, setA] = useState(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [subjectOverride, setSubjectOverride] = useState(null);
  const [bodyOverride, setBodyOverride] = useState(null);
  const [copied, setCopied] = useState('');
  const [agentSaved, setAgentSaved] = useState(false);

  useEffect(() => {
    if (!isOpen || !inquiry) return;
    setA(initialAgentFields(inquiry, currentUser));
    setPickupAddress(inquiry.pickupAddress || '');
    setSubjectOverride(null);
    setBodyOverride(null);
    setCopied('');
    setAgentSaved(false);
  }, [isOpen, inquiry?.id]);

  const draftInquiry = useMemo(() => (inquiry ? { ...inquiry, pickupAddress } : null), [inquiry, pickupAddress]);
  const generated = useMemo(() => {
    if (!draftInquiry || !a) return null;
    return { subject: buildAgentSubject(draftInquiry), body: buildAgentBody(draftInquiry, a, currentUser) };
  }, [draftInquiry, a, currentUser]);

  if (!isOpen || !inquiry || !a || !generated) return null;

  if (!isExWorks(inquiry)) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm">
        <div className="w-full max-w-md p-5 rounded-2xl bg-surface border border-accent/50 space-y-3 text-center">
          <div className="font-extrabold text-ink">Agent rate requests are for ex-works inquiries only</div>
          <div className="text-sm text-ink-3">{inquiry.id} is on {inquiry.incoterms || 'no'} terms. Set the incoterms to EXW first if the customer wants pickup.</div>
          <button onClick={onClose} className="btn-dark mx-auto">Close</button>
        </div>
      </div>
    );
  }

  const agents = agentsForInquiry(currentUser, inquiry);
  const signatures = signatureList(currentUser);
  const subject = subjectOverride ?? generated.subject;
  const body = bodyOverride ?? generated.body;
  const missing = agentRequestMissing(draftInquiry, a);
  const placeholders = findPlaceholders(`${subject}\n${body}`);
  const canSend = missing.length === 0 && placeholders.length === 0;
  const email = a.agentEmail.trim();
  const isSavedAgent = agents.some(x => (x.email || '').toLowerCase() === email.toLowerCase());
  const previous = inquiry.agentRequests || [];

  const set = (key) => (e) => setA(prev => ({ ...prev, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const pickAgent = (e) => {
    const ag = agents.find(x => x.id === e.target.value);
    setA(prev => ({ ...prev, agentName: ag?.name || '', agentEmail: ag?.email || '' }));
  };
  const selectedId = agents.find(x => (x.email || '').toLowerCase() === email.toLowerCase())?.id || '';

  const flash = (what) => { setCopied(what); setTimeout(() => setCopied(''), 2500); };
  const copyBody = () => { if (canSend) { copyQuote(body); flash('body'); } };
  const copySubject = () => { navigator.clipboard.writeText(subject); flash('subject'); };

  const saveAgent = async () => {
    const list = [...(currentUser?.agents || []), { id: newAgentId(), name: a.agentName.trim(), company: '', email, location: inquiry.pol || '' }];
    const err = await onSaveAgents(list);
    if (!err) setAgentSaved(true);
  };

  const markSent = () => {
    const at = new Date().toISOString();
    const by = currentUser?.name || 'CS Desk';
    const agentLabel = a.agentName.trim() ? `${a.agentName.trim()} <${email}>` : email;
    onMarkSent({
      ...inquiry,
      pickupAddress: pickupAddress.trim(),
      agentRequests: [...previous, { at, by, agentName: a.agentName.trim(), agentEmail: email }],
      auditLog: [...(inquiry.auditLog || []), { timestamp: at, action: `Rate request sent to agent ${agentLabel}`, by }],
    }, `${inquiry.id}: rate request to ${a.agentName.trim() || email} logged`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col bg-surface border border-sky-500/60 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(14,165,233,0.25)]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-line bg-panel">
          <div className="flex items-center gap-2 min-w-0">
            <Globe2 size={16} className="text-info" />
            <span className="text-[15px] font-extrabold text-ink uppercase tracking-wider shrink-0">
              Ask agent for rates: <span className="font-mono text-accent-ink">{inquiry.id}</span>
            </span>
            <span className="text-sm text-ink-2 font-semibold ml-2 truncate">{inquiry.pol || '—'} → {inquiry.pod || '—'}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full bg-raised hover:bg-[rgba(255,160,140,0.2)] text-ink-2 hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2">
          {/* Left: agent and details */}
          <div className="p-5 space-y-4 border-b lg:border-b-0 lg:border-r border-line">
            <div className="text-[12.5px] text-ink-3">
              The customer's name, email and address are left out of this email, so the agent only sees the shipment.
            </div>

            <div>
              <div className="text-[13px] font-extrabold text-info uppercase tracking-wider mb-2">1. Pick the agent</div>
              <div className="grid grid-cols-2 gap-3">
                {agents.length > 0 && (
                  <Field label="Saved agent" className="col-span-2">
                    <select value={selectedId} onChange={pickAgent} className="scm-select w-full">
                      <option value="">Someone else (type below)</option>
                      {agents.map(ag => (
                        <option key={ag.id} value={ag.id}>
                          {ag.name || ag.email}{ag.company ? `, ${ag.company}` : ''}{ag.location ? ` (${ag.location})` : ''}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label="Agent name">
                  <input value={a.agentName} onChange={set('agentName')} className="scm-input w-full" placeholder="e.g. Li Wei" />
                </Field>
                <Field label="Agent email" missing={missing.includes('Agent email')}>
                  <input type="email" value={a.agentEmail} onChange={set('agentEmail')} className="scm-input w-full font-mono" placeholder="ops@agent.com" />
                </Field>
              </div>
              {onSaveAgents && email && !isSavedAgent && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                <button type="button" onClick={saveAgent} disabled={agentSaved} className="mt-2 text-[12.5px] font-bold text-good hover:text-ink flex items-center gap-1 disabled:opacity-70">
                  <UserPlus size={13} />{agentSaved ? 'Saved to my agents ✓' : 'Save to my agents'}
                </button>
              )}
            </div>

            <div>
              <div className="text-[13px] font-extrabold text-info uppercase tracking-wider mb-2">2. Check what we ask for</div>
              <div className="space-y-3">
                <Field label="Pickup address" missing={missing.includes('Pickup address')}>
                  <textarea rows={2} value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} className="scm-input w-full" placeholder="Supplier / factory address the agent picks up from" />
                </Field>
                {(missing.includes('Port of loading') || missing.includes('Commodity')) && (
                  <div className="text-[12.5px] text-warn font-bold">
                    {missing.filter(m => m === 'Port of loading' || m === 'Commodity').join(' and ')} missing on the inquiry: add {missing.length > 1 ? 'them' : 'it'} in the inquiry details first.
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer">
                  <input type="checkbox" checked={a.askFreight} onChange={set('askFreight')} className="accent-sky-400" />
                  Also ask for ocean freight to {inquiry.pod || 'the destination'}
                </label>
                <Field label="Remarks (optional)">
                  <textarea rows={2} value={a.remarks} onChange={set('remarks')} className="scm-input w-full" placeholder="e.g. Factory closes at 5 pm, tail-lift truck needed" />
                </Field>
                <Field label="Signature">
                  <select value={a.signatureId} onChange={set('signatureId')} className="scm-select w-full">
                    {signatures.map(sig => <option key={sig.id} value={sig.id}>{sig.name}{sig.isDefault ? ' (default)' : ''}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            {previous.length > 0 && (
              <div className="rounded-lg border border-line overflow-hidden">
                <div className="px-3 py-1.5 bg-panel text-[12.5px] font-extrabold text-ink-2">Already asked</div>
                <div className="divide-y divide-line-soft">
                  {previous.map((r, i) => (
                    <div key={i} className="px-3 py-1.5 text-[13px] flex justify-between gap-2">
                      <span className="text-ink font-semibold truncate">{r.agentName || r.agentEmail}{r.agentName && <span className="font-mono text-ink-4 font-normal"> {r.agentEmail}</span>}</span>
                      <span className="text-ink-4 shrink-0">{ago(r.at)}</span>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-1.5 text-[12px] text-ink-4">When the agent replies, put their price in the buy charge (Reply & Quote, internal note).</div>
              </div>
            )}
          </div>

          {/* Right: draft */}
          <div className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-extrabold text-info uppercase tracking-wider">3. Review the email</div>
              {(subjectOverride !== null || bodyOverride !== null) && (
                <button onClick={() => { setSubjectOverride(null); setBodyOverride(null); }} className="btn-dark text-sm" title="Discard manual edits and rebuild the email">
                  <RotateCcw size={13} /><span>Rebuild from details</span>
                </button>
              )}
            </div>
            <div className="text-sm text-ink-2">To: <span className="font-mono font-bold text-ink">{email || '—'}</span></div>
            <div className="flex gap-2">
              <input value={subject} onChange={(e) => setSubjectOverride(e.target.value)} className="scm-input w-full font-bold" />
              <button type="button" onClick={copySubject} className="btn-dark shrink-0 text-[13px]" title="Copy the subject">
                {copied === 'subject' ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
            <textarea value={body} onChange={(e) => setBodyOverride(e.target.value)} className="scm-input w-full flex-1 min-h-[380px] font-mono leading-relaxed" spellCheck={false} />
            {bodyOverride !== null && (
              <div className="text-[12.5px] text-ink-3">You've edited the email by hand, so changes on the left won't update it until you rebuild it.</div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-line bg-panel flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            {canSend ? (
              <span className="flex items-center gap-1.5 text-good font-bold">
                <CheckCircle2 size={15} /> Ready. Send it as a new email to the agent, then mark it sent.
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-warn font-bold">
                <AlertTriangle size={15} />
                {missing.length ? `Fill in: ${missing.join(', ')}` : `Replace ${placeholders.join(', ')} in the email first.`}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[['gmail', 'Gmail'], ['outlook', 'Outlook']].map(([ch, label]) => (
              <a key={ch} href={canSend ? buildComposeLink(ch, { to: email, subject, body }) : undefined} target="_blank" rel="noreferrer"
                onClick={(e) => { if (!canSend) e.preventDefault(); }}
                className={`btn-dark text-[13px] ${canSend ? '' : 'opacity-40 cursor-not-allowed'}`} title={`Open a new ${label} email with this text`}>
                <ExternalLink size={12} /><span>{label}</span>
              </a>
            ))}
            <button onClick={copyBody} disabled={!canSend} className="btn-coral-outline disabled:opacity-40 disabled:cursor-not-allowed">
              {copied === 'body' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied === 'body' ? 'Copied!' : '1. Copy email'}</span>
            </button>
            <button onClick={markSent} disabled={!canSend} className="btn-coral disabled:opacity-40 disabled:cursor-not-allowed">
              <Send size={13} /><span>2. Mark as sent</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
