import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Star, Save, AlertTriangle } from 'lucide-react';
import { signatureList, standardSignatureText, newSignatureId } from '../utils/signatures';

// Add, edit and delete the rep's email signatures, and choose the default one.
export default function SignatureManager({ isOpen, onClose, currentUser, onSave }) {
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setList(signatureList(currentUser).map(s => ({ ...s, auto: false })));
    setError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const update = (id, patch) => setList(l => l.map(s => (s.id === id ? { ...s, ...patch } : s)));
  const setDefault = (id) => setList(l => l.map(s => ({ ...s, isDefault: s.id === id })));
  const remove = (id) => setList(l => {
    const next = l.filter(s => s.id !== id);
    if (next.length && !next.some(s => s.isDefault)) next[0] = { ...next[0], isDefault: true };
    return next;
  });
  const add = () => setList(l => [...l, { id: newSignatureId(), name: `Signature ${l.length + 1}`, text: standardSignatureText(currentUser), isDefault: l.length === 0 }]);

  const save = async () => {
    const clean = list.map(s => ({ id: s.id, name: s.name.trim() || 'Signature', text: s.text.trim(), isDefault: Boolean(s.isDefault) })).filter(s => s.text);
    if (clean.length && !clean.some(s => s.isDefault)) clean[0].isDefault = true;
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
        <div className="flex items-center justify-between px-5 py-3 border-b border-line bg-panel-2">
          <span className="text-[15px] font-extrabold text-ink uppercase tracking-wider">My email signatures</span>
          <button onClick={onClose} className="p-1 rounded-full bg-raised text-ink-2 hover:text-ink"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="text-sm text-ink-2">
            Save as many as you like, then pick one in each reply. The <b className="text-ink">default</b> is used for follow-ups and suggested replies. They're saved to your login, so they work on any computer.
          </div>
          {error && (
            <div className="p-2.5 rounded-lg text-sm font-bold flex items-center gap-2 border border-danger/60 bg-[rgba(248,113,113,0.1)] text-danger-ink-2">
              <AlertTriangle size={15} /> Couldn't save: {error}
            </div>
          )}
          {list.length === 0 && <div className="text-sm text-ink-3">No signatures. Replies will use your name, role and the company name.</div>}
          {list.map(s => (
            <div key={s.id} className={`rounded-xl border p-3 space-y-2 ${s.isDefault ? 'border-accent/60' : 'border-line'}`}>
              <div className="flex items-center gap-2">
                <input value={s.name} onChange={(e) => update(s.id, { name: e.target.value })} className="scm-input flex-1 font-bold" placeholder="Name, e.g. Formal / Short / Imports desk" />
                <button onClick={() => setDefault(s.id)} className={`btn-dark text-[13px] ${s.isDefault ? '!text-accent-ink' : ''}`} title="Use this one unless I pick another">
                  <Star size={13} className={s.isDefault ? 'fill-[#FFA08C]' : ''} /><span>{s.isDefault ? 'Default' : 'Make default'}</span>
                </button>
                <button onClick={() => remove(s.id)} className="btn-dark text-[13px] text-danger-ink" title="Delete"><Trash2 size={13} /></button>
              </div>
              <textarea value={s.text} onChange={(e) => update(s.id, { text: e.target.value })} rows={5} className="scm-input w-full font-mono text-[13px] leading-relaxed"
                placeholder={'Name\nDesignation\nPolestar Consolidators & Freight Forwarders Pvt Ltd\nMob: +91 …  |  Email: …'} />
            </div>
          ))}
          <button onClick={add} className="btn-dark"><Plus size={14} /><span>Add signature</span></button>
        </div>

        <div className="px-5 py-3 border-t border-line bg-panel-2 flex justify-end gap-2">
          <button onClick={onClose} className="btn-dark">Cancel</button>
          <button onClick={save} disabled={busy} className="btn-coral disabled:opacity-50"><Save size={14} /><span>{busy ? 'Saving…' : 'Save signatures'}</span></button>
        </div>
      </div>
    </div>
  );
}
