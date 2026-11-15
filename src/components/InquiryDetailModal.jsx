import React, { useState, useEffect } from 'react';
import { copyQuote } from '../utils/richCopy';
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
  CheckCircle2,
  Globe2
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import SalesSelect from './SalesSelect';
import { initialDraftFields, buildReplySubject, buildReplyBody, getMissingFields, isExWorks } from '../utils/replyDraft';

export default function InquiryDetailModal({ 
  isOpen, 
  onClose, 
  inquiry, 
  onUpdateStatus, 
  onSaveUpdates,
  onOpenReply, onAskAgent, salesTeam}) {
  const [activeTab, setActiveTab] = useState('edit');
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (!inquiry) return;
    // The same inquiry updated from elsewhere (an agent request logged): keep the
    // unsaved edits here and take only what changed.
    setFormData(prev => (prev?.id === inquiry.id
      ? { ...prev, agentRequests: inquiry.agentRequests, auditLog: inquiry.auditLog, pickupAddress: inquiry.pickupAddress }
      : { ...inquiry }));
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
    copyQuote(quoteEmailBody);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-surface border border-accent/50 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(255,160,140,0.3)]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-panel-2">
          <div className="flex items-center gap-3">
            <span className="font-mono font-extrabold text-[15px] text-accent-ink drop-shadow-[0_0_6px_rgba(255,160,140,0.4)]">
              {formData.id}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[12.5px] text-ink-3 font-bold uppercase">Status:</span>
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
            className="p-1 rounded-full bg-raised hover:bg-[rgba(255,160,140,0.2)] text-ink-2 hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-4 pt-2.5 border-b border-line bg-surface text-sm">
          <button
            onClick={() => setActiveTab('edit')}
            className={`pb-2 px-3 text-[13.5px] font-extrabold border-b-2 transition-all ${
              activeTab === 'edit' ? 'border-accent text-accent-ink' : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            Edit & Update Details
          </button>
          <button
            onClick={() => setActiveTab('email-composer')}
            className={`pb-2 px-3 text-[13.5px] font-extrabold border-b-2 transition-all ${
              activeTab === 'email-composer' ? 'border-accent text-accent-ink' : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            Quotation Email Reply
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-2 px-3 text-[13.5px] font-extrabold border-b-2 transition-all ${
              activeTab === 'audit' ? 'border-accent text-accent-ink' : 'border-transparent text-ink-3 hover:text-ink'
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
                <div className="p-3 rounded-xl bg-panel border border-line-2 space-y-2">
                  <div className="text-[12.5px] font-extrabold text-accent-ink uppercase tracking-wider border-b border-line-2 pb-1">
                    1. Shipper Profile
                  </div>
                  <div>
                    <label className="text-[12.5px] text-ink-3 block">Company Name</label>
                    <input
                      type="text"
                      value={formData.shipperName || ''}
                      onChange={(e) => handleFieldChange('shipperName', e.target.value)}
                      className="scm-input text-sm w-full font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[12.5px] text-ink-3 block">15-Digit GSTIN</label>
                    <input
                      type="text"
                      value={formData.gstin || ''}
                      onChange={(e) => handleFieldChange('gstin', e.target.value)}
                      className="scm-input text-sm w-full font-mono text-accent-ink font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[12.5px] text-ink-3 block">Contact Person & Phone</label>
                    <input
                      type="text"
                      value={formData.contactPerson || ''}
                      onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
                      className="scm-input text-sm w-full"
                    />
                  </div>
                </div>

                {/* 2. Routing & Specs */}
                <div className="p-3 rounded-xl bg-panel border border-line-2 space-y-2">
                  <div className="text-[12.5px] font-extrabold text-accent-ink uppercase tracking-wider border-b border-line-2 pb-1">
                    2. Routing & Container
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[12.5px] text-ink-3 block">POL (Origin)</label>
                      <input
                        type="text"
                        value={formData.pol || ''}
                        onChange={(e) => handleFieldChange('pol', e.target.value)}
                        className="scm-input text-sm w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[12.5px] text-ink-3 block">POD (Dest)</label>
                      <input
                        type="text"
                        value={formData.pod || ''}
                        onChange={(e) => handleFieldChange('pod', e.target.value)}
                        className="scm-input text-sm w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[12.5px] text-ink-3 block">Container / Mode</label>
                    <input
                      type="text"
                      value={formData.containerType || ''}
                      onChange={(e) => handleFieldChange('containerType', e.target.value)}
                      className="scm-input text-sm w-full font-semibold text-accent-ink"
                    />
                  </div>
                  <div>
                    <label className="text-[12.5px] text-ink-3 block">Commodity Description</label>
                    <input
                      type="text"
                      value={formData.commodity || ''}
                      onChange={(e) => handleFieldChange('commodity', e.target.value)}
                      className="scm-input text-sm w-full"
                    />
                  </div>
                </div>

                {/* 3. Weight & Quotation */}
                <div className="p-3 rounded-xl bg-panel border border-line-2 space-y-2">
                  <div className="text-[12.5px] font-extrabold text-accent-ink uppercase tracking-wider border-b border-line-2 pb-1">
                    3. Quotation & Weight
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[12.5px] text-ink-3 block">Gross Wt (KG)</label>
                      <input
                        type="number"
                        value={formData.grossWeightKg || 0}
                        onChange={(e) => handleFieldChange('grossWeightKg', parseFloat(e.target.value) || 0)}
                        className="scm-input text-sm w-full font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[12.5px] text-ink-3 block">Volume (CBM)</label>
                      <input
                        type="number"
                        value={formData.volumeCbm || 0}
                        onChange={(e) => handleFieldChange('volumeCbm', parseFloat(e.target.value) || 0)}
                        className="scm-input text-sm w-full font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[12.5px] text-ink-3 block">Quoted Freight Rate</label>
                    <input
                      type="text"
                      value={formData.quotedRate || ''}
                      onChange={(e) => handleFieldChange('quotedRate', e.target.value)}
                      placeholder="e.g. $1,450 / 40'HC"
                      className="scm-input text-sm w-full font-mono text-good font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[12.5px] text-ink-3 block">Free Days at POD</label>
                    <input
                      type="text"
                      value={formData.freeDaysAtPod || ''}
                      onChange={(e) => handleFieldChange('freeDaysAtPod', e.target.value)}
                      className="scm-input text-sm w-full"
                    />
                  </div>
                </div>

              </div>

              {/* Internal buy / sell note (ex-works); never put in the quote */}
              {(/^EXW/i.test(formData.incoterms || '') || formData.buyCharge || formData.sellCharge) && (
                <div className="p-3 rounded-xl border border-dashed border-sky-500/50 bg-[rgba(14,165,233,0.06)] grid grid-cols-2 gap-2">
                  <div className="col-span-2 text-[12.5px] font-extrabold text-info uppercase tracking-wider">Internal note: not sent to the customer</div>
                  <div>
                    <label className="text-[12.5px] text-ink-3 block">Buy charge (our cost)</label>
                    <input type="text" value={formData.buyCharge || ''} onChange={(e) => handleFieldChange('buyCharge', e.target.value)} className="scm-input text-sm w-full font-mono" />
                  </div>
                  <div>
                    <label className="text-[12.5px] text-ink-3 block">Sell charge (to customer)</label>
                    <input type="text" value={formData.sellCharge || ''} onChange={(e) => handleFieldChange('sellCharge', e.target.value)} className="scm-input text-sm w-full font-mono" />
                  </div>
                  {onAskAgent && isExWorks(formData) && (
                    <div className="col-span-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[12.5px] text-ink-3">
                        {(formData.agentRequests || []).length
                          ? `Rates asked from ${formData.agentRequests.map(r => r.agentName || r.agentEmail).join(', ')}.`
                          : 'No buy rate yet? Ask your agent at origin.'}
                      </span>
                      <button type="button" onClick={() => onAskAgent(formData)} className="btn-dark text-[13px] !py-1">
                        <Globe2 size={13} className="text-info" /><span>Ask agent for rates</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sales member who brought the inquiry in */}
              <div>
                <label className="text-[12.5px] text-ink-3 block">Sales Member</label>
                <SalesSelect value={formData.salesMemberId} team={salesTeam} fallbackName={formData.salesMember}
                  onChange={(m) => { handleFieldChange('salesMemberId', m?.id || ''); handleFieldChange('salesMember', m?.name || ''); }} />
              </div>

              {/* Customer address */}
              <div>
                <label className="text-[12.5px] text-ink-3 block">Customer Address</label>
                <textarea rows={2} value={formData.customerAddress || ''} onChange={(e) => handleFieldChange('customerAddress', e.target.value)} className="scm-input text-sm w-full" placeholder="The client's office address" />
              </div>

              {/* Cargo & pickup */}
              <div className="p-3 rounded-xl bg-panel border border-line-2 space-y-2">
                <div className="text-[12.5px] font-extrabold text-accent-ink uppercase tracking-wider border-b border-line-2 pb-1">
                  4. Cargo & Pickup
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
                  <div>
                    <label className="text-[12.5px] text-ink-3 block">Import / Export</label>
                    <select value={formData.direction || ''} onChange={(e) => handleFieldChange('direction', e.target.value)} className="scm-select text-sm w-full">
                      <option value="">Not set</option>
                      <option value="Import">Import</option>
                      <option value="Export">Export</option>
                    </select>
                  </div>
                  {[['packages', 'Packages', 'e.g. 100 boxes'], ['hsnCode', 'HSN Code', ''], ['dimensions', 'Dimensions', 'L x W x H'], ['incoterms', 'Incoterms', 'e.g. EXW']].map(([key, labelText, ph]) => (
                    <div key={key}>
                      <label className="text-[12.5px] text-ink-3 block">{labelText}</label>
                      <input type="text" value={formData[key] || ''} placeholder={ph} onChange={(e) => handleFieldChange(key, e.target.value)} className="scm-input text-sm w-full" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                  <div className="md:col-span-2">
                    <label className="text-[12.5px] text-ink-3 block">Pickup Address</label>
                    <textarea rows={2} value={formData.pickupAddress || ''} onChange={(e) => handleFieldChange('pickupAddress', e.target.value)} className="scm-input text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-[12.5px] text-ink-3 block">Cargo Ready</label>
                    <input type="text" value={formData.cargoReadyDate || ''} onChange={(e) => handleFieldChange('cargoReadyDate', e.target.value)} className="scm-input text-sm w-full" />
                  </div>
                </div>
                <div>
                  <label className="text-[12.5px] text-ink-3 block">Special Requirements</label>
                  <input type="text" value={formData.specialRequirements || ''} onChange={(e) => handleFieldChange('specialRequirements', e.target.value)} className="scm-input text-sm w-full" />
                </div>
              </div>

              {/* Follow-up Notes */}
              <div>
                <label className="text-[12.5px] font-extrabold text-ink-2 block mb-1">Follow-up Notes / Gist:</label>
                <textarea
                  value={formData.conversationGist || ''}
                  onChange={(e) => handleFieldChange('conversationGist', e.target.value)}
                  rows={2}
                  className="scm-input text-sm w-full rounded-xl"
                />
              </div>

              {/* Footer Save Button */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
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
                <span className="text-[13px] font-extrabold text-accent-ink">Generated Customer Quotation Email:</span>
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
                  <div className="font-extrabold text-ink">The quotation isn't ready to copy yet</div>
                  <div className="text-sm text-warn font-bold">Missing: {quoteMissing.map(m => m.label).join(', ')}</div>
                  <div className="text-[12.5px] text-ink-3">Click "Open Reply & Quote", fill these in, and the reply unlocks there.</div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-field border border-line-2 font-mono text-[13.5px] text-ink-soft leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {quoteEmailBody}
                </div>
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(formData.auditLog || []).length === 0 ? (
                <div className="text-center py-6 text-ink-3 text-sm">No audit history entries recorded yet.</div>
              ) : (
                formData.auditLog.map((log, i) => (
                  <div key={i} className="p-2 rounded-lg bg-panel border border-line-2 flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-ink-f5">{log.action}</span>
                    <span className="text-ink-3 font-mono">{new Date(log.timestamp).toLocaleTimeString('en-IN')}</span>
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
