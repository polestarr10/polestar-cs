import React, { useState } from 'react';
import { useTheme } from '../utils/theme';
import { 
  Sparkles, 
  Plus, 
  ChevronDown,
  LogOut,
  UserPen,
  PenLine,
  Users,
  ReceiptText,
  Globe2,
  Sun,
  Moon
} from 'lucide-react';

export default function Header({
  onOpenIntake,
  currentUser,
  onSignOut,
  onEditProfile,
  onManageSignatures,
  onManageSalesTeam,
  onManageAgents,
  onManageTariff
}) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [theme, toggleTheme] = useTheme();

  return (
    <header className="bg-surface border-b border-line px-4 py-2.5 flex items-center justify-between">
      
      {/* Brand Left */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-on-accent font-extrabold shadow-[0_0_16px_rgba(255,160,140,0.5)]">
          <Sparkles size={16} className="text-on-accent" />
        </div>
        
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-[15px] tracking-wider text-ink">
              POLESTAR
            </span>
            <span className="font-extrabold text-[15px] tracking-wider text-accent-ink drop-shadow-[0_0_10px_rgba(255,160,140,0.45)]">
              SHIPPING
            </span>
          </div>
          <div className="text-[12px] text-ink-2 font-semibold tracking-wider">
            CS INQUIRY & OPERATIONS DESK
          </div>
        </div>
      </div>

      {/* Action Buttons Right - Clean, Enterprise UI */}
      <div className="flex items-center gap-2.5">

        {/* Day / night mode */}
        <button
          onClick={toggleTheme}
          className="btn-dark !px-3 !py-1.5 text-[13px]"
          title={theme === 'light' ? 'Switch to night mode (dark)' : 'Switch to day mode (white)'}
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          <span>{theme === 'light' ? 'Night mode' : 'Day mode'}</span>
        </button>

        {/* CS User Persona */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-panel border border-line-soft-3 hover:border-accent/50 text-[13.5px] text-ink-soft font-semibold transition-all"
          >
            <span className="w-5 h-5 rounded-full bg-accent text-[11px] font-extrabold text-on-accent flex items-center justify-center shadow-[0_0_6px_rgba(255,160,140,0.4)]">
              {currentUser?.avatar}
            </span>
            <span>{currentUser?.name}</span>
            <ChevronDown size={11} className="text-ink-3" />
          </button>

          {userDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)}></div>
              <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-panel border border-line-4 shadow-2xl z-50 py-1 overflow-hidden">
                <div className="px-3 py-2 border-b border-line">
                  <div className="text-[13.5px] font-bold text-ink">{currentUser?.name}</div>
                  {currentUser?.role && <div className="text-[12px] text-ink-2">{currentUser.role}</div>}
                  <div className="text-[12px] text-ink-3 truncate">{currentUser?.email || 'Browser-only mode (no login)'}</div>
                </div>
                <button
                  onClick={() => { setUserDropdownOpen(false); onEditProfile?.(); }}
                  className="w-full text-left px-3 py-2 text-[13.5px] hover:bg-[rgba(255,160,140,0.12)] text-ink-soft hover:text-accent-ink flex items-center gap-2"
                >
                  <UserPen size={14} /> Edit my name & role
                </button>
                {onManageSignatures && (
                  <button
                    onClick={() => { setUserDropdownOpen(false); onManageSignatures(); }}
                    className="w-full text-left px-3 py-2 text-[13.5px] hover:bg-[rgba(255,160,140,0.12)] text-ink-soft hover:text-accent-ink flex items-center gap-2"
                  >
                    <PenLine size={14} /> Email signatures
                  </button>
                )}
                {onManageSalesTeam && (
                  <button
                    onClick={() => { setUserDropdownOpen(false); onManageSalesTeam(); }}
                    className="w-full text-left px-3 py-2 text-[13.5px] hover:bg-[rgba(255,160,140,0.12)] text-ink-soft hover:text-accent-ink flex items-center gap-2"
                  >
                    <Users size={14} /> My sales team
                  </button>
                )}
                {onManageAgents && (
                  <button
                    onClick={() => { setUserDropdownOpen(false); onManageAgents(); }}
                    className="w-full text-left px-3 py-2 text-[13.5px] hover:bg-[rgba(255,160,140,0.12)] text-ink-soft hover:text-accent-ink flex items-center gap-2"
                  >
                    <Globe2 size={14} /> My agents
                  </button>
                )}
                {onManageTariff && (
                  <button
                    onClick={() => { setUserDropdownOpen(false); onManageTariff(); }}
                    className="w-full text-left px-3 py-2 text-[13.5px] hover:bg-[rgba(255,160,140,0.12)] text-ink-soft hover:text-accent-ink flex items-center gap-2"
                  >
                    <ReceiptText size={14} /> My rates
                  </button>
                )}
                {onSignOut && (
                  <button
                    onClick={() => { setUserDropdownOpen(false); onSignOut(); }}
                    className="w-full text-left px-3 py-2 text-[13.5px] hover:bg-[rgba(248,113,113,0.12)] text-ink-soft hover:text-danger-ink flex items-center gap-2"
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
