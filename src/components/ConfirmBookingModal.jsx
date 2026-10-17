import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { parseEquipment } from '../utils/nominations';

function localDateTimeValue(iso) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Field({ label, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[12.5px] font-extrabold text-[#dcd2cd] block mb-1">
        {label}{required && <span className="text-amber-300"> *</span>}
      </span>
      {children}
    </label>
  );
}

// Captures the customer's final confirmation and adds the shipment to the nomination sheet.
export default function ConfirmBookingModal({ isOpen, onClose, inquiry, onConfirm, currentUser }) {
  const [f, setF] = useState(null);

  useEffect(() => {
    if (!inquiry || !isOpen) return;
    const n = inquiry.nomination || {};
    const containerType = n.containerType || inquiry.containerType || '';
    setF({
      confirmedAt: localDateTimeValue(inquiry.confirmedAt),
      bookingRef: n.bookingRef || '',
      confirmedBy: n.confirmedBy || inquiry.contactPerson || '',
      containerType,
      containerCount: n.containerCount || parseEquipment(containerType).count,
      volumeCbm: Number(inquiry.volumeCbm) > 0 ? inquiry.volumeCbm : '',
      finalRate: n.finalRate || inquiry.quotedRate || '',
      carrier: n.carrier || inquiry.preferredCarrier || '',
      etd: n.etd || '',
      remarks: n.remarks || '',
    });
  }, [inquiry, isOpen]);

  if (!isOpen || !inquiry || !f) return null;

  const set = (key) => (e) => setF(prev => ({ ...prev, [key]: e.target.value }));
  const confirmedAt = new Date(f.confirmedAt);
  const valid = !isNaN(confirmedAt) && f.containerType.trim() && f.finalRate.trim() && Number(f.volumeCbm) > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!valid) return;
    const rep = currentUser?.name ? `${currentUser.name} (${currentUser.role || 'CS Desk'})` : inquiry.assignedTo;
    const updated = {
      ...inquiry,
      status: 'BOOKING_WON',
      isQuoted: true,
      hasReplied: true,
      repliedAt: inquiry.repliedAt || confirmedAt.toISOString(),
      confirmedAt: confirmedAt.toISOString(),
      containerType: f.containerType.trim(),
      volumeCbm: Number(f.volumeCbm),
      quotedRate: f.finalRate.trim(),
      preferredCarrier: f.carrier.trim(),
      nomination: {
        bookingRef: f.bookingRef.trim(),
        confirmedBy: f.confirmedBy.trim(),
        containerType: f.containerType.trim(),
        containerCount: Number(f.containerCount) || 0,
        finalRate: f.finalRate.trim(),
        carrier: f.carrier.trim(),
        etd: f.etd,
        remarks: f.remarks.trim(),
        confirmedByRep: rep,
      },
      auditLog: [
        ...(inquiry.auditLog || []),
        {
          timestamp: new Date().toISOString(),
          action: `Booking confirmed by customer${f.bookingRef.trim() ? ` (Booking ${f.bookingRef.trim()})` : ''} – added to nomination sheet`,
          by: currentUser?.name || 'CS Desk',
        },
      ],
    };

    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (err) {}

    onConfirm(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-2xl bg-[#0d0b0a] border border-emerald-500/60 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.25)]"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#342b27] bg-[#110e0d]">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={17} className="text-emerald-400" />
            <span className="text-[15px] font-extrabold text-white uppercase tracking-wider">
              Customer confirmation: <span className="font-mono text-[#FFA08C]">{inquiry.id}</span>
            </span>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-full bg-[#181412] hover:bg-[rgba(255,160,140,0.2)] text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-2.5 bg-[#120f0e] border-b border-[#342b27] text-sm flex items-center justify-between gap-3">
          <span className="font-bold text-white truncate">{inquiry.shipperName}</span>
          <span className="font-mono text-[#FFA08C] font-semibold shrink-0">{inquiry.polCode || inquiry.pol} ➔ {inquiry.podCode || inquiry.pod}</span>
        </div>

        <div className="p-5 grid grid-cols-2 gap-3">
          <Field label="Confirmed on" required>
            <input type="datetime-local" value={f.confirmedAt} onChange={set('confirmedAt')} className="scm-input w-full font-mono" />
          </Field>
          <Field label="Booking / nomination no.">
            <input value={f.bookingRef} onChange={set('bookingRef')} className="scm-input w-full font-mono" placeholder="Carrier booking no." />
          </Field>
          <Field label="Final equipment" required>
            <input value={f.containerType} onChange={set('containerType')} className="scm-input w-full" />
          </Field>
          <Field label="No. of containers">
            <input type="number" min="0" value={f.containerCount} onChange={set('containerCount')} className="scm-input w-full font-mono font-bold" />
          </Field>
          <Field label="Volume (CBM)" required>
            <input type="number" min="0" step="0.01" value={f.volumeCbm} onChange={set('volumeCbm')} className="scm-input w-full font-mono font-bold" placeholder="Counts toward the weekly target" />
          </Field>
          <Field label="Final rate" required>
            <input value={f.finalRate} onChange={set('finalRate')} className="scm-input w-full font-mono font-bold text-emerald-400" />
          </Field>
          <Field label="Carrier">
            <input value={f.carrier} onChange={set('carrier')} className="scm-input w-full" />
          </Field>
          <Field label="Confirmed by (customer)">
            <input value={f.confirmedBy} onChange={set('confirmedBy')} className="scm-input w-full" />
          </Field>
          <Field label="ETD / cargo ready date" className="col-span-2">
            <input type="date" value={f.etd} onChange={set('etd')} className="scm-input w-full font-mono" />
          </Field>
          <Field label="Remarks" className="col-span-2">
            <textarea value={f.remarks} onChange={set('remarks')} rows={2} className="scm-input w-full" placeholder="Vessel, special instructions, etc." />
          </Field>
        </div>

        <div className="px-5 py-3 border-t border-[#342b27] bg-[#110e0d] flex items-center justify-between gap-3">
          <span className="text-sm">
            {valid ? (
              <span className="text-[#dcd2cd]">Saving marks this inquiry Booking Confirmed and adds it to the nomination sheet.</span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-300 font-bold"><AlertTriangle size={15} /> Confirmation date, equipment, volume (CBM) and final rate are required.</span>
            )}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={onClose} className="btn-dark">Cancel</button>
            <button type="submit" disabled={!valid} className="btn-green disabled:opacity-40 disabled:cursor-not-allowed">
              <CheckCircle2 size={14} />
              <span>Confirm booking</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
