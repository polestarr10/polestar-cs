import React, { useState, useEffect } from 'react';
import { X, Send, DollarSign, Calendar, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function QuickQuoteModal({ isOpen, onClose, inquiry, onSaveQuote, currentUser }) {
  const [rateAmount, setRateAmount] = useState('1450');
  const [currency, setCurrency] = useState('USD');
  const [rateUnit, setRateUnit] = useState("/ 40'HC");
  const [freeDays, setFreeDays] = useState('14 Days Combined Demurrage/Detention');
  const [carrier, setCarrier] = useState('Maersk Line / MSC');
  const [validity, setValidity] = useState('2026-10-31');

  useEffect(() => {
    if (inquiry) {
      if (inquiry.containerType?.includes('20')) {
        setRateAmount('850');
        setRateUnit("/ 20'GP");
      } else if (inquiry.containerType?.includes('LCL') || inquiry.routingMode?.includes('LCL')) {
        setRateAmount('55');
        setRateUnit('/ CBM');
      } else if (inquiry.containerType?.includes('Reefer')) {
        setRateAmount('2400');
        setRateUnit("/ 40' Reefer");
      } else {
        setRateAmount('1450');
        setRateUnit("/ 40'HC");
      }
    }
  }, [inquiry]);

  if (!isOpen || !inquiry) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const formattedRate = `${currency === 'USD' ? '$' : (currency === 'EUR' ? '€' : '₹')}${parseFloat(rateAmount || 0).toLocaleString()} ${rateUnit}`;
    const quotedAmountNum = parseFloat(rateAmount || 0);

    const updatedInquiry = {
      ...inquiry,
      isQuoted: true,
      hasReplied: true,
      status: "QUOTED_REPLIED",
      quotedRate: formattedRate,
      quotedCurrency: currency,
      quotedAmountTotal: quotedAmountNum,
      quoteValidity: validity,
      freeDaysAtPod: freeDays,
      preferredCarrier: carrier,
      repliedAt: new Date().toISOString(),
      responseTatMinutes: Math.floor(Math.random() * 15) + 10,
      assignedTo: currentUser?.name ? `${currentUser.name} (${currentUser.role || 'CS Desk'})` : inquiry.assignedTo,
      conversationGist: `Polestar CS quoted ${formattedRate} on ${carrier} with ${freeDays}.`,
      auditLog: [
        ...(inquiry.auditLog || []),
        {
          timestamp: new Date().toISOString(),
          action: `Quotation sent (${formattedRate})`,
          by: currentUser?.name || "Aarti Sharma"
        }
      ]
    };

    try {
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    } catch (err) {}

    onSaveQuote(updatedInquiry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#0d0b0a] border border-[#FFA08C]/50 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(255,160,140,0.3)]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c1715] bg-[#110e0d]">
          <div className="flex items-center gap-2">
            <Send size={14} className="text-[#FFA08C]" />
            <span className="text-xs font-extrabold text-white uppercase tracking-wider">
              Send Rate Quote: <span className="font-mono text-[#FFA08C] font-bold">{inquiry.id}</span>
            </span>
          </div>

          <button 
            onClick={onClose}
            className="p-1 rounded-full bg-[#181412] hover:bg-[rgba(255,160,140,0.2)] text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Inquiry Info */}
        <div className="px-4 py-2 bg-[#120f0e] border-b border-[#1c1715] text-[11px] flex items-center justify-between">
          <span className="font-bold text-white truncate max-w-[200px]">{inquiry.shipperName}</span>
          <span className="font-mono text-[#FFA08C] font-semibold">{inquiry.polCode} ➔ {inquiry.podCode}</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          <div>
            <label className="text-[10px] font-extrabold text-[#a1928c] block mb-1">Ocean Freight Rate:</label>
            <div className="grid grid-cols-12 gap-1.5">
              <div className="col-span-3">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="scm-select text-xs w-full font-extrabold text-[#FFA08C]"
                >
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div className="col-span-5">
                <input
                  type="number"
                  value={rateAmount}
                  onChange={(e) => setRateAmount(e.target.value)}
                  required
                  className="scm-input text-xs w-full font-mono font-bold text-emerald-400"
                />
              </div>
              <div className="col-span-4">
                <input
                  type="text"
                  value={rateUnit}
                  onChange={(e) => setRateUnit(e.target.value)}
                  className="scm-input text-xs w-full"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-extrabold text-[#a1928c] block mb-1">Destination Free Days:</label>
              <input
                type="text"
                value={freeDays}
                onChange={(e) => setFreeDays(e.target.value)}
                className="scm-input text-xs w-full"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-[#a1928c] block mb-1">Preferred Carrier:</label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="scm-input text-xs w-full"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-[#a1928c] block mb-1">Validity Date:</label>
            <input
              type="date"
              value={validity}
              onChange={(e) => setValidity(e.target.value)}
              className="scm-input text-xs w-full font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1c1715]">
            <button
              type="button"
              onClick={onClose}
              className="btn-dark text-[11px] py-1 px-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-coral text-[11px] py-1.5 px-4 font-extrabold"
            >
              <Send size={12} />
              <span>Send & Mark Quoted</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
