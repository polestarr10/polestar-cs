import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  ChevronDown,
  LogOut,
  UserPen
} from 'lucide-react';

export default function Header({
  onOpenIntake,
  currentUser,
  onSignOut,
  onEditProfile
}) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <header className="bg-[#0d0b0a] border-b border-[#342b27] px-4 py-2.5 flex items-center justify-between">
      
      {/* Brand Left */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#FFA08C] flex items-center justify-center text-[#0d0b0a] font-extrabold shadow-[0_0_16px_rgba(255,160,140,0.5)]">
          <Sparkles size={16} className="text-[#0d0b0a]" />
        </div>
        
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-[15px] tracking-wider text-white">
              POLESTAR
            </span>
            <span className="font-extrabold text-[15px] tracking-wider text-[#FFA08C] drop-shadow-[0_0_10px_rgba(255,160,140,0.45)]">
              SHIPPING
            </span>
          </div>
          <div className="text-[12px] text-[#dcd2cd] font-semibold tracking-wider">
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
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#120f0e] border border-[#261e1b] hover:border-[#FFA08C]/50 text-[13.5px] text-slate-300 font-semibold transition-all"
          >
            <span className="w-5 h-5 rounded-full bg-[#FFA08C] text-[11px] font-extrabold text-[#0d0b0a] flex items-center justify-center shadow-[0_0_6px_rgba(255,160,140,0.4)]">
              {currentUser?.avatar}
            </span>
            <span>{currentUser?.name}</span>
            <ChevronDown size={11} className="text-slate-500" />
          </button>

          {userDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)}></div>
              <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-[#120f0e] border border-[#2a221f] shadow-2xl z-50 py-1 overflow-hidden">
                <div className="px-3 py-2 border-b border-[#342b27]">
                  <div className="text-[13.5px] font-bold text-white">{currentUser?.name}</div>
                  {currentUser?.role && <div className="text-[12px] text-slate-400">{currentUser.role}</div>}
                  <div className="text-[12px] text-slate-500 truncate">{currentUser?.email || 'Browser-only mode (no login)'}</div>
                </div>
                <button
                  onClick={() => { setUserDropdownOpen(false); onEditProfile?.(); }}
                  className="w-full text-left px-3 py-2 text-[13.5px] hover:bg-[rgba(255,160,140,0.12)] text-slate-300 hover:text-[#FFA08C] flex items-center gap-2"
                >
                  <UserPen size={14} /> Edit my name & role
                </button>
                {onSignOut && (
                  <button
                    onClick={() => { setUserDropdownOpen(false); onSignOut(); }}
                    className="w-full text-left px-3 py-2 text-[13.5px] hover:bg-[rgba(248,113,113,0.12)] text-slate-300 hover:text-[#f87171] flex items-center gap-2"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Primary Ingest Button */}
        <button
          onClick={onOpenIntake}
          className="btn-coral text-[13.5px] py-1.5 px-4 flex items-center gap-1.5 font-extrabold shadow-[0_0_16px_rgba(255,160,140,0.45)]"
        >
          <Plus size={13} />
          <span>Paste Email</span>
        </button>

      </div>

    </header>
  );
}
