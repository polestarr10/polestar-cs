import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, AlertTriangle } from 'lucide-react';
import { newAgentId } from '../utils/agentRequest';

// The CS's agents at origin, asked for pickup and origin rates on ex-works
// inquiries. Saved on the CS's login, like the sales team.
export default function AgentsManager({ isOpen, onClose, currentUser, onSave }) {
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setList((currentUser?.agents || []).map(a => ({ ...a })));
    setError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const update = (id, key) => (e) => setList(l => l.map(a => (a.id === id ? { ...a, [key]: e.target.value } : a)));

  const save = async () => {
    const clean = list
      .map(a => ({ id: a.id, name: (a.name || '').trim(), company: (a.company || '').trim(), email: (a.email || '').trim(), location: (a.location || '').trim() }))
      .filter(a => a.name || a.email);
    setBusy(true);
    setError('');
    const err = await onSave(clean);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-surface border border-accent/50 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-line bg-panel">
          <span className="text-[15px] font-extrabold text-ink uppercase tracking-wider">My agents</span>
          <button onClick={onClose} className="p-1 rounded-full bg-raised text-ink-2 hover:text-ink"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="text-sm text-ink-2">
            Agents you ask for pickup and origin rates on ex-works inquiries. Put the ports or cities they cover in "Ports"
            (comma-separated) and they're suggested first for inquiries loading there.
          </div>
          {error && (
            <div className="p-2.5 rounded-lg text-sm font-bold flex items-center gap-2 border border-danger/60 bg-[rgba(248,113,113,0.1)] text-danger-ink-2">
              <AlertTriangle size={15} /> Couldn't save: {error}
            </div>
          )}
          {list.length === 0 && <div className="text-sm text-ink-3">No agents yet.</div>}
          {list.map(a => (
            <div key={a.id} className="grid grid-cols-12 gap-2 items-center">
              <input value={a.name || ''} onChange={update(a.id, 'name')} className="scm-input col-span-3 font-bold" placeholder="Contact name" />
              <input value={a.company || ''} onChange={update(a.id, 'company')} className="scm-input col-span-3" placeholder="Company" />
              <input value={a.email || ''} onChange={update(a.id, 'email')} className="scm-input col-span-3 font-mono" placeholder="Email" />
              <input value={a.location || ''} onChange={update(a.id, 'location')} className="scm-input col-span-2" placeholder="Ports, e.g. Shanghai, Ningbo" />
              <button onClick={() => setList(l => l.filter(x => x.id !== a.id))} className="col-span-1 flex justify-center text-ink-4 hover:text-danger-ink" title="Remove">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button onClick={() => setList(l => [...l, { id: newAgentId(), name: '', company: '', email: '', location: '' }])} className="btn-dark"><Plus size={14} /><span>Add agent</span></button>
        </div>
        <div className="px-5 py-3 border-t border-line bg-panel flex justify-end gap-2">
          <button onClick={onClose} className="btn-dark">Cancel</button>
          <button onClick={save} disabled={busy} className="btn-coral disabled:opacity-50"><Save size={14} /><span>{busy ? 'Saving…' : 'Save'}</span></button>
        </div>
      </div>
    </div>
  );
}
