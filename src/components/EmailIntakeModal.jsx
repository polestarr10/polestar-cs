import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Sparkles, Paperclip, Copy, Check, AlertTriangle, ArrowRight, RefreshCw,
  Inbox, MessageSquareReply, CheckCircle2, XCircle, Ban, FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { readEmailWithRules } from '../utils/ruleReader';
import { findPlaceholders } from '../utils/replyDraft';
import { sampleEmails } from '../data/sampleEmails';
import { uploadScreenshotToImageKit } from '../lib/imagekit';
import {
  analyzeEmailWithAI, resultToInquiry, emailTime, withSignature, findRefTag, LOST_REASONS,
} from '../lib/emailAI';

const KINDS = {
  new_inquiry: { label: 'New inquiry', icon: Inbox },
  customer_reply: { label: 'Customer reply', icon: MessageSquareReply },
  nomination: { label: 'Nomination / booking confirmed', icon: CheckCircle2 },
  declined: { label: 'Customer declined', icon: XCircle },
  not_freight: { label: 'Not a freight email', icon: Ban },
};

const MATCH_LABEL = {
  tag: 'matched by the Ref tag in the subject',
  strong: 'matched by sender and route',
  weak: 'possible match, please check',
  none: 'no match found, pick the inquiry',
};

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

function CopyButton({ text, label = 'Copy reply' }) {
  const [copied, setCopied] = useState(false);
  const blanks = findPlaceholders(text);
  return (
    <button
      type="button"
      onClick={() => { if (blanks.length) return; navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="btn-coral-outline disabled:opacity-40 disabled:cursor-not-allowed"
      disabled={!text.trim() || blanks.length > 0}
      title={blanks.length ? `Replace ${blanks.join(', ')} in the reply first` : undefined}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      <span>{copied ? 'Copied!' : label}</span>
    </button>
  );
}

// Set once the server says AI isn't configured, so later emails skip straight to the rules.
let aiUnavailable = false;

export default function EmailIntakeModal({
  isOpen, onClose, inquiries, currentUser,
  onCreateInquiry, onUpdateInquiry, onOpenComposer, onOpenConfirm,
}) {
  const [stage, setStage] = useState('input'); // input | working | result | error
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  const [result, setResult] = useState(null);
  const [fallbackNote, setFallbackNote] = useState('');
  const [kind, setKind] = useState('new_inquiry');
  const [draft, setDraft] = useState(null);        // new inquiry being reviewed
  const [matchId, setMatchId] = useState('');
  const [reply, setReply] = useState('');
  const [lostReason, setLostReason] = useState('other');
  const [lostNote, setLostNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStage('input');
    setText('');
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setResult(null);
    setFallbackNote('');
    setDraft(null);
  }, [isOpen]);

  const matchOptions = useMemo(
    () => [...inquiries]
      .filter(i => i.status !== 'CLOSED_LOST')
      .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)),
    [inquiries]
  );

  if (!isOpen) return null;

  const match = inquiries.find(i => i.id === matchId) || null;
  const signedReply = withSignature(reply, currentUser);

  const attach = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/') && f.type !== 'application/pdf') {
      setError({ message: 'Only screenshots (images) and PDFs can be attached.' });
      return;
    }
    setError(null);
    setFile(f);
    setPreviewUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  };

  const handlePaste = (e) => {
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (item) {
      e.preventDefault();
      attach(item.getAsFile());
    }
  };

  const applyResult = async (res) => {
    let screenshotUrl = null;
    if (file?.type.startsWith('image/')) {
      const uploaded = await uploadScreenshotToImageKit(file).catch(() => null);
      screenshotUrl = uploaded?.url || null;
    }
    setResult(res);
    setKind(res.kind);
    setDraft(resultToInquiry(res, { existing: inquiries, currentUser, rawText: text, screenshotUrl }));
    const validMatch = inquiries.some(i => i.id === res.matchedInquiryId);
    setMatchId(validMatch ? res.matchedInquiryId : (inquiries.find(i => i.id === findRefTag(text))?.id || ''));
    setReply(res.suggestedReply || '');
    setLostReason(res.declined?.reason || 'other');
    setLostNote(res.declined?.note || '');
    setStage('result');
  };

  const readWithRules = async (note) => {
    await applyResult(readEmailWithRules(text, inquiries));
    setFallbackNote(note);
  };

  // AI when it's available; otherwise (or if it fails) the built-in rules read pasted text.
  const handleRead = async () => {
    setStage('working');
    setError(null);
    setFallbackNote('');

    if (aiUnavailable) {
      if (!text.trim()) {
        setError({ message: "Screenshots and PDFs can only be read by the AI reader, which isn't set up. Copy the email text and paste it here instead." });
        setStage('input');
        return;
      }
      await readWithRules('Read with the built-in rules. Check the highlighted fields before saving.');
      return;
    }

    try {
      await applyResult(await analyzeEmailWithAI({ text, file, inquiries }));
    } catch (err) {
      if (err.code === 'not_configured') aiUnavailable = true;
      if (text.trim()) {
        await readWithRules(err.code === 'not_configured'
          ? 'Read with the built-in rules. Check the highlighted fields before saving.'
          : `The AI reader failed (${err.message}), so the built-in rules were used. Check the fields before saving.`);
        return;
      }
      setError({
        message: err.code === 'not_configured'
          ? "Screenshots and PDFs can only be read by the AI reader, which isn't set up. Copy the email text and paste it here instead."
          : err.message,
        code: err.code,
      });
      setStage('input');
    }
  };

  const audit = (action) => ({ timestamp: new Date().toISOString(), action, by: currentUser?.name || 'CS Desk' });
  const summary = result?.summary || 'Customer email';
  const at = result ? emailTime(result) : new Date().toISOString();

  const finish = () => {
    try { confetti({ particleCount: 50, spread: 55, origin: { y: 0.6 } }); } catch (e) {}
    onClose();
  };

  // ---- Actions ----

  const saveNewInquiry = (mode) => {
    let inq = { ...draft, grossWeightKg: Number(draft.grossWeightKg) || 0, volumeCbm: Number(draft.volumeCbm) || 0 };
    if (mode === 'asked_details') {
      inq = {
        ...inq,
        hasReplied: true,
        repliedAt: new Date().toISOString(),
        auditLog: [...inq.auditLog, audit(`Asked customer for missing details: ${(result?.missingDetails || []).join(', ')}`)],
      };
    }
    onCreateInquiry(inq, { openComposer: mode === 'quote' });
    finish();
  };

  const logCustomerReply = (mode) => {
    if (!match) return;
    const incoming = { ...match, auditLog: [...(match.auditLog || []), audit(`Customer replied: ${summary}`)] };
    if (mode === 'replied') {
      onUpdateInquiry({
        ...incoming,
        hasReplied: true,
        repliedAt: new Date().toISOString(),
        status: match.isQuoted ? 'NEGOTIATING' : match.status,
        auditLog: [...incoming.auditLog, audit('Replied to customer')],
      }, `${match.id}: reply logged`);
      finish();
      return;
    }
    // Our turn again: reminders restart from the time the customer wrote.
    const waiting = { ...incoming, hasReplied: false, status: match.isQuoted ? 'NEGOTIATING' : 'FOLLOWUP_NEEDED', awaitingSince: at };
    onUpdateInquiry(waiting, `${match.id}: customer reply logged, awaiting your response`);
    onClose();
    if (mode === 'revised') onOpenComposer(waiting);
  };

  const reviewNomination = () => {
    if (!match) return;
    const n = result?.nomination || {};
    onClose();
    onOpenConfirm({
      ...match,
      confirmedAt: at,
      nomination: {
        bookingRef: n.bookingRef,
        containerType: n.containerType || match.containerType,
        containerCount: n.containerCount || undefined,
        finalRate: n.finalRate,
        carrier: n.carrier,
        etd: n.etd,
        confirmedBy: n.confirmedBy || result?.email?.fromName,
        remarks: n.remarks,
      },
      auditLog: [...(match.auditLog || []), audit(`Customer confirmed by email: ${summary}`)],
    });
  };

  const closeAsLost = () => {
    if (!match) return;
    onUpdateInquiry({
      ...match,
      status: 'CLOSED_LOST',
      lostReason: LOST_REASONS[lostReason],
      lostNote,
      auditLog: [...(match.auditLog || []), audit(`Customer declined (${LOST_REASONS[lostReason]})${lostNote ? `: ${lostNote}` : ''}`)],
    }, `${match.id} closed as lost`);
    finish();
  };

  // ---- Render helpers ----

  const renderMatchPicker = (statuses) => {
    const options = statuses ? matchOptions.filter(i => statuses.includes(i.status)) : matchOptions;
    return (
      <div className="p-3 rounded-xl bg-[#120f0e] border border-[#342b27] space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] font-extrabold text-[#dcd2cd] uppercase tracking-wider">Belongs to inquiry</span>
          {result && (
            <span className={`text-[12.5px] font-bold ${['tag', 'strong'].includes(result.matchConfidence) && matchId === result.matchedInquiryId ? 'text-emerald-400' : 'text-amber-300'}`}>
              {MATCH_LABEL[result.matchConfidence]}
            </span>
          )}
        </div>
        <select value={matchId} onChange={(e) => setMatchId(e.target.value)} className="scm-select w-full">
          <option value="">Select the inquiry…</option>
          {options.map(i => (
            <option key={i.id} value={i.id}>
              {i.id} · {i.shipperName} · {i.polCode || i.pol} → {i.podCode || i.pod} · {i.containerType}{i.quotedRate ? ` · quoted ${i.quotedRate}` : ''}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderReplyBox = (label = 'Draft reply') => (
    <Field label={label}>
      <textarea value={signedReply} onChange={(e) => setReply(e.target.value)} rows={9} className="scm-input w-full font-mono leading-relaxed" />
      {findPlaceholders(signedReply).length > 0 && (
        <span className="text-[12.5px] text-amber-300 font-bold block mt-1">
          Replace {findPlaceholders(signedReply).join(', ')} with the real details. Copying is blocked until you do.
        </span>
      )}
    </Field>
  );

  const set = (key) => (e) => setDraft(prev => ({ ...prev, [key]: e.target.value }));
  const missing = new Set((result?.missingDetails || []).map(m => m.toLowerCase()));
  const dup = kind === 'new_inquiry' && result?.matchedInquiryId && inquiries.find(i => i.id === result.matchedInquiryId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto" onPaste={stage === 'input' ? handlePaste : undefined}>
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-[#0d0b0a] border border-[#FFA08C]/50 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(255,160,140,0.3)]">

        <div className="flex items-center justify-between px-5 py-3 border-b border-[#342b27] bg-[#110e0d]">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#FFA08C]" />
            <span className="text-[15px] font-extrabold text-white uppercase tracking-wider">Paste Email</span>
            <span className="text-sm text-[#dcd2cd] ml-1">New inquiry, customer reply, nomination or decline: paste any of them</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full bg-[#181412] hover:bg-[rgba(255,160,140,0.2)] text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {stage === 'input' && (
            <>
              {error && (
                <div className="p-3 rounded-xl border border-[#f87171]/60 bg-[rgba(248,113,113,0.1)] text-sm font-bold text-[#fca5a5] flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{error.message}</span>
                </div>
              )}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the email here, including From / Subject lines if you can. A whole thread is fine. You can also paste a screenshot (Ctrl+V) or attach a PDF."
                rows={13}
                className="scm-input w-full font-mono leading-relaxed"
                autoFocus
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <label className="btn-dark cursor-pointer">
                    <Paperclip size={13} />
                    <span>Attach screenshot / PDF</span>
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => attach(e.target.files?.[0])} />
                  </label>
                  {file && (
                    <span className="flex items-center gap-2 text-sm text-white font-semibold min-w-0">
                      {previewUrl ? <img src={previewUrl} alt="" className="h-9 rounded border border-[#3d332e]" /> : <FileText size={16} className="text-[#FFA08C]" />}
                      <span className="truncate max-w-[220px]">{file.name || 'Pasted screenshot'}</span>
                      <button onClick={() => { setFile(null); setPreviewUrl(null); }} className="text-[#b3a59e] hover:text-white"><X size={14} /></button>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value=""
                    onChange={(e) => { const s = sampleEmails.find(x => x.id === e.target.value); if (s) setText(s.rawContent); }}
                    className="scm-select text-sm"
                    title="Load a sample email to try it out"
                  >
                    <option value="">Try a sample…</option>
                    {sampleEmails.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                  <button onClick={handleRead} disabled={!text.trim() && !file} className="btn-coral disabled:opacity-40 disabled:cursor-not-allowed">
                    <Sparkles size={13} />
                    <span>Read email</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </>
          )}

          {stage === 'working' && (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 rounded-full border-2 border-[#FFA08C]/20 border-t-[#FFA08C] animate-spin mx-auto" />
              <div className="text-[15px] font-bold text-white">Reading the email…</div>
              <div className="text-sm text-[#dcd2cd]">Usually takes 5–15 seconds.</div>
            </div>
          )}

          {stage === 'result' && (
            <>
              {fallbackNote && (
                <div className="p-3 rounded-xl border border-amber-400/60 bg-[rgba(251,191,36,0.08)] text-sm font-bold text-amber-300 flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" /> <span>{fallbackNote}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-extrabold text-[#dcd2cd] uppercase tracking-wider">This email is</span>
                  <select value={kind} onChange={(e) => setKind(e.target.value)} disabled={!result} className="scm-select font-extrabold text-[#FFA08C]">
                    {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                {result?.summary && <span className="text-sm text-white font-semibold">{result.summary}</span>}
              </div>

              {kind === 'new_inquiry' && draft && (
                <div className="space-y-3">
                  {dup && (
                    <div className="p-3 rounded-xl border border-amber-400/60 bg-[rgba(251,191,36,0.08)] text-sm text-amber-300 font-bold flex items-center justify-between gap-3">
                      <span>This looks like a duplicate of {dup.id} ({dup.shipperName}, logged {new Date(dup.receivedAt).toLocaleDateString('en-GB')}).</span>
                      <button onClick={() => { setKind('customer_reply'); setMatchId(dup.id); }} className="btn-dark text-sm shrink-0">Treat as reply to {dup.id}</button>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Company / shipper"><input value={draft.shipperName || ''} onChange={set('shipperName')} className="scm-input w-full font-semibold" /></Field>
                    <Field label="Contact person"><input value={draft.contactPerson || ''} onChange={set('contactPerson')} className="scm-input w-full" /></Field>
                    <Field label="Customer email"><input value={draft.contactEmail || ''} onChange={set('contactEmail')} className="scm-input w-full font-mono" /></Field>
                    <Field label="Phone"><input value={draft.contactPhone || ''} onChange={set('contactPhone')} className="scm-input w-full font-mono" /></Field>
                    <Field label="GSTIN"><input value={draft.gstin || ''} onChange={set('gstin')} className="scm-input w-full font-mono" /></Field>
                    <Field label="Incoterms"><input value={draft.incoterms || ''} onChange={set('incoterms')} className="scm-input w-full" /></Field>
                    <Field label="Port of loading" missing={missing.has('origin port') || !draft.pol}><input value={draft.pol || ''} onChange={set('pol')} className="scm-input w-full" /></Field>
                    <Field label="Port of discharge" missing={missing.has('destination port') || !draft.pod}><input value={draft.pod || ''} onChange={set('pod')} className="scm-input w-full" /></Field>
                    <Field label="Container / equipment" missing={missing.has('container type') || !draft.containerType}><input value={draft.containerType || ''} onChange={set('containerType')} className="scm-input w-full" /></Field>
                    <Field label="Commodity" missing={missing.has('commodity') || !draft.commodity}><input value={draft.commodity || ''} onChange={set('commodity')} className="scm-input w-full" /></Field>
                    <Field label="Gross weight (kg)" missing={missing.has('gross weight') || !(Number(draft.grossWeightKg) > 0)}><input type="number" min="0" value={draft.grossWeightKg || ''} onChange={set('grossWeightKg')} className="scm-input w-full font-mono font-bold" /></Field>
                    <Field label="Volume (CBM)"><input type="number" min="0" step="0.01" value={draft.volumeCbm || ''} onChange={set('volumeCbm')} className="scm-input w-full font-mono" /></Field>
                    <Field label="Import / export">
                      <select value={draft.direction || ''} onChange={set('direction')} className="scm-select w-full">
                        <option value="">Not sure</option>
                        <option value="Import">Import</option>
                        <option value="Export">Export</option>
                      </select>
                    </Field>
                    <Field label="Packages"><input value={draft.packages || ''} onChange={set('packages')} className="scm-input w-full" placeholder="e.g. 100 boxes" /></Field>
                    <Field label="HSN code"><input value={draft.hsnCode || ''} onChange={set('hsnCode')} className="scm-input w-full font-mono" /></Field>
                    <Field label="Dimensions"><input value={draft.dimensions || ''} onChange={set('dimensions')} className="scm-input w-full font-mono" placeholder="L x W x H" /></Field>
                    <Field label="Cargo ready"><input value={draft.cargoReadyDate || ''} onChange={set('cargoReadyDate')} className="scm-input w-full" /></Field>
                    <Field label="Pickup address" className="col-span-3"><textarea rows={2} value={draft.pickupAddress || ''} onChange={set('pickupAddress')} className="scm-input w-full" placeholder="Supplier / factory address, for ex-works pickup" /></Field>
                    <Field label="Special requirements" className="col-span-3"><input value={draft.specialRequirements || ''} onChange={set('specialRequirements')} className="scm-input w-full" /></Field>
                  </div>
                  {result?.missingDetails?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-bold text-amber-300">
                        Missing from the email: {result.missingDetails.join(', ')}. Here's a ready request for the customer:
                      </div>
                      {renderReplyBox('Request for details')}
                    </div>
                  )}
                </div>
              )}

              {kind === 'customer_reply' && (
                <div className="space-y-3">
                  {renderMatchPicker()}
                  {result?.customerReply?.points?.length > 0 && (
                    <div className="p-3 rounded-xl bg-[#120f0e] border border-[#342b27]">
                      <div className="text-[12.5px] font-extrabold text-[#dcd2cd] uppercase tracking-wider mb-1">The customer says</div>
                      <ul className="list-disc pl-5 text-sm text-white space-y-0.5">
                        {result.customerReply.points.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                      {result.customerReply.requestedRate && (
                        <div className="text-sm mt-1.5"><b className="text-[#FFA08C]">Asking for:</b> <span className="font-mono font-bold text-white">{result.customerReply.requestedRate}</span></div>
                      )}
                    </div>
                  )}
                  {renderReplyBox()}
                </div>
              )}

              {kind === 'nomination' && (
                <div className="space-y-3">
                  {renderMatchPicker()}
                  <div className="p-3 rounded-xl bg-[rgba(16,185,129,0.08)] border border-emerald-500/40 grid grid-cols-3 gap-2 text-sm">
                    {[
                      ['Booking no.', result?.nomination?.bookingRef],
                      ['Equipment', result?.nomination?.containerType || match?.containerType],
                      ['Final rate', result?.nomination?.finalRate || match?.quotedRate],
                      ['Carrier', result?.nomination?.carrier],
                      ['ETD', result?.nomination?.etd],
                      ['Confirmed by', result?.nomination?.confirmedBy || result?.email?.fromName],
                    ].map(([k, v]) => (
                      <div key={k}><span className="text-[#b3a59e] block text-[12.5px] font-bold">{k}</span><span className="text-white font-semibold">{v || '—'}</span></div>
                    ))}
                  </div>
                  {renderReplyBox('Acknowledgement to the customer')}
                </div>
              )}

              {kind === 'declined' && (
                <div className="space-y-3">
                  {renderMatchPicker()}
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Reason">
                      <select value={lostReason} onChange={(e) => setLostReason(e.target.value)} className="scm-select w-full">
                        {Object.entries(LOST_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </Field>
                    <Field label="Note" className="col-span-2"><input value={lostNote} onChange={(e) => setLostNote(e.target.value)} className="scm-input w-full" /></Field>
                  </div>
                  {renderReplyBox('Courteous reply (optional)')}
                </div>
              )}

              {kind === 'not_freight' && (
                <div className="py-10 text-center space-y-2">
                  <Ban size={24} className="text-[#f87171] mx-auto" />
                  <div className="text-[15px] font-extrabold text-white">This doesn't look like a customer freight email</div>
                  <div className="text-sm text-[#dcd2cd]">Nothing will be logged. If that's wrong, change "This email is" above.</div>
                </div>
              )}
            </>
          )}
        </div>

        {stage === 'result' && (
          <div className="px-5 py-3 border-t border-[#342b27] bg-[#110e0d] flex flex-wrap items-center justify-between gap-2">
            <button onClick={() => setStage('input')} className="btn-dark">
              <RefreshCw size={13} />
              <span>Back</span>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {kind === 'new_inquiry' && draft && (
                result?.missingDetails?.length > 0 ? (
                  <>
                    <CopyButton text={signedReply} label="Copy request" />
                    <button onClick={() => saveNewInquiry('asked_details')} className="btn-coral-outline">Save – I've asked for details</button>
                    <button onClick={() => saveNewInquiry('quote')} className="btn-coral">Save & draft quotation</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => saveNewInquiry('save')} className="btn-coral-outline">Save only</button>
                    <button onClick={() => saveNewInquiry('quote')} className="btn-coral">Save & draft quotation</button>
                  </>
                )
              )}
              {kind === 'customer_reply' && (
                <>
                  <CopyButton text={signedReply} />
                  <button onClick={() => logCustomerReply('later')} disabled={!match} className="btn-dark disabled:opacity-40">Save – reply later</button>
                  <button onClick={() => logCustomerReply('replied')} disabled={!match} className="btn-coral-outline disabled:opacity-40">Save – I've replied</button>
                  <button onClick={() => logCustomerReply('revised')} disabled={!match} className="btn-coral disabled:opacity-40">Revised quotation</button>
                </>
              )}
              {kind === 'nomination' && (
                <>
                  <CopyButton text={signedReply} label="Copy acknowledgement" />
                  <button onClick={reviewNomination} disabled={!match} className="btn-green disabled:opacity-40">
                    <CheckCircle2 size={14} />
                    <span>Review & confirm booking</span>
                  </button>
                </>
              )}
              {kind === 'declined' && (
                <>
                  <CopyButton text={signedReply} />
                  <button onClick={closeAsLost} disabled={!match} className="btn-coral disabled:opacity-40">Close as lost</button>
                </>
              )}
              {kind === 'not_freight' && <button onClick={onClose} className="btn-dark">Close</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
