import React, { useState } from 'react';
import { 
  Eye, 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  Layers,
  Globe2
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { isExWorks } from '../utils/replyDraft';
import { isAwaitingReply, minutesWaiting, formatWaiting, REMINDER_INTERVAL_MIN } from '../hooks/useReplyReminders';
import { followUpState, quoteExpiry, formatExpiry, MAX_FOLLOW_UPS } from '../utils/followUps';

// Small note under the rate when the customer has gone quiet or the quote is running out.
function QuoteHint({ item, now }) {
  const fu = followUpState(item, now);
  const exp = quoteExpiry(item, now);
  if (fu?.stage === 'due') return <div className="text-[12px] font-bold text-purple-ink">Follow-up {fu.number}/{MAX_FOLLOW_UPS} due</div>;
  if (fu?.stage === 'cold') return <div className="text-[12px] font-bold text-danger-ink">No reply after {MAX_FOLLOW_UPS} follow-ups</div>;
  if (exp) return <div className={`text-[12px] font-bold ${exp.expired ? 'text-danger-ink' : 'text-warn'}`}>Quote {formatExpiry(exp)}</div>;
  return null;
}

export default function InquiryTable({ 
  inquiries, 
  onUpdateStatus, 
  onViewDetails, 
  onQuickQuote, 
  onAskAgent,
  onDeleteInquiry,
  onOpenIntake,
  now = Date.now()
}) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (id, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="scm-table-container shadow-xl mt-2 overflow-hidden rounded-xl border border-line">
      <table className="scm-table">
        <thead>
          <tr>
            <th className="w-10 text-center">#</th>
            <th>INQ REF NO</th>
            <th>DATE</th>
            <th>CUSTOMER</th>
            <th>ROUTE (POL ➔ POD)</th>
            <th>MODE</th>
            <th>QUOTED RATE</th>
            <th>STATUS</th>
            <th className="w-20 text-center">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {inquiries.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-16 px-4 bg-surface/80">
                <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3">
                  <div className="w-11 h-11 rounded-2xl bg-[rgba(255,160,140,0.12)] border border-accent/35 flex items-center justify-center text-accent-ink shadow-[0_0_16px_rgba(255,160,140,0.25)]">
                    <Layers size={20} />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-extrabold text-ink">
                      No Inquiries in Live Sheet
                    </div>
                    <div className="text-[13.5px] text-ink-2">
                      Paste an incoming freight email (text, screenshot or PDF) to start logging.
                    </div>
                  </div>
                  {onOpenIntake && (
                    <button
                      onClick={onOpenIntake}
                      className="btn-coral text-[13.5px] py-1.5 px-5 font-extrabold mt-1 shadow-[0_0_16px_rgba(255,160,140,0.45)]"
                    >
                      + Paste Email
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
                  className="cursor-pointer hover:bg-panel-4 transition-colors"
                >
                  {/* Row index */}
                  <td className="text-center text-ink-3 font-mono text-[12.5px]">
                    {index + 1}
                  </td>

                  {/* Col 1: INQ REF */}
                  <td>
                    <div className="flex items-center gap-1.5 font-mono font-extrabold text-accent-ink">
                      <span className="drop-shadow-[0_0_6px_rgba(255,160,140,0.35)]">{item.id}</span>
                      <button
                        onClick={(e) => handleCopy(item.id, e)}
                        className="text-ink-3 hover:text-accent-ink"
                        title="Copy Ref"
                      >
                        {copiedId === item.id ? <Check size={10} className="text-good" /> : <Copy size={10} />}
                      </button>
                    </div>
                  </td>

                  {/* Col 2: DATE & TIME */}
                  <td>
                    <span className="font-mono text-ink-f5 font-medium">
                      {item.receivedAt ? new Date(item.receivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Today'}
                    </span>
                  </td>

                  {/* Col 3: CUSTOMER (contact, GSTIN, commodity, weight… are in the inquiry details) */}
                  <td>
                    <div className="font-semibold text-ink max-w-[260px] truncate" title={item.shipperName}>
                      {item.shipperName}
                    </div>
                    <div className={`text-[12px] ${item.salesMember ? 'text-ink-3' : 'text-warn/80'}`}>
                      Sales: {item.salesMember || 'not assigned'}
                    </div>
                  </td>

                  {/* Col 4: ROUTE */}
                  <td>
                    <span className="font-mono font-bold text-ink-e5">
                      {item.polCode || item.pol?.split(' ')[0]} ➔ {item.podCode || item.pod?.split(' ')[0]}
                    </span>
                    {item.direction && (
                      <span className={`ml-1.5 text-[11px] font-extrabold px-1.5 py-0.5 rounded ${item.direction === 'Import' ? 'bg-info-tint text-info' : 'bg-good-tint text-good-2'}`}>
                        {item.direction === 'Import' ? 'IMP' : 'EXP'}
                      </span>
                    )}
                  </td>

                  {/* Col 5: MODE */}
                  <td>
                    <span className="font-semibold text-accent-ink">
                      {item.containerType}
                    </span>
                    {/LCL/i.test(item.containerType || '') && Number(item.volumeCbm) > 0 && (
                      <span className="ml-1.5 font-mono text-[12px] text-ink-2">{item.volumeCbm} CBM</span>
                    )}
                  </td>

                  {/* Col 8: QUOTED RATE */}
                  <td>
                    {item.quotedRate ? (
                      <>
                        <span className="font-mono font-bold text-good">
                          {item.quotedRate}
                        </span>
                        <QuoteHint item={item} now={now} />
                      </>
                    ) : isAwaitingReply(item) ? (() => {
                      const waited = minutesWaiting(item, now);
                      const overdue = waited >= REMINDER_INTERVAL_MIN;
                      return (
                        <span className={`text-[12.5px] font-bold ${overdue ? 'text-danger-ink' : 'text-warn'}`}>
                          Not replied · {formatWaiting(waited)}
                        </span>
                      );
                    })() : (
                      <span className="text-ink-3 italic text-[12.5px]">
                        —
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
                        className="p-1.5 rounded-full hover:bg-hover text-ink-2 hover:text-accent-ink"
                        title="View Details"
                      >
                        <Eye size={13} />
                      </button>

                      {/* Quick Quote */}
                      <button
                        onClick={() => onQuickQuote(item)}
                        className="p-1.5 rounded-full hover:bg-hover text-ink-2 hover:text-good"
                        title="Draft & send reply"
                      >
                        <Send size={13} />
                      </button>

                      {/* Ex-works: ask an agent for pickup / origin rates */}
                      {onAskAgent && isExWorks(item) && (
                        <button
                          onClick={() => onAskAgent(item)}
                          className={`p-1.5 rounded-full hover:bg-hover ${(item.agentRequests || []).length ? 'text-info' : 'text-ink-2'} hover:text-info`}
                          title={(item.agentRequests || []).length ? `Ask agent for rates (asked ${item.agentRequests.length}x)` : 'Ask agent for rates (ex-works)'}
                        >
                          <Globe2 size={13} />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => onDeleteInquiry(item.id)}
                        className="p-1.5 rounded-full hover:bg-hover text-ink-3 hover:text-rose"
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
