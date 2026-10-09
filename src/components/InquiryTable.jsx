import React, { useState } from 'react';
import { 
  Eye, 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  Layers
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function InquiryTable({ 
  inquiries, 
  onUpdateStatus, 
  onViewDetails, 
  onQuickQuote, 
  onDeleteInquiry,
  onOpenIntake
}) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (id, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="scm-table-container shadow-xl mt-2 overflow-hidden rounded-xl border border-[#1c1715]">
      <table className="scm-table">
        <thead>
          <tr>
            <th className="w-10 text-center">#</th>
            <th>INQ REF NO</th>
            <th>DATE</th>
            <th>SHIPPER & GSTIN</th>
            <th>ROUTE (POL ➔ POD)</th>
            <th>CONTAINER / MODE</th>
            <th>COMMODITY</th>
            <th>GROSS WT</th>
            <th>QUOTED RATE</th>
            <th>STATUS</th>
            <th className="w-20 text-center">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {inquiries.length === 0 ? (
            <tr>
              <td colSpan={11} className="text-center py-16 px-4 bg-[#0d0b0a]/80">
                <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3">
                  <div className="w-11 h-11 rounded-2xl bg-[rgba(255,160,140,0.12)] border border-[#FFA08C]/35 flex items-center justify-center text-[#FFA08C] shadow-[0_0_16px_rgba(255,160,140,0.25)]">
                    <Layers size={20} />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-extrabold text-white">
                      No Inquiries in Live Sheet
                    </div>
                    <div className="text-[11px] text-[#a1928c]">
                      Paste an incoming freight inquiry email or screenshot to start logging.
                    </div>
                  </div>
                  {onOpenIntake && (
                    <button
                      onClick={onOpenIntake}
                      className="btn-coral text-[11px] py-1.5 px-5 font-extrabold mt-1 shadow-[0_0_16px_rgba(255,160,140,0.45)]"
                    >
                      + Ingest Inquiry
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            inquiries.map((item, index) => {
              return (
                <tr 
                  key={item.id}
                  onClick={() => onViewDetails(item)}
                  className="cursor-pointer hover:bg-[#181311] transition-colors"
                >
                  {/* Row index */}
                  <td className="text-center text-[#786b66] font-mono text-[10px]">
                    {index + 1}
                  </td>

                  {/* Col 1: INQ REF */}
                  <td>
                    <div className="flex items-center gap-1.5 font-mono font-extrabold text-[#FFA08C]">
                      <span className="drop-shadow-[0_0_6px_rgba(255,160,140,0.35)]">{item.id}</span>
                      <button
                        onClick={(e) => handleCopy(item.id, e)}
                        className="text-[#786b66] hover:text-[#FFA08C]"
                        title="Copy Ref"
                      >
                        {copiedId === item.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                      </button>
                    </div>
                  </td>

                  {/* Col 2: DATE & TIME */}
                  <td>
                    <span className="font-mono text-slate-200 font-medium">
                      {item.receivedAt ? new Date(item.receivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Today'}
                    </span>
                  </td>

                  {/* Col 3: SHIPPER & GSTIN */}
                  <td>
                    <div className="font-semibold text-white max-w-[200px] truncate" title={item.shipperName}>
                      {item.shipperName}
                    </div>
                    <div className="font-mono text-[9.5px] text-[#a1928c]">
                      {item.gstin || 'N/A'}
                    </div>
                  </td>

                  {/* Col 4: ROUTE */}
                  <td>
                    <span className="font-mono font-bold text-[#e5e5e5]">
                      {item.polCode || item.pol?.split(' ')[0]} ➔ {item.podCode || item.pod?.split(' ')[0]}
                    </span>
                  </td>

                  {/* Col 5: CONTAINER */}
                  <td>
                    <span className="font-semibold text-[#FFA08C]">
                      {item.containerType}
                    </span>
                  </td>

                  {/* Col 6: COMMODITY */}
                  <td>
                    <div className="text-[#d4d4d4] max-w-[150px] truncate" title={item.commodity}>
                      {item.commodity}
                    </div>
                  </td>

                  {/* Col 7: GROSS WT */}
                  <td>
                    <span className="font-mono font-bold text-white">
                      {item.grossWeightKg ? `${item.grossWeightKg.toLocaleString()} kg` : '—'}
                    </span>
                  </td>

                  {/* Col 8: QUOTED RATE */}
                  <td>
                    {item.quotedRate ? (
                      <span className="font-mono font-bold text-emerald-400">
                        {item.quotedRate}
                      </span>
                    ) : (
                      <span className="text-[#786b66] italic text-[10px]">
                        Pending
                      </span>
                    )}
                  </td>

                  {/* Col 9: STATUS */}
                  <td onClick={(e) => e.stopPropagation()}>
                    <StatusBadge
                      status={item.status}
                      onChange={(newStatus) => onUpdateStatus(item.id, newStatus)}
                      size="sm"
                    />
                  </td>

                  {/* Col 10: ACTIONS */}
                  <td className="text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {/* View Details */}
                      <button
                        onClick={() => onViewDetails(item)}
                        className="p-1.5 rounded-full hover:bg-[#261e1b] text-slate-400 hover:text-[#FFA08C]"
                        title="View Details"
                      >
                        <Eye size={13} />
                      </button>

                      {/* Quick Quote */}
                      <button
                        onClick={() => onQuickQuote(item)}
                        className="p-1.5 rounded-full hover:bg-[#261e1b] text-slate-400 hover:text-emerald-400"
                        title="Send Quote"
                      >
                        <Send size={13} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => onDeleteInquiry(item.id)}
                        className="p-1.5 rounded-full hover:bg-[#261e1b] text-slate-500 hover:text-rose-400"
                        title="Delete Row"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>

                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
