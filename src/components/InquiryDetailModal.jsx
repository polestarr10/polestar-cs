import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  Package, 
  Send, 
  Clock, 
  Check, 
  Copy, 
  FileText, 
  Save,
  CheckCircle2
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { initialDraftFields, buildReplySubject, buildReplyBody, getMissingFields } from '../utils/replyDraft';

export default function InquiryDetailModal({ 
  isOpen, 
  onClose, 
  inquiry, 
  onUpdateStatus, 
  onSaveUpdates,
  onOpenReply
}) {
  const [activeTab, setActiveTab] = useState('edit');
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (inquiry) {
      setFormData({ ...inquiry });
    }
  }, [inquiry]);

  if (!isOpen || !inquiry || !formData) return null;

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (onSaveUpdates) {
      onSaveUpdates(formData);
    }
    onClose();
  };

  const draftFields = initialDraftFields(formData);
  const quoteEmailBody = `Subject: ${buildReplySubject(formData, draftFields)}

${buildReplyBody(formData, draftFields)}`;

  // A quotation with blanks (no rate, no customer email…) must not be copied.
  const quoteMissing = getMissingFields(draftFields);

  const handleCopyEmail = () => {
    if (quoteMissing.length) return;
    navigator.clipboard.writeText(quoteEmailBody);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#0d0b0a] border border-[#FFA08C]/50 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(255,160,140,0.3)]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#342b27] bg-[#110e0d]">
          <div className="flex items-center gap-3">
            <span className="font-mono font-extrabold text-[15px] text-[#FFA08C] drop-shadow-[0_0_6px_rgba(255,160,140,0.4)]">
              {formData.id}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[12.5px] text-[#b3a59e] font-bold uppercase">Status:</span>
              <StatusBadge 
                status={formData.status} 
                onChange={(newStatus) => {
                  // Booking Confirmed goes through the confirmation form, which sets the status itself.
                  if (newStatus !== 'BOOKING_WON') handleFieldChange('status', newStatus);
                  if (onUpdateStatus) onUpdateStatus(formData.id, newStatus);
                }}
              />
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1 rounded-full bg-[#181412] hover:bg-[rgba(255,160,140,0.2)] text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-4 pt-2.5 border-b border-[#342b27] bg-[#0d0b0a] text-sm">
          <button
            onClick={() => setActiveTab('edit')}
            className={`pb-2 px-3 text-[13.5px] font-extrabold border-b-2 transition-all ${
              activeTab === 'edit' ? 'border-[#FFA08C] text-[#FFA08C]' : 'border-transparent text-[#b3a59e] hover:text-white'
            }`}
          >
            Edit & Update Details
          </button>
          <button
            onClick={() => setActiveTab('email-composer')}
            className={`pb-2 px-3 text-[13.5px] font-extrabold border-b-2 transition-all ${
              activeTab === 'email-composer' ? 'border-[#FFA08C] text-[#FFA08C]' : 'border-transparent text-[#b3a59e] hover:text-white'
            }`}
          >
            Quotation Email Reply
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-2 px-3 text-[13.5px] font-extrabold border-b-2 transition-all ${
              activeTab === 'audit' ? 'border-[#FFA08C] text-[#FFA08C]' : 'border-transparent text-[#b3a59e] hover:text-white'
            }`}
          >
            Audit History
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 text-sm max-h-[75vh] overflow-y-auto">
          
          {activeTab === 'edit' && (
            <form onSubmit={handleSave} className="space-y-3">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* 1. Shipper & Tax */}
                <div className="p-3 rounded-xl bg-[#120f0e] border border-[#3a302b] space-y-2">
                  <div className="text-[12.5px] font-extrabold text-[#FFA08C] uppercase tracking-wider border-b border-[#3a302b] pb-1">
                    1. Shipper Profile
                  </div>
                  <div>
                    <label className="text-[12.5px] text-[#b3a59e] block">Company Name</label>
                    <input
                      type="text"
                      value={formData.shipperName || ''}
                      onChange={(e) => handleFieldChange('shipperName', e.target.value)}
                      className="scm-input text-sm w-full font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[12.5px] text-[#b3a59e] block">15-Digit GSTIN</label>
                    <input
                      type="text"
                      value={formData.gstin || ''}
                      onChange={(e) => handleFieldChange('gstin', e.target.value)}
                      className="scm-input text-sm w-full font-mono text-[#FFA08C] font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[12.5px] text-[#b3a59e] block">Contact Person & Phone</label>
                    <input
                      type="text"
                      value={formData.contactPerson || ''}
                      onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
                      className="scm-input text-sm w-full"
                    />
                  </div>
                </div>

                {/* 2. Routing & Specs */}
                <div className="p-3 rounded-xl bg-[#120f0e] border border-[#3a302b] space-y-2">
                  <div className="text-[12.5px] font-extrabold text-[#FFA08C] uppercase tracking-wider border-b border-[#3a302b] pb-1">
                    2. Routing & Container
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[12.5px] text-[#b3a59e] block">POL (Origin)</label>
                      <input
                        type="text"
                        value={formData.pol || ''}
                        onChange={(e) => handleFieldChange('pol', e.target.value)}
                        className="scm-input text-sm w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[12.5px] text-[#b3a59e] block">POD (Dest)</label>
                      <input
                        type="text"
                        value={formData.pod || ''}
                        onChange={(e) => handleFieldChange('pod', e.target.value)}
                        className="scm-input text-sm w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[12.5px] text-[#b3a59e] block">Container / Mode</label>
                    <input
                      type="text"
                      value={formData.containerType || ''}
                      onChange={(e) => handleFieldChange('containerType', e.target.value)}
                      className="scm-input text-sm w-full font-semibold text-[#FFA08C]"
                    />
                  </div>
                  <div>
                    <label className="text-[12.5px] text-[#b3a59e] block">Commodity Description</label>
                    <input
                      type="text"
                      value={formData.commodity || ''}
                      onChange={(e) => handleFieldChange('commodity', e.target.value)}
                      className="scm-input text-sm w-full"
                    />
                  </div>
                </div>

                {/* 3. Weight & Quotation */}
                <div className="p-3 rounded-xl bg-[#120f0e] border border-[#3a302b] space-y-2">
                  <div className="text-[12.5px] font-extrabold text-[#FFA08C] uppercase tracking-wider border-b border-[#3a302b] pb-1">
                    3. Quotation & Weight
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[12.5px] text-[#b3a59e] block">Gross Wt (KG)</label>
                      <input
                        type="number"
                        value={formData.grossWeightKg || 0}
                        onChange={(e) => handleFieldChange('grossWeightKg', parseFloat(e.target.value) || 0)}
                        className="scm-input text-sm w-full font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[12.5px] text-[#b3a59e] block">Volume (CBM)</label>
                      <input
                        type="number"
                        value={formData.volumeCbm || 0}
                        onChange={(e) => handleFieldChange('volumeCbm', parseFloat(e.target.value) || 0)}
                        className="scm-input text-sm w-full font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[12.5px] text-[#b3a59e] block">Quoted Freight Rate</label>
                    <input
                      type="text"
                      value={formData.quotedRate || ''}
                      onChange={(e) => handleFieldChange('quotedRate', e.target.value)}
                      placeholder="e.g. $1,450 / 40'HC"
                      className="scm-input text-sm w-full font-mono text-emerald-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[12.5px] text-[#b3a59e] block">Free Days at POD</label>
                    <input
                      type="text"
                      value={formData.freeDaysAtPod || ''}
                      onChange={(e) => handleFieldChange('freeDaysAtPod', e.target.value)}
                      className="scm-input text-sm w-full"
                    />
                  </div>
                </div>

              </div>

              {/* Cargo & pickup */}
              <div className="p-3 rounded-xl bg-[#120f0e] border border-[#3a302b] space-y-2">
                <div className="text-[12.5px] font-extrabold text-[#FFA08C] uppercase tracking-wider border-b border-[#3a302b] pb-1">
                  4. Cargo & Pickup
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
                  <div>
                    <label className="text-[12.5px] text-[#b3a59e] block">Import / Export</label>
                    <select value={formData.direction || ''} onChange={(e) => handleFieldChange('direction', e.target.value)} className="scm-select text-sm w-full">
                      <option value="">Not set</option>
                      <option value="Import">Import</option>
                      <option value="Export">Export</option>
                    </select>
                  </div>
                  {[['packages', 'Packages', 'e.g. 100 boxes'], ['hsnCode', 'HSN Code', ''], ['dimensions', 'Dimensions', 'L x W x H'], ['incoterms', 'Incoterms', 'e.g. EXW']].map(([key, labelText, ph]) => (
                    <div key={key}>
                      <label className="text-[12.5px] text-[#b3a59e] block">{labelText}</label>
                      <input type="text" value={formData[key] || ''} placeholder={ph} onChange={(e) => handleFieldChange(key, e.target.value)} className="scm-input text-sm w-full" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                  <div className="md:col-span-2">
                    <label className="text-[12.5px] text-[#b3a59e] block">Pickup Address</label>
                    <input type="text" value={formData.pickupAddress || ''} onChange={(e) => handleFieldChange('pickupAddress', e.target.value)} className="scm-input text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-[12.5px] text-[#b3a59e] block">Cargo Ready</label>
                    <input type="text" value={formData.cargoReadyDate || ''} onChange={(e) => handleFieldChange('cargoReadyDate', e.target.value)} className="scm-input text-sm w-full" />
                  </div>
                </div>
                <div>
                  <label className="text-[12.5px] text-[#b3a59e] block">Special Requirements</label>
                  <input type="text" value={formData.specialRequirements || ''} onChange={(e) => handleFieldChange('specialRequirements', e.target.value)} className="scm-input text-sm w-full" />
                </div>
              </div>

              {/* Follow-up Notes */}
              <div>
                <label className="text-[12.5px] font-extrabold text-[#dcd2cd] block mb-1">Follow-up Notes / Gist:</label>
                <textarea
                  value={formData.conversationGist || ''}
                  onChange={(e) => handleFieldChange('conversationGist', e.target.value)}
                  rows={2}
                  className="scm-input text-sm w-full rounded-xl"
                />
              </div>

              {/* Footer Save Button */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#342b27]">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-dark text-[13.5px] py-1 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-coral text-[13.5px] py-1.5 px-5 font-extrabold shadow-[0_0_16px_rgba(255,160,140,0.45)]"
                >
                  <Save size={13} />
                  <span>Save Updates</span>
                </button>
              </div>

            </form>
          )}

          {activeTab === 'email-composer' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-extrabold text-[#FFA08C]">Generated Customer Quotation Email:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyEmail}
                    disabled={quoteMissing.length > 0}
                    title={quoteMissing.length ? 'Fill in the missing details in Reply & Quote first' : undefined}
                    className="btn-dark text-[13px] py-1 px-3.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {copiedQuote ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedQuote ? 'Copied!' : 'Copy Email Text'}</span>
                  </button>
                  {onOpenReply && (
                    <button
                      onClick={() => onOpenReply(formData)}
                      className="btn-coral text-[13px] py-1 px-3.5"
                    >
                      <Send size={11} />
                      <span>Open Reply & Quote</span>
                    </button>
                  )}
                </div>
              </div>

              {quoteMissing.length > 0 ? (
                <div className="p-4 rounded-xl border border-amber-400/50 bg-[rgba(251,191,36,0.06)] text-center space-y-1.5">
                  <div className="font-extrabold text-white">The quotation isn't ready to copy yet</div>
                  <div className="text-sm text-amber-300 font-bold">Missing: {quoteMissing.map(m => m.label).join(', ')}</div>
                  <div className="text-[12.5px] text-[#b3a59e]">Click "Open Reply & Quote", fill these in, and the reply unlocks there.</div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#090706] border border-[#3a302b] font-mono text-[13.5px] text-slate-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {quoteEmailBody}
                </div>
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(formData.auditLog || []).length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">No audit history entries recorded yet.</div>
              ) : (
                formData.auditLog.map((log, i) => (
                  <div key={i} className="p-2 rounded-lg bg-[#120f0e] border border-[#3a302b] flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-slate-200">{log.action}</span>
                    <span className="text-[#b3a59e] font-mono">{new Date(log.timestamp).toLocaleTimeString('en-IN')}</span>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
