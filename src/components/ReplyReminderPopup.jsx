import React, { useState } from 'react';
import { BellRing, X, Send, Bell } from 'lucide-react';
import { minutesWaiting, formatWaiting } from '../hooks/useReplyReminders';

export default function ReplyReminderPopup({ inquiries, now, onReply, onDismiss }) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  if (!inquiries.length) return null;

  const enableDesktopAlerts = async () => {
    try {
      setPermission(await Notification.requestPermission());
    } catch {}
  };

  return (
    <div className="fixed top-20 right-4 z-[60] w-[420px] max-w-[calc(100vw-2rem)] animate-fadeIn">
      <div className="rounded-2xl bg-[#120f0e] border-2 border-[#f87171] shadow-[0_0_28px_rgba(248,113,113,0.35)] overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 py-3 bg-[rgba(248,113,113,0.12)] border-b border-[#f87171]/40">
          <div className="flex items-start gap-2.5">
            <BellRing size={20} className="text-[#f87171] mt-0.5 shrink-0" />
            <div>
              <div className="text-[15px] font-extrabold text-white">
                {inquiries.length === 1 ? '1 inquiry has' : `${inquiries.length} inquiries have`} not been replied to
              </div>
              <div className="text-sm text-[#dcd2cd]">Send the quotation as soon as possible.</div>
            </div>
          </div>
          <button onClick={onDismiss} className="p-1 rounded-full hover:bg-[#261e1b] text-slate-400 hover:text-white" title="Dismiss">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[300px] overflow-y-auto divide-y divide-[#2a231f]">
          {inquiries.map(inq => (
            <div key={inq.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-[#FFA08C] text-sm">{inq.id}</span>
                  <span className="text-[12.5px] font-bold text-[#f87171]">waiting {formatWaiting(minutesWaiting(inq, now))}</span>
                </div>
                <div className="text-sm font-semibold text-white truncate">{inq.shipperName}</div>
                <div className="text-[12.5px] font-mono text-[#dcd2cd]">
                  {inq.polCode || inq.pol} ➔ {inq.podCode || inq.pod} · {inq.containerType}
                </div>
              </div>
              <button onClick={() => onReply(inq)} className="btn-coral shrink-0">
                <Send size={13} />
                <span>Reply</span>
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-[#2a231f] bg-[#0d0b0a]">
          {permission === 'default' ? (
            <button onClick={enableDesktopAlerts} className="btn-dark text-sm">
              <Bell size={13} />
              <span>Enable desktop alerts</span>
            </button>
          ) : <span />}
          <button onClick={onDismiss} className="btn-dark text-sm">
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}
