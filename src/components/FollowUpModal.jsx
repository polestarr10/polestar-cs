import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Send, Repeat, XCircle } from 'lucide-react';
import { buildFollowUpSubject, buildFollowUpBody, followUpState, formatQuiet, MAX_FOLLOW_UPS } from '../utils/followUps';
import { cleanEmail } from '../utils/replyDraft';

// Drafts the follow-up email; the rep pastes it into a Reply on the customer's
// thread, then marks it sent so the next follow-up is scheduled 24h later.
export default function FollowUpModal({ isOpen, onClose, inquiry, onMarkSent, onCloseLost, currentUser }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);

  const fu = inquiry ? followUpState(inquiry) : null;
  const number = fu?.stage === 'due' ? fu.number : Math.min((fu?.sent || 0) + 1, MAX_FOLLOW_UPS);

  useEffect(() => {
    if (!isOpen || !inquiry) return;
    setSubject(buildFollowUpSubject(inquiry));
    setBody(buildFollowUpBody(inquiry, number, currentUser));
    setCopied(false);
  }, [isOpen, inquiry?.id]);

  if (!isOpen || !inquiry) return null;

  const to = cleanEmail(inquiry.contactEmail);

  const handleCopy = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const markSent = () => {
    const at = new Date().toISOString();
    const by = currentUser?.name || 'CS Desk';
    onMarkSent({
      ...inquiry,
      followUps: [...(inquiry.followUps || []), { at, by, number }],
      auditLog: [...(inquiry.auditLog || []), { timestamp: at, action: `Follow-up ${number} sent to customer`, by }],
    }, `${inquiry.id}: follow-up ${number} logged`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[94vh] flex flex-col bg-[#0d0b0a] border border-[#c084fc]/60 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(192,132,252,0.25)]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#342b27] bg-[#110e0d]">
          <div className="flex items-center gap-2 min-w-0">
            <Repeat size={16} className="text-[#c084fc]" />
            <span className="text-[15px] font-extrabold text-white uppercase tracking-wider shrink-0">
              Follow-up {number} of {MAX_FOLLOW_UPS}: <span className="font-mono text-[#FFA08C]">{inquiry.id}</span>
            </span>
            <span className="text-sm text-[#dcd2cd] font-semibold ml-2 truncate">{inquiry.shipperName}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full bg-[#181412] hover:bg-[rgba(255,160,140,0.2)] text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          {fu && (
            <div className="text-sm text-[#dcd2cd]">
              No word from the customer for <span className="font-bold text-white">{formatQuiet(fu.hoursQuiet)}</span>
              {fu.sent > 0 ? `, ${fu.sent} follow-up${fu.sent === 1 ? '' : 's'} already sent.` : ' since our reply.'}
            </div>
          )}
          <div className="text-sm text-[#dcd2cd]">
            To: <span className="font-mono font-bold text-white">{to || 'no customer email on file'}</span>
          </div>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="scm-input w-full font-bold" />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="scm-input w-full min-h-[280px] font-mono leading-relaxed"
            spellCheck={false}
          />
        </div>

        <div className="px-5 py-3 border-t border-[#342b27] bg-[#110e0d] flex flex-wrap items-center justify-between gap-2">
          {fu?.stage === 'cold' ? (
            <button onClick={() => { onCloseLost(inquiry); onClose(); }} className="btn-dark text-[#f87171]">
              <XCircle size={13} />
              <span>Close as lost (no response)</span>
            </button>
          ) : <span className="text-[12.5px] text-[#b3a59e]">Paste it as a Reply on the customer's email, then mark it sent.</span>}
          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="btn-coral-outline">
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied!' : '1. Copy follow-up'}</span>
            </button>
            <button onClick={markSent} className="btn-coral">
              <Send size={13} />
              <span>2. Mark follow-up sent</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
