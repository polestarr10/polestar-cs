import React, { useState } from 'react';
import { CalendarCheck, ListChecks, Repeat, Inbox, ClipboardList, Users, FileSpreadsheet, Download, Upload, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const NAV = [
  { key: 'myday', label: 'My Day', icon: CalendarCheck },
  { key: 'plan', label: 'Weekly Plan', icon: ListChecks },
  { key: 'followups', label: 'Follow-ups', icon: Repeat },
  { key: 'inquiries', label: 'Inquiries', icon: Inbox },
  { key: 'nominations', label: 'Nomination Sheet', icon: ClipboardList },
  { key: 'team', label: 'Team', icon: Users, managerOnly: true },
];

const COLLAPSED_KEY = 'polestar_sidebar_collapsed_v1';

function loadCollapsed() {
  try {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    if (saved !== null) return saved === '1';
  } catch {}
  return window.innerWidth < 900;
}

const itemClass = (active, collapsed) =>
  `relative w-full flex items-center gap-2.5 rounded-xl font-extrabold transition-all whitespace-nowrap border ${
    collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
  } ${active ? 'bg-[rgba(255,160,140,0.14)] text-[#FFA08C] border-[#FFA08C]/40' : 'text-[#dcd2cd] border-transparent hover:bg-[#181412] hover:text-white'}`;

// Left navigation that folds down to icons. The choice is remembered on this device.
export default function Sidebar({ view, setView, counts, isManager, inquiriesCount, onExport, onBackup, onRestore }) {
  const [collapsed, setCollapsed] = useState(loadCollapsed);

  const toggle = () => {
    setCollapsed(c => {
      try { localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1'); } catch {}
      return !c;
    });
  };

  const items = NAV.filter(i => !i.managerOnly || isManager);

  return (
    <aside className={`${collapsed ? 'w-[60px]' : 'w-56'} shrink-0 flex flex-col gap-1 p-2 border-r border-[#342b27] bg-[#0d0b0a] overflow-y-auto overflow-x-hidden transition-[width] duration-200`}>
      <button
        onClick={toggle}
        className={`flex items-center gap-2.5 rounded-xl py-2 text-[#b3a59e] hover:text-white hover:bg-[#181412] ${collapsed ? 'justify-center' : 'px-3'}`}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        {!collapsed && <span className="text-[12.5px] font-bold">Collapse</span>}
      </button>

      {items.map(item => {
        const Icon = item.icon;
        const active = view === item.key;
        const count = counts[item.key];
        return (
          <button key={item.key} onClick={() => setView(item.key)} className={`${itemClass(active, collapsed)} text-[14.5px]`} title={collapsed ? `${item.label}${count !== undefined ? ` (${count})` : ''}` : undefined}>
            <Icon size={17} className="shrink-0" />
            {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
            {count !== undefined && (collapsed ? (
              count > 0 && <span className={`absolute top-1 right-1 min-w-[17px] h-[17px] px-1 rounded-full text-[10.5px] font-extrabold flex items-center justify-center ${active ? 'bg-[#FFA08C] text-[#0d0b0a]' : 'bg-[#2a221f] text-[#dcd2cd]'}`}>{count}</span>
            ) : (
              <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-[#FFA08C] text-[#0d0b0a]' : 'bg-[#181412] text-[#dcd2cd]'}`}>{count}</span>
            ))}
          </button>
        );
      })}

      <div className="mt-auto pt-3 border-t border-[#342b27] space-y-1">
        <button onClick={onExport} disabled={inquiriesCount === 0} className={`${itemClass(false, collapsed)} text-[13.5px] !text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed`} title={collapsed ? 'Export Excel' : undefined}>
          <FileSpreadsheet size={16} className="shrink-0" />{!collapsed && <span>Export Excel</span>}
        </button>
        <button onClick={onBackup} className={`${itemClass(false, collapsed)} text-[13.5px]`} title={collapsed ? 'Back up data' : undefined}>
          <Download size={16} className="shrink-0" />{!collapsed && <span>Back up data</span>}
        </button>
        <label className={`${itemClass(false, collapsed)} text-[13.5px] cursor-pointer`} title={collapsed ? 'Restore backup' : undefined}>
          <Upload size={16} className="shrink-0" />{!collapsed && <span>Restore backup</span>}
          <input type="file" accept="application/json,.json" className="hidden" onChange={onRestore} />
        </label>
      </div>
    </aside>
  );
}
