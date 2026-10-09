import React from 'react';
import { Search, Trash2 } from 'lucide-react';

export default function MetricsBar({ 
  inquiries, 
  searchTerm, 
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  onResetFilters,
  onClearAll
}) {
  const total = inquiries.length;
  const quotedCount = inquiries.filter(i => i.isQuoted || i.status === 'QUOTED_REPLIED' || i.status === 'BOOKING_WON').length;
  const pendingCount = inquiries.filter(i => i.status === 'INQUIRY_RECEIVED' || i.status === 'UNDER_REVIEW').length;

  return (
    <div className="p-2 px-3 rounded-xl bg-[#0d0b0a] border border-[#1c1715] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-[11px] mt-1">
      
      {/* Left: Simple KPI Summary Badges */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#120f0e] border border-[#221b18] text-[11px]">
          <span className="text-[#786b66] font-semibold">TOTAL:</span>
          <span className="text-white font-extrabold font-mono">{total}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#120f0e] border border-[#221b18] text-[11px]">
          <span className="text-[#786b66] font-semibold">QUOTED:</span>
          <span className="text-emerald-400 font-extrabold font-mono">{quotedCount}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#120f0e] border border-[#221b18] text-[11px]">
          <span className="text-[#786b66] font-semibold">PENDING:</span>
          <span className="text-[#FFA08C] font-extrabold font-mono">{pendingCount}</span>
        </div>

        {total > 0 && (
          <button
            onClick={onClearAll}
            className="p-1 rounded-full text-[#786b66] hover:text-rose-400 hover:bg-[#181412] transition-colors ml-1"
            title="Clear all rows"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Right: Search & Status Filter */}
      <div className="flex items-center gap-2">
        
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="scm-select text-[11px] py-1 px-3 font-bold text-[#FFA08C] rounded-full"
        >
          <option value="ALL">All Inquiries ({total})</option>
          <option value="INQUIRY_RECEIVED">Pending CS Action ({pendingCount})</option>
          <option value="QUOTED_REPLIED">Quoted & Replied ({quotedCount})</option>
          <option value="BOOKING_WON">Booking Won</option>
        </select>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#786b66]" />
          <input
            type="text"
            placeholder="Search inquiries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="scm-input pl-7 text-[11px] py-1 w-full rounded-full"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#786b66] hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {(searchTerm || statusFilter !== 'ALL') && (
          <button
            onClick={onResetFilters}
            className="text-[10.5px] text-[#FFA08C] hover:text-white underline font-bold px-1"
          >
            Reset
          </button>
        )}

      </div>

    </div>
  );
}
