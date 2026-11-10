import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import { LCL_DESTINATION_TARIFF, ORIGIN_RATES, DOC_UNITS, destTariffOf, originRatesOf } from '../utils/replyDraft';

// The CS's standard LCL rates: origin charges per port of loading (CFS per W/M
// and documentation), and destination charges. They fill every new LCL quote.
export default function DestTariffManager({ isOpen, onClose, currentUser, onSave, onSaveOrigin }) {
  const [dest, setDest] = useState([]);
  const [origin, setOrigin] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDest(destTariffOf(currentUser).map(([name, value], i) => ({ key: `d${i}`, name, value })));
    setOrigin(originRatesOf(currentUser).map((r, i) => ({ key: `o${i}`, ...r })));
    setError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const updDest = (key, field) => (e) => setDest(r => r.map(x => (x.key === key ? { ...x, [field]: e.target.value } : x)));
  const updOrigin = (key, field) => (e) => setOrigin(r => r.map(x => (x.key === key ? { ...x, [field]: e.target.value } : x)));

  const save = async () => {
    setBusy(true);
    setError('');
    const originRows = origin.map(({ key, ...r }) => ({ ...r, port: (r.port || '').trim(), code: (r.code || '').trim().toUpperCase() })).filter(r => r.port || r.code);
    const err = (onSaveOrigin ? await onSaveOrigin(originRows) : null)
      || await onSave(dest.map(r => [r.name.trim(), r.value.trim()]).filter(([n]) => n));
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  const head = 'text-[12px] font-bold text-[#8a7d77] uppercase';
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0d0b0a] border border-[#FFA08C]/50 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#342b27] bg-[#110e0d]">
          <span className="text-[15px] font-extrabold text-white uppercase tracking-wider">My rates (LCL)</span>
          <button onClick={onClose} className="p-1 rounded-full bg-[#181412] text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-5 overflow-y-auto">
          <div className="text-sm text-[#dcd2cd]">
            These fill the charges on every new LCL quote. You can still change them on a single quote. Saved to your login.
          </div>
          {error && (
            <div className="p-2.5 rounded-lg text-sm font-bold flex items-center gap-2 border border-[#f87171]/60 bg-[rgba(248,113,113,0.1)] text-[#fca5a5]">
              <AlertTriangle size={15} /> Couldn't save: {error}
            </div>
          )}

          {onSaveOrigin && (
            <section className="space-y-2">
              <div className="text-[14px] font-extrabold text-[#FFA08C] uppercase tracking-wider">Origin charges, by port of loading</div>
              <div className="grid grid-cols-12 gap-2">
                <span className={`${head} col-span-3`}>Port</span>
                <span className={`${head} col-span-2`}>Code</span>
                <span className={`${head} col-span-1`}>Cur.</span>
                <span className={`${head} col-span-2`}>CFS / W/M</span>
                <span className={`${head} col-span-1`}>Doc</span>
                <span className={`${head} col-span-2`}>Doc unit</span>
              </div>
              {origin.map(r => (
                <div key={r.key} className="grid grid-cols-12 gap-2 items-center">
                  <input value={r.port || ''} onChange={updOrigin(r.key, 'port')} className="scm-input col-span-3 font-bold" placeholder="e.g. Ningbo" />
                  <input value={r.code || ''} onChange={updOrigin(r.key, 'code')} className="scm-input col-span-2 font-mono" placeholder="CNNGB" />
                  <select value={r.currency || 'USD'} onChange={updOrigin(r.key, 'currency')} className="scm-select col-span-1 !px-1">
                    {['USD', 'INR', 'EUR'].map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input type="number" min="0" value={r.cfs || ''} onChange={updOrigin(r.key, 'cfs')} className="scm-input col-span-2 font-mono" placeholder="17" />
                  <input type="number" min="0" value={r.doc || ''} onChange={updOrigin(r.key, 'doc')} className="scm-input col-span-1 font-mono !px-1.5" placeholder="95" />
                  <input value={r.docUnit || ''} onChange={updOrigin(r.key, 'docUnit')} list="rate-doc-units" className="scm-input col-span-2" placeholder="per BL" />
                  <button onClick={() => setOrigin(x => x.filter(y => y.key !== r.key))} className="col-span-1 flex justify-center text-[#6f625c] hover:text-[#f87171]" title="Remove port"><Trash2 size={15} /></button>
                </div>
              ))}
              <datalist id="rate-doc-units">{DOC_UNITS.map(u => <option key={u} value={u} />)}</datalist>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setOrigin(x => [...x, { key: `o${Date.now()}`, port: '', code: '', currency: 'USD', cfs: '', doc: '', docUnit: 'per BL' }])} className="btn-dark"><Plus size={14} /><span>Add port</span></button>
                <button onClick={() => setOrigin(ORIGIN_RATES.map((r, i) => ({ key: `o${i}`, ...r })))} className="btn-dark"><RotateCcw size={14} /><span>Reset origin rates</span></button>
              </div>
              <div className="text-[12px] text-[#8a7d77]">Ports not listed get empty CFS and documentation lines to fill on the quote.</div>
            </section>
          )}

          <section className="space-y-2">
            <div className="text-[14px] font-extrabold text-[#FFA08C] uppercase tracking-wider">Destination charges</div>
            {dest.map(r => (
              <div key={r.key} className="grid grid-cols-12 gap-2 items-center">
                <input value={r.name} onChange={updDest(r.key, 'name')} className="scm-input col-span-3 font-bold" placeholder="Charge" />
                <input value={r.value} onChange={updDest(r.key, 'value')} className="scm-input col-span-8 font-mono text-[13px]" placeholder="e.g. INR 750/ CBM or Minimum INR 2500/ Shipment" />
                <button onClick={() => setDest(x => x.filter(y => y.key !== r.key))} className="col-span-1 flex justify-center text-[#6f625c] hover:text-[#f87171]" title="Remove"><Trash2 size={15} /></button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setDest(x => [...x, { key: `d${Date.now()}`, name: '', value: '' }])} className="btn-dark"><Plus size={14} /><span>Add line</span></button>
              <button onClick={() => setDest(LCL_DESTINATION_TARIFF.map(([name, value], i) => ({ key: `d${i}`, name, value })))} className="btn-dark"><RotateCcw size={14} /><span>Reset destination rates</span></button>
            </div>
          </section>
        </div>
        <div className="px-5 py-3 border-t border-[#342b27] bg-[#110e0d] flex justify-end gap-2">
          <button onClick={onClose} className="btn-dark">Cancel</button>
          <button onClick={save} disabled={busy} className="btn-coral disabled:opacity-50"><Save size={14} /><span>{busy ? 'Saving…' : 'Save rates'}</span></button>
        </div>
      </div>
    </div>
  );
}
