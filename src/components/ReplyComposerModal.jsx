import React, { useState, useEffect, useMemo } from 'react';
import { X, Send, Copy, Check, Mail, AlertTriangle, RotateCcw, CheckCircle2, Lock, Plus, Trash2, PenLine } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  initialDraftFields,
  getMissingFields,
  buildReplySubject,
  buildReplyBody,
  formatRate,
  findPlaceholders,
  defaultCharges,
  newCharge,
  chargeableWM,
} from '../utils/replyDraft';
import { signatureList } from '../utils/signatures';
import SignatureManager from './SignatureManager';

const CURRENCIES = [['USD', '$'], ['INR', '₹'], ['EUR', '€']];

// Per-container unit for an FCL quote, from the equipment typed in.
function fclUnit(containerType) {
  const c = containerType || '';
  if (/reefer/i.test(c)) return "/ 40' Reefer";
  if (/\b20/.test(c)) return "/ 20'GP";
  return "/ 40'HC";
}
import { quoteRound } from '../utils/followUps';

const CHANNEL_LABELS = { mailto: 'email app', gmail: 'Gmail', outlook: 'Outlook', manual: 'reply in mail client' };

function Field({ label, missing, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className={`text-[12.5px] font-extrabold block mb-1 ${missing ? 'text-amber-300' : 'text-[#dcd2cd]'}`}>
        {label}{missing && ' *'}
      </span>
      {children}
    </label>
  );
}

export default function ReplyComposerModal({ isOpen, onClose, inquiry, onSendReply, currentUser, onSaveSignatures }) {
  const [f, setF] = useState(null);
  const [managingSignatures, setManagingSignatures] = useState(false);
  const [subjectOverride, setSubjectOverride] = useState(null);
  const [bodyOverride, setBodyOverride] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (inquiry && isOpen) {
      setF(initialDraftFields(inquiry, currentUser));
      setSubjectOverride(null);
      setBodyOverride(null);
      setCopied(false);
    }
  }, [inquiry, isOpen]);

  const generated = useMemo(() => {
    if (!inquiry || !f) return null;
    return { subject: buildReplySubject(inquiry, f), body: buildReplyBody(inquiry, f, currentUser) };
  }, [inquiry, f, currentUser]);

  if (!isOpen || !inquiry || !f || !generated) return null;

  const subject = subjectOverride ?? generated.subject;
  const body = bodyOverride ?? generated.body;
  const missing = getMissingFields(f);
  const missingKeys = new Set(missing.map(m => m.key));
  const placeholders = findPlaceholders(`${subject}\n${body}`);
  // Nothing can be copied, opened or marked replied until the required details
  // are in and no [PLACEHOLDER] is left in the text.
  const canSend = missing.length === 0 && placeholders.length === 0;

  const set = (key) => (e) => setF(prev => ({ ...prev, [key]: e.target.value }));
  const lcl = f.format === 'LCL';
  const wm = chargeableWM(f.volumeCbm, f.grossWeightKg);
  const signatures = signatureList(currentUser);

  // Switching format resets the rate unit and the charge lines to that format's set.
  const switchFormat = (format) => setF(prev => ({
    ...prev,
    format,
    rateUnit: format === 'LCL' ? '/ W/M' : fclUnit(prev.containerType),
    minimum: format === 'LCL' ? (prev.minimum || '1 W/M') : '',
    charges: defaultCharges(format, { ...inquiry, quotedCurrency: prev.currency }),
    freeDays: format === 'LCL' ? '' : (prev.freeDays || '14 days combined demurrage/detention'),
  }));
  const setCharge = (id, key) => (e) => setF(prev => ({ ...prev, charges: prev.charges.map(c => (c.id === id ? { ...c, [key]: e.target.value } : c)) }));
  const removeCharge = (id) => setF(prev => ({ ...prev, charges: prev.charges.filter(c => c.id !== id) }));
  const addCharge = () => setF(prev => ({ ...prev, charges: [...prev.charges, newCharge('', lcl ? '/ W/M' : 'per container', prev.currency)] }));

  const markReplied = (channel) => {
    const now = new Date();
    const rate = formatRate(f.currency, f.rateAmount, f.rateUnit);
    const revised = Boolean(inquiry.isQuoted);
    const round = quoteRound(inquiry) + 1;
    const received = Date.parse(inquiry.awaitingSince || inquiry.receivedAt);
    const updated = {
      ...inquiry,
      contactPerson: f.contactPerson,
      contactEmail: f.contactEmail.trim(),
      pol: f.pol,
      polCode: f.polCode,
      pod: f.pod,
      podCode: f.podCode,
      containerType: f.containerType,
      routingMode: f.routingMode,
      commodity: f.commodity,
      grossWeightKg: Number(f.grossWeightKg) || 0,
      volumeCbm: Number(f.volumeCbm) || 0,
      incoterms: f.incoterms,
      preferredCarrier: f.carrier,
      freeDaysAtPod: f.freeDays,
      quotedRate: rate,
      quotedCurrency: f.currency,
      quotedAmountTotal: parseFloat(f.rateAmount) || 0,
      quoteValidity: f.validity,
      isQuoted: true,
      hasReplied: true,
      status: revised ? 'NEGOTIATING' : 'QUOTED_REPLIED',
      repliedAt: now.toISOString(),
      responseTatMinutes: isNaN(received) ? null : Math.max(0, Math.round((now - received) / 60000)),
      assignedTo: currentUser?.name ? `${currentUser.name} (${currentUser.role || 'CS Desk'})` : inquiry.assignedTo,
      conversationGist: `Polestar CS ${revised ? `sent a revised quote (round ${round})` : 'replied'} with ${rate}${f.carrier ? ` on ${f.carrier}` : ''}, valid until ${f.validity}.`,
      auditLog: [
        ...(inquiry.auditLog || []),
        {
          timestamp: now.toISOString(),
          action: `${revised ? `Revised quotation sent, round ${round}` : `Quotation reply sent via ${CHANNEL_LABELS[channel]}`} (${f.format} ${rate}${
            f.charges.filter(c => parseFloat(c.amount) > 0).map(c => ` + ${c.name} ${formatRate(c.currency, c.amount, c.unit)}`).join('')})`,
          by: currentUser?.name || 'CS Desk',
        },
      ],
    };

    try {
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    } catch (err) {}

    onSendReply(updated);
    onClose();
  };

  const handleCopy = () => {
    if (!canSend) return;
    // Body only: the rep pastes it into a Reply on the customer's original email.
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col bg-[#0d0b0a] border border-[#FFA08C]/50 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(255,160,140,0.3)]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#342b27] bg-[#110e0d]">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-[#FFA08C]" />
            <span className="text-[15px] font-extrabold text-white uppercase tracking-wider">
              Reply & Quote: <span className="font-mono text-[#FFA08C]">{inquiry.id}</span>
            </span>
            <span className="text-sm text-[#dcd2cd] font-semibold ml-2 truncate max-w-[320px]">{inquiry.shipperName}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-[#181412] hover:bg-[rgba(255,160,140,0.2)] text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2">

          {/* Left: details */}
          <div className="p-5 space-y-4 border-b lg:border-b-0 lg:border-r border-[#342b27]">
            <div>
              <div className="text-[13px] font-extrabold text-[#FFA08C] uppercase tracking-wider mb-2">1. Confirm shipment details</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Contact person">
                  <input value={f.contactPerson} onChange={set('contactPerson')} className="scm-input w-full" />
                </Field>
                <Field label="Customer email" missing={missingKeys.has('contactEmail')}>
                  <input type="email" value={f.contactEmail} onChange={set('contactEmail')} className="scm-input w-full font-mono" placeholder="name@company.com" />
                </Field>
                <Field label="Port of loading" missing={missingKeys.has('pol')}>
                  <input value={f.pol} onChange={set('pol')} className="scm-input w-full" />
                </Field>
                <Field label="Port of discharge" missing={missingKeys.has('pod')}>
                  <input value={f.pod} onChange={set('pod')} className="scm-input w-full" />
                </Field>
                <Field label="Container / equipment" missing={missingKeys.has('containerType')}>
                  <input value={f.containerType} onChange={set('containerType')} className="scm-input w-full" />
                </Field>
                <Field label="Commodity" missing={missingKeys.has('commodity')}>
                  <input value={f.commodity} onChange={set('commodity')} className="scm-input w-full" />
                </Field>
                <Field label="Gross weight (kg)" missing={missingKeys.has('grossWeightKg')}>
                  <input type="number" min="0" value={f.grossWeightKg} onChange={set('grossWeightKg')} className="scm-input w-full font-mono font-bold" />
                </Field>
                <Field label="Volume (CBM)">
                  <input type="number" min="0" step="0.01" value={f.volumeCbm} onChange={set('volumeCbm')} className="scm-input w-full font-mono" />
                </Field>
                <Field label="Incoterms">
                  <input value={f.incoterms} onChange={set('incoterms')} className="scm-input w-full" />
                </Field>
                <Field label="Mode">
                  <input value={f.routingMode} onChange={set('routingMode')} className="scm-input w-full" />
                </Field>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-[13px] font-extrabold text-[#FFA08C] uppercase tracking-wider">2. Enter the quotation</div>
                <div className="flex items-center rounded-full border border-[#3d332e] overflow-hidden" title="Quote format">
                  {['FCL', 'LCL'].map(k => (
                    <button key={k} type="button" onClick={() => f.format !== k && switchFormat(k)}
                      className={`px-3.5 py-1 text-[13px] font-extrabold ${f.format === k ? 'bg-[#FFA08C] text-[#0d0b0a]' : 'text-[#dcd2cd] hover:text-white'}`}>
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              {lcl && (
                <div className="text-[12.5px] text-[#b3a59e] mb-2">
                  LCL: freight per W/M (1 CBM or 1,000 kg, whichever is higher).
                  {wm > 0 && <> This shipment is <b className="text-white">{wm} W/M</b> ({Number(f.volumeCbm) || 0} CBM, {Number(f.grossWeightKg) || 0} kg).</>}
                </div>
              )}
              <div className="grid grid-cols-12 gap-2 mb-3">
                <Field label="Currency" className="col-span-3">
                  <select value={f.currency} onChange={set('currency')} className="scm-select w-full font-extrabold text-[#FFA08C]">
                    {CURRENCIES.map(([c, sym]) => <option key={c} value={c}>{c} ({sym})</option>)}
                  </select>
                </Field>
                <Field label="Ocean freight" missing={missingKeys.has('rateAmount')} className={lcl ? 'col-span-3' : 'col-span-5'}>
                  <input type="number" min="0" value={f.rateAmount} onChange={set('rateAmount')} className="scm-input w-full font-mono font-bold text-emerald-400" placeholder={lcl ? 'e.g. 40' : 'e.g. 1450'} />
                </Field>
                <Field label="Per" className={lcl ? 'col-span-3' : 'col-span-4'}>
                  <input value={f.rateUnit} onChange={set('rateUnit')} className="scm-input w-full" />
                </Field>
                {lcl && (
                  <Field label="Minimum" className="col-span-3">
                    <input value={f.minimum} onChange={set('minimum')} className="scm-input w-full" placeholder="1 W/M" />
                  </Field>
                )}
              </div>

              <div className="mb-3 rounded-lg border border-[#342b27] overflow-hidden">
                <div className="px-3 py-1.5 bg-[#110e0d] text-[12.5px] font-extrabold text-[#dcd2cd] flex items-center justify-between">
                  <span>Other charges <span className="font-normal text-[#8a7d77]">(lines left blank are not put in the reply)</span></span>
                  <button type="button" onClick={addCharge} className="text-[#FFA08C] hover:text-white flex items-center gap-1"><Plus size={12} />Add line</button>
                </div>
                <div className="divide-y divide-[#1f1916]">
                  {f.charges.map(c => (
                    <div key={c.id} className="grid grid-cols-12 gap-1.5 p-1.5 items-center">
                      <input value={c.name} onChange={setCharge(c.id, 'name')} className="scm-input col-span-5 !py-1 text-[13px]" placeholder="Charge name" />
                      <select value={c.currency} onChange={setCharge(c.id, 'currency')} className="scm-select col-span-2 !py-1 text-[13px]">
                        {CURRENCIES.map(([cur]) => <option key={cur} value={cur}>{cur}</option>)}
                      </select>
                      <input type="number" min="0" value={c.amount} onChange={setCharge(c.id, 'amount')} className="scm-input col-span-2 !py-1 text-[13px] font-mono" placeholder="Amount" />
                      <input value={c.unit} onChange={setCharge(c.id, 'unit')} className="scm-input col-span-2 !py-1 text-[13px]" placeholder="per …" />
                      <button type="button" onClick={() => removeCharge(c.id)} className="col-span-1 flex justify-center text-[#6f625c] hover:text-[#f87171]" title="Remove line"><Trash2 size={13} /></button>
                    </div>
                  ))}
                  {f.charges.length === 0 && <div className="px-3 py-2 text-[12.5px] text-[#8a7d77]">No other charges.</div>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Carrier">
                  <input value={f.carrier} onChange={set('carrier')} className="scm-input w-full" />
                </Field>
                <Field label="Transit time">
                  <input value={f.transitTime} onChange={set('transitTime')} className="scm-input w-full" placeholder="e.g. 5–7 days" />
                </Field>
                <Field label={lcl ? 'Free storage at CFS' : 'Free time at POD'}>
                  <input value={f.freeDays} onChange={set('freeDays')} className="scm-input w-full" />
                </Field>
                <Field label="Valid until">
                  <input type="date" value={f.validity} onChange={set('validity')} className="scm-input w-full font-mono" />
                </Field>
              </div>
              <Field label="Remarks (optional)" className="mt-3">
                <textarea value={f.remarks} onChange={set('remarks')} rows={2} className="scm-input w-full" placeholder="Surcharges, routing notes, etc." />
              </Field>
            </div>
          </div>

          {/* Right: draft */}
          <div className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-extrabold text-[#FFA08C] uppercase tracking-wider">3. Review the reply</div>
              {(subjectOverride !== null || bodyOverride !== null) && (
                <button
                  onClick={() => { setSubjectOverride(null); setBodyOverride(null); }}
                  className="btn-dark text-sm"
                  title="Discard manual edits and rebuild the draft from the details"
                >
                  <RotateCcw size={13} />
                  <span>Rebuild from details</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#dcd2cd]">
              <span>To: <span className="font-mono font-bold text-white">{f.contactEmail || '—'}</span></span>
              <span className="flex items-center gap-1.5">
                Signature
                <select value={f.signatureId} onChange={set('signatureId')} className="scm-select !py-1 text-[13px]">
                  {signatures.map(sig => <option key={sig.id} value={sig.id}>{sig.name}{sig.isDefault ? ' (default)' : ''}</option>)}
                </select>
                {onSaveSignatures && (
                  <button type="button" onClick={() => setManagingSignatures(true)} className="btn-dark !py-1 text-[13px]" title="Add or edit signatures">
                    <PenLine size={12} /><span>Manage</span>
                  </button>
                )}
              </span>
            </div>
            {missing.length > 0 ? (
              <div className="relative flex-1 min-h-[400px] rounded-lg border border-amber-400/50 overflow-hidden">
                <pre aria-hidden="true" className="absolute inset-0 p-3 text-[13px] font-mono text-slate-400 whitespace-pre-wrap blur-[3px] select-none pointer-events-none opacity-50">{body}</pre>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center bg-[#0d0b0a]/70">
                  <Lock size={22} className="text-amber-300" />
                  <div className="font-extrabold text-white">Reply locked until the details are filled in</div>
                  <div className="text-sm text-amber-300 font-bold">Fill in: {missing.map(m => m.label).join(', ')}</div>
                  <div className="text-[12.5px] text-[#b3a59e]">Use the fields on the left. The reply unlocks by itself once they're all filled.</div>
                </div>
              </div>
            ) : (
              <>
                <input
                  value={subject}
                  onChange={(e) => setSubjectOverride(e.target.value)}
                  className="scm-input w-full font-bold"
                />
                <textarea
                  value={body}
                  onChange={(e) => setBodyOverride(e.target.value)}
                  className="scm-input w-full flex-1 min-h-[360px] font-mono leading-relaxed"
                  spellCheck={false}
                />
              </>
            )}
            {bodyOverride !== null && (
              <div className="text-[12.5px] text-[#b3a59e]">
                You've edited the draft by hand, so changes to the details on the left won't update it until you rebuild it.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#342b27] bg-[#110e0d] flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            {canSend ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 size={15} /> Ready. Copy the reply, paste it into a Reply on the customer's email, then mark it replied.
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                <AlertTriangle size={15} />
                {missing.length > 0
                  ? `Fill in: ${missing.map(m => m.label).join(', ')}`
                  : `Replace ${placeholders.join(', ')} in the reply before sending.`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleCopy} disabled={!canSend} className="btn-coral-outline disabled:opacity-40 disabled:cursor-not-allowed">
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied!' : '1. Copy reply'}</span>
            </button>
            <button onClick={() => markReplied('manual')} disabled={!canSend} className="btn-coral disabled:opacity-40 disabled:cursor-not-allowed">
              <Send size={13} />
              <span>2. Mark as replied</span>
            </button>
          </div>
        </div>
      </div>

      <SignatureManager
        isOpen={managingSignatures}
        onClose={() => setManagingSignatures(false)}
        currentUser={currentUser}
        onSave={async (list) => {
          const err = await onSaveSignatures(list);
          if (!err) {
            const keep = list.find(sig => sig.id === f.signatureId) || list.find(sig => sig.isDefault) || list[0];
            setF(prev => ({ ...prev, signatureId: keep ? keep.id : 'standard' }));
          }
          return err;
        }}
      />
    </div>
  );
}
