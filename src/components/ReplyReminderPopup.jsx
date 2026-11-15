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
      <div className="rounded-2xl bg-panel border-2 border-danger shadow-[0_0_28px_rgba(248,113,113,0.35)] overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 py-3 bg-[rgba(248,113,113,0.12)] border-b border-danger/40">
          <div className="flex items-start gap-2.5">
            <BellRing size={20} className="text-danger-ink mt-0.5 shrink-0" />
            <div>
              <div className="text-[15px] font-extrabold text-ink">
                {inquiries.length === 1 ? '1 inquiry has' : `${inquiries.length} inquiries have`} not been replied to
              </div>
              <div className="text-sm text-ink-2">Send the quotation as soon as possible.</div>
            </div>
          </div>
          <button onClick={onDismiss} className="p-1 rounded-full hover:bg-hover text-ink-2 hover:text-ink" title="Dismiss">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[300px] overflow-y-auto divide-y divide-line-soft">
          {inquiries.map(inq => (
            <div key={inq.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-accent-ink text-sm">{inq.id}</span>
                  <span className="text-[12.5px] font-bold text-danger-ink">waiting {formatWaiting(minutesWaiting(inq, now))}</span>
                </div>
                <div className="text-sm font-semibold text-ink truncate">{inq.shipperName}</div>
                <div className="text-[12.5px] font-mono text-ink-2">
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

        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-line-soft bg-surface">
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
