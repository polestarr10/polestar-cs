import React from 'react';
import { 
  PlusCircle, 
  MapPin, 
  Building2, 
  Package, 
  Send, 
  Eye, 
  Clock, 
  Check, 
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { STATUS_CONFIG } from './StatusBadge';

export default function InquiryKanban({ inquiries, onUpdateStatus, onViewDetails, onQuickQuote, onOpenIntake }) {
  
  const columns = [
    { key: "INQUIRY_RECEIVED", config: STATUS_CONFIG.INQUIRY_RECEIVED, borderClass: "border-amber-500/30", headerBg: "bg-amber-500/10 text-amber-300" },
    { key: "UNDER_REVIEW", config: STATUS_CONFIG.UNDER_REVIEW, borderClass: "border-sky-500/30", headerBg: "bg-sky-500/10 text-sky-300" },
    { key: "QUOTED_REPLIED", config: STATUS_CONFIG.QUOTED_REPLIED, borderClass: "border-emerald-500/30", headerBg: "bg-emerald-500/10 text-emerald-300" },
    { key: "FOLLOWUP_NEEDED", config: STATUS_CONFIG.FOLLOWUP_NEEDED, borderClass: "border-purple-500/30", headerBg: "bg-purple-500/10 text-purple-300" },
    { key: "BOOKING_WON", config: STATUS_CONFIG.BOOKING_WON, borderClass: "border-teal-500/30", headerBg: "bg-teal-500/10 text-teal-300" },
    { key: "CLOSED_LOST", config: STATUS_CONFIG.CLOSED_LOST, borderClass: "border-rose-500/30", headerBg: "bg-rose-500/10 text-rose-300" }
  ];

  const getInquiriesByStatus = (statusKey) => {
    return inquiries.filter(item => item.status === statusKey);
  };

  // Next status transition helper
  const getNextStatus = (current) => {
    switch (current) {
      case 'INQUIRY_RECEIVED': return 'QUOTED_REPLIED';
      case 'UNDER_REVIEW': return 'QUOTED_REPLIED';
      case 'QUOTED_REPLIED': return 'FOLLOWUP_NEEDED';
      case 'FOLLOWUP_NEEDED': return 'BOOKING_WON';
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Sparkles size={14} className="text-cyan-400" />
          <span>Polestar CS Interactive Pipeline & Operations Workflow</span>
        </div>
        <button
          onClick={onOpenIntake}
          className="btn-primary text-xs py-1.5 px-3"
        >
          <PlusCircle size={14} />
          <span>+ Add Inquiry</span>
        </button>
      </div>

      {/* Horizontal Kanban Columns Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
        {columns.map((col) => {
          const colInquiries = getInquiriesByStatus(col.key);
          const ColIcon = col.config.icon;

          return (
            <div 
              key={col.key}
              className={`rounded-xl bg-slate-900/70 border ${col.borderClass} p-3 flex flex-col min-h-[450px] shadow-lg`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold ${col.headerBg}`}>
                  <ColIcon size={13} />
                  <span>{col.config.shortLabel}</span>
                </div>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {colInquiries.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-0.5 max-h-[600px]">
                {colInquiries.length === 0 ? (
                  <div className="text-center py-10 px-2 rounded-lg border border-dashed border-slate-800 text-slate-600 text-xs">
                    No inquiries in this stage
                  </div>
                ) : (
                  colInquiries.map((item) => {
                    const nextStatus = getNextStatus(item.status);

                    return (
                      <div
                        key={item.id}
                        onClick={() => onViewDetails(item)}
                        className="rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 p-3 transition-all cursor-pointer shadow-md group relative"
                      >
                        {/* Card Header: Ref & Time */}
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <span className="font-mono font-bold text-cyan-300">{item.id}</span>
                          <span className="text-slate-500 font-mono">
                            {item.receivedAt ? new Date(item.receivedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        {/* Shipper Name */}
                        <div className="font-bold text-xs text-white line-clamp-1 mb-1" title={item.shipperName}>
                          {item.shipperName}
                        </div>

                        {/* Route: POL -> POD */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-300 font-semibold mb-1.5">
                          <span className="text-blue-300">{item.polCode || item.pol?.split(' ')[0]}</span>
                          <span className="text-slate-500">➔</span>
                          <span className="text-cyan-300">{item.podCode || item.pod?.split(' ')[0]}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-400 text-[10px]">{item.routingMode}</span>
                        </div>

                        {/* Cargo & Specs */}
                        <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80 text-[10px] space-y-0.5 mb-2">
                          <div className="font-bold text-cyan-200 truncate">{item.containerType}</div>
                          <div className="text-slate-400 truncate">{item.commodity}</div>
                        </div>

                        {/* Rate / Status Badge */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                          {item.quotedRate ? (
                            <span className="font-bold font-mono text-emerald-400 text-xs">
                              {item.quotedRate}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-400 italic font-medium">
                              Rate Pending
                            </span>
                          )}

                          <div className="text-[10px] text-slate-400">
                            {item.assignedTo ? item.assignedTo.split(' ')[0] : 'CS'}
                          </div>
                        </div>

                        {/* Quick Action Button on Hover */}
                        <div 
                          className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-1 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => onQuickQuote && onQuickQuote(item)}
                            className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            <Send size={10} /> Quote
                          </button>

                          {nextStatus && (
                            <button
                              onClick={() => onUpdateStatus(item.id, nextStatus)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 transition-all flex items-center gap-0.5"
                              title={`Advance to ${STATUS_CONFIG[nextStatus]?.label}`}
                            >
                              <span>Next</span>
                              <ArrowRight size={10} />
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
