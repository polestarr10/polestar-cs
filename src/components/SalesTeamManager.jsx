import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, AlertTriangle } from 'lucide-react';

const newId = () => `sm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// The CS's own sales members (they bring the business in; the CS handles the
// inquiry). Saved on the CS's login, like signatures.
export default function SalesTeamManager({ isOpen, onClose, currentUser, onSave }) {
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setList((currentUser?.salesTeam || []).map(m => ({ ...m })));
    setError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const update = (id, key) => (e) => setList(l => l.map(m => (m.id === id ? { ...m, [key]: e.target.value } : m)));

  const save = async () => {
    const clean = list.map(m => ({ id: m.id, name: (m.name || '').trim(), phone: (m.phone || '').trim(), email: (m.email || '').trim() })).filter(m => m.name);
    setBusy(true);
    setError('');
    const err = await onSave(clean);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#0d0b0a] border border-[#FFA08C]/50 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#342b27] bg-[#110e0d]">
          <span className="text-[15px] font-extrabold text-white uppercase tracking-wider">My sales team</span>
          <button onClick={onClose} className="p-1 rounded-full bg-[#181412] text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="text-sm text-[#dcd2cd]">
            The sales members who bring business to you. Pick one on each inquiry; reports then show inquiries, quotes and bookings for each of them.
          </div>
          {error && (
            <div className="p-2.5 rounded-lg text-sm font-bold flex items-center gap-2 border border-[#f87171]/60 bg-[rgba(248,113,113,0.1)] text-[#fca5a5]">
              <AlertTriangle size={15} /> Couldn't save: {error}
            </div>
          )}
          {list.length === 0 && <div className="text-sm text-[#b3a59e]">No sales members yet.</div>}
          {list.map(m => (
            <div key={m.id} className="grid grid-cols-12 gap-2 items-center">
              <input value={m.name} onChange={update(m.id, 'name')} className="scm-input col-span-4 font-bold" placeholder="Name" />
              <input value={m.phone || ''} onChange={update(m.id, 'phone')} className="scm-input col-span-3 font-mono" placeholder="Phone" />
              <input value={m.email || ''} onChange={update(m.id, 'email')} className="scm-input col-span-4 font-mono" placeholder="Email" />
              <button onClick={() => setList(l => l.filter(x => x.id !== m.id))} className="col-span-1 flex justify-center text-[#6f625c] hover:text-[#f87171]" title="Remove">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button onClick={() => setList(l => [...l, { id: newId(), name: '', phone: '', email: '' }])} className="btn-dark"><Plus size={14} /><span>Add sales member</span></button>
          <div className="text-[12.5px] text-[#8a7d77]">Removing someone here doesn't change inquiries already assigned to them.</div>
        </div>
        <div className="px-5 py-3 border-t border-[#342b27] bg-[#110e0d] flex justify-end gap-2">
          <button onClick={onClose} className="btn-dark">Cancel</button>
          <button onClick={save} disabled={busy} className="btn-coral disabled:opacity-50"><Save size={14} /><span>{busy ? 'Saving…' : 'Save'}</span></button>
        </div>
      </div>
    </div>
  );
}
