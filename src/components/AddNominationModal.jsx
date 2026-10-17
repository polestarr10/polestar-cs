import React, { useMemo, useState } from 'react';
import { X, Search, ChevronDown, ChevronRight, CheckCircle2, Mail } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { getNominationCandidates, lastActivity } from '../utils/nominations';

function when(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Lists open inquiries that could still be converted into a nomination, each with its history.
export default function AddNominationModal({ isOpen, onClose, inquiries, onConvert, onPasteEmail }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return getNominationCandidates(inquiries).filter(i => !q ||
      [i.id, i.shipperName, i.contactPerson, i.pol, i.pod, i.polCode, i.podCode, i.containerType, i.commodity]
        .some(v => (v || '').toLowerCase().includes(q)));
  }, [inquiries, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0d0b0a] border border-emerald-500/50 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.2)]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#342b27] bg-[#110e0d]">
          <div>
            <div className="text-[15px] font-extrabold text-white uppercase tracking-wider">Add nomination</div>
            <div className="text-sm text-[#dcd2cd]">Pick the inquiry the customer confirmed. Quoted inquiries are listed first.</div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full bg-[#181412] hover:bg-[rgba(255,160,140,0.2)] text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[#342b27] flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#b3a59e]" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shipper, ref, port, commodity…" className="scm-input scm-input-icon w-full" />
          </div>
          {onPasteEmail && (
            <button onClick={onPasteEmail} className="btn-dark">
              <Mail size={13} />
              <span>Paste the confirmation email instead</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {candidates.length === 0 ? (
            <div className="py-14 text-center text-[#dcd2cd]">
              {search ? 'No open inquiries match your search.' : 'No open inquiries to convert. Every inquiry is already confirmed or closed.'}
            </div>
          ) : candidates.map(inq => {
            const open = expanded === inq.id;
            const last = lastActivity(inq);
            return (
              <div key={inq.id} className="border-b border-[#2a231f]">
                <div className="flex items-center gap-3 px-5 py-3 hover:bg-[#15110f]">
                  <button onClick={() => setExpanded(open ? null : inq.id)} className="text-[#b3a59e] hover:text-white" title="Show history">
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="flex-1 min-w-0 grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-3 min-w-0">
                      <div className="font-mono font-extrabold text-[#FFA08C] text-sm">{inq.id}</div>
                      <div className="font-semibold text-white truncate" title={inq.shipperName}>{inq.shipperName}</div>
                    </div>
                    <div className="col-span-3 min-w-0 text-sm">
                      <div className="font-mono font-bold text-white">{inq.polCode || inq.pol} ➔ {inq.podCode || inq.pod}</div>
                      <div className="text-[#dcd2cd] truncate">{inq.containerType} · {inq.commodity}</div>
                    </div>
                    <div className="col-span-2 text-sm">
                      <div className="font-mono font-bold text-emerald-400">{inq.quotedRate || <span className="text-[#948680] font-sans font-semibold">Not quoted</span>}</div>
                      <div className="text-[#b3a59e]">received {when(inq.receivedAt)}</div>
                    </div>
                    <div className="col-span-4 min-w-0 text-sm">
                      <StatusBadge status={inq.status} allowChange={false} />
                      <div className="text-[#dcd2cd] truncate mt-0.5" title={last.action}>{when(last.at)} · {last.action}</div>
                    </div>
                  </div>
                  <button onClick={() => onConvert(inq)} className="btn-green shrink-0">
                    <CheckCircle2 size={14} />
                    <span>Convert</span>
                  </button>
                </div>
                {open && (
                  <div className="px-14 pb-3">
                    <div className="text-[12.5px] font-extrabold text-[#dcd2cd] uppercase tracking-wider mb-1.5">History</div>
                    <ol className="space-y-1 border-l-2 border-[#3d332e] pl-4">
                      {(inq.auditLog || []).length === 0 && <li className="text-sm text-[#b3a59e]">No activity recorded.</li>}
                      {(inq.auditLog || []).map((e, idx) => (
                        <li key={idx} className="text-sm">
                          <span className="font-mono text-[#b3a59e] mr-2">{when(e.timestamp)}</span>
                          <span className="text-white">{e.action}</span>
                          {e.by && <span className="text-[#948680]"> · {e.by}</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
