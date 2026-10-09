import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  FileSpreadsheet, 
  ChevronDown
} from 'lucide-react';

export default function Header({
  onOpenIntake,
  onOpenExport,
  inquiriesCount,
  currentUser,
  setCurrentUser
}) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const users = [
    { name: "Aarti Sharma", role: "Senior CS Executive", avatar: "AS" },
    { name: "Pratham Patel", role: "CS Operations Executive", avatar: "PP" },
    { name: "Vikram Singhania", role: "CS Team Lead", avatar: "VS" },
    { name: "Rajiv Kapoor", role: "VP - Customer Service & Ops", avatar: "RK" }
  ];

  return (
    <header className="bg-[#0d0b0a] border-b border-[#1c1715] px-4 py-2.5 flex items-center justify-between">
      
      {/* Brand Left */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#FFA08C] flex items-center justify-center text-[#0d0b0a] font-extrabold shadow-[0_0_16px_rgba(255,160,140,0.5)]">
          <Sparkles size={16} className="text-[#0d0b0a]" />
        </div>
        
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-wider text-white">
              POLESTAR
            </span>
            <span className="font-extrabold text-sm tracking-wider text-[#FFA08C] drop-shadow-[0_0_10px_rgba(255,160,140,0.45)]">
              SHIPPING
            </span>
          </div>
          <div className="text-[9.5px] text-[#a1928c] font-semibold tracking-wider">
            CS INQUIRY & OPERATIONS DESK
          </div>
        </div>
      </div>

      {/* Action Buttons Right - Clean, Enterprise UI */}
      <div className="flex items-center gap-2.5">
        
        {/* CS User Persona */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#120f0e] border border-[#261e1b] hover:border-[#FFA08C]/50 text-[11px] text-slate-300 font-semibold transition-all"
          >
            <span className="w-4 h-4 rounded-full bg-[#FFA08C] text-[8.5px] font-extrabold text-[#0d0b0a] flex items-center justify-center shadow-[0_0_6px_rgba(255,160,140,0.4)]">
              {currentUser?.avatar || 'AS'}
            </span>
            <span>{currentUser?.name || 'Aarti Sharma'}</span>
            <ChevronDown size={11} className="text-slate-500" />
          </button>

          {userDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)}></div>
              <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-[#120f0e] border border-[#2a221f] shadow-2xl z-50 py-1 overflow-hidden">
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-500 border-b border-[#1c1715]">
                  Switch CS User
                </div>
                {users.map((u, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentUser(u);
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-[rgba(255,160,140,0.12)] text-slate-300 hover:text-[#FFA08C] flex items-center gap-2 transition-colors"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#FFA08C] text-[8px] font-extrabold text-[#0d0b0a] flex items-center justify-center">
                      {u.avatar}
                    </span>
                    <div>
                      <div className="font-semibold">{u.name}</div>
                      <div className="text-[9px] text-slate-500">{u.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 1. Export Excel Button */}
        <button
          onClick={onOpenExport}
          disabled={inquiriesCount === 0}
          className="btn-dark text-[11px] py-1.5 px-3 flex items-center gap-1.5 font-bold disabled:opacity-40 disabled:cursor-not-allowed text-emerald-400 hover:text-emerald-300 border-[#261e1b]"
        >
          <FileSpreadsheet size={13} />
          <span>Export Excel</span>
          {inquiriesCount > 0 && (
            <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/40">
              {inquiriesCount}
            </span>
          )}
        </button>

        {/* 2. Primary Ingest Button */}
        <button
          onClick={onOpenIntake}
          className="btn-coral text-[11px] py-1.5 px-4 flex items-center gap-1.5 font-extrabold shadow-[0_0_16px_rgba(255,160,140,0.45)]"
        >
          <Plus size={13} />
          <span>Ingest Inquiry</span>
        </button>

      </div>

    </header>
  );
}
