import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  FileText, 
  Image as ImageIcon, 
  Upload, 
  Check, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  Ban,
  XCircle,
  AlertOctagon,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { parseEmailContent } from '../utils/emailParser';
import { sampleEmails } from '../data/sampleEmails';
import { processScreenshotOcr, sampleScreenshotPresets } from '../utils/ocrSimulator';
import { uploadScreenshotToImageKit } from '../lib/imagekit';

export default function InquiryIntakeModal({ isOpen, onClose, onSaveInquiry, currentUser }) {
  const [activeTab, setActiveTab] = useState('text');
  const [rawText, setRawText] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [selectedImagePreset, setSelectedImagePreset] = useState(null);

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState({ step: 0, text: '', percent: 0 });
  const [extractedData, setExtractedData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setExtractedData(null);
      setIsExtracting(false);
      setExtractionProgress({ step: 0, text: '', percent: 0 });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectTextPreset = (presetId) => {
    setSelectedPreset(presetId);
    const sample = sampleEmails.find(s => s.id === presetId);
    if (sample) {
      setRawText(sample.rawContent);
    }
  };

  const handleSelectImagePreset = (preset) => {
    setSelectedImagePreset(preset);
    setSelectedImage(`mock-text:${preset.mockText}`);
    setImagePreviewUrl("https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80");
  };

  const handlePasteEvent = (e) => {
    if (activeTab !== 'image') return;
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          const preview = URL.createObjectURL(blob);
          setImagePreviewUrl(preview);
          setSelectedImage(blob);
          setSelectedImagePreset(null);
          break;
        }
      }
    }
  };

  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setImagePreviewUrl(preview);
      setSelectedImage(file);
      setSelectedImagePreset(null);
    }
  };

  const handleStartExtraction = async () => {
    setIsExtracting(true);

    if (activeTab === 'text') {
      if (!rawText.trim()) {
        alert("Please paste an email or choose a sample preset first.");
        setIsExtracting(false);
        return;
      }

      setExtractionProgress({ step: 1, text: "Reading email headers, sender & recipients...", percent: 25 });
      await new Promise(r => setTimeout(r, 300));

      setExtractionProgress({ step: 2, text: "Validating Indian GSTIN & Company Registry...", percent: 55 });
      await new Promise(r => setTimeout(r, 350));

      setExtractionProgress({ step: 3, text: "Mapping POL / POD Ports and Container Specifications...", percent: 85 });
      await new Promise(r => setTimeout(r, 350));

      setExtractionProgress({ step: 4, text: "Analyzing Quotation Status, Reply Sentiment & Notes...", percent: 100 });
      await new Promise(r => setTimeout(r, 250));

      const parsed = parseEmailContent(rawText);
      if (currentUser?.name) {
        parsed.assignedTo = currentUser.name + ` (${currentUser.role || 'CS Desk'})`;
      }
      setExtractedData(parsed);
      setIsExtracting(false);

    } else {
      if (!selectedImage && !selectedImagePreset) {
        alert("Please upload a screenshot or select a preset email image.");
        setIsExtracting(false);
        return;
      }

      const imgSource = selectedImagePreset ? `mock-text:${selectedImagePreset.mockText}` : selectedImage;
      
      // Upload screenshot to ImageKit in background
      let imageKitRes = null;
      if (selectedImage instanceof Blob || selectedImage instanceof File) {
        imageKitRes = await uploadScreenshotToImageKit(selectedImage);
      }

      const res = await processScreenshotOcr(imgSource, (prog) => {
        setExtractionProgress(prog);
      });

      if (imageKitRes?.url) {
        res.parsedInquiry.screenshotUrl = imageKitRes.url;
      }

      if (currentUser?.name) {
        res.parsedInquiry.assignedTo = currentUser.name + ` (${currentUser.role || 'CS Desk'})`;
      }
      setExtractedData(res.parsedInquiry);
      setIsExtracting(false);
    }
  };

  const handleSaveToCrm = () => {
    if (!extractedData) return;
    
    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (e) {}

    onSaveInquiry(extractedData);
    onClose();
  };

  const handleFieldChange = (field, value) => {
    setExtractedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto"
      onPaste={handlePasteEvent}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#0d0b0a] border border-[#FFA08C]/50 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(255,160,140,0.3)]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c1715] bg-[#110e0d]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#FFA08C] flex items-center justify-center text-[#0d0b0a] font-extrabold shadow-[0_0_12px_rgba(255,160,140,0.5)]">
              <Sparkles size={14} className="text-[#0d0b0a]" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-white flex items-center gap-2">
                <span>INQUIRY INGESTION & EXTRACTION STUDIO</span>
                <span className="text-[9px] uppercase px-2 py-0.2 rounded-full bg-[rgba(255,160,140,0.15)] text-[#FFA08C] border border-[rgba(255,160,140,0.4)] font-bold">
                  CS Operations
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1 rounded-full bg-[#181412] hover:bg-[rgba(255,160,140,0.2)] text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {!extractedData && !isExtracting && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#1c1715] pb-2">
                <button
                  onClick={() => setActiveTab('text')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition-all ${
                    activeTab === 'text'
                      ? 'bg-[#FFA08C] text-[#0d0b0a] shadow-[0_0_14px_rgba(255,160,140,0.45)]'
                      : 'bg-[#120f0e] text-[#a1928c] hover:text-white border border-[#241d1a]'
                  }`}
                >
                  <FileText size={13} />
                  <span>Copy-Paste Email Text</span>
                </button>

                <button
                  onClick={() => setActiveTab('image')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition-all ${
                    activeTab === 'image'
                      ? 'bg-[#FFA08C] text-[#0d0b0a] shadow-[0_0_14px_rgba(255,160,140,0.45)]'
                      : 'bg-[#120f0e] text-[#a1928c] hover:text-white border border-[#241d1a]'
                  }`}
                >
                  <ImageIcon size={13} />
                  <span>Upload / Paste Screenshot (OCR)</span>
                </button>
              </div>

              {activeTab === 'text' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#120f0e] border border-[#201a18]">
                    <span className="text-[10.5px] font-extrabold text-[#FFA08C]">Quick Load Industry Sample:</span>
                    <div className="flex flex-wrap gap-1">
                      {sampleEmails.map((sample) => (
                        <button
                          key={sample.id}
                          onClick={() => handleSelectTextPreset(sample.id)}
                          className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold transition-all ${
                            selectedPreset === sample.id
                              ? 'bg-[#FFA08C] text-[#0d0b0a] border-[#FFA08C]'
                              : 'bg-[#181412] text-[#a1928c] border-[#29221e] hover:text-white'
                          }`}
                        >
                          {sample.badge}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="Paste raw email here (From: client@domain.com \n Subject: Rate Request Mundra to Jebel Ali...)"
                      rows={10}
                      className="scm-input font-mono text-[11px] w-full p-2.5 bg-[#090706] border-[#221b18] leading-relaxed rounded-xl"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setRawText('')}
                      className="btn-dark text-[11px] py-1 px-3"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleStartExtraction}
                      disabled={!rawText.trim()}
                      className="btn-coral text-[11px] py-1.5 px-4 font-extrabold disabled:opacity-50"
                    >
                      <Sparkles size={13} />
                      <span>Run Smart Entity Extraction</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'image' && (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-[#120f0e] border border-[#201a18]">
                    <div className="text-[10px] font-extrabold text-[#FFA08C] mb-1.5">Preset Email Screenshots:</div>
                    <div className="grid grid-cols-3 gap-2">
                      {sampleScreenshotPresets.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleSelectImagePreset(p)}
                          className={`p-2 text-left rounded-lg border transition-all ${
                            selectedImagePreset?.id === p.id
                              ? 'bg-[rgba(255,160,140,0.18)] text-[#FFA08C] border-[#FFA08C]'
                              : 'bg-[#181412] text-[#a1928c] border-[#261f1b] hover:text-white'
                          }`}
                        >
                          <div className="font-bold text-[10.5px] truncate">{p.name}</div>
                          <div className="text-[9px] text-[#786b66]">{p.thumbnailLabel}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border border-dashed border-[#28211d] hover:border-[#FFA08C]/60 rounded-xl p-6 text-center bg-[#090706]">
                    {imagePreviewUrl ? (
                      <div className="relative max-h-48 overflow-hidden rounded-lg border border-[#2a221f] mx-auto">
                        <img src={imagePreviewUrl} alt="Screenshot" className="w-full object-cover max-h-48" />
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/80 text-[9px] font-mono font-bold text-[#FFA08C] border border-[#FFA08C]/50">
                          Ready for OCR
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 py-2">
                        <div className="text-xs font-bold text-slate-200">
                          Drop screenshot or <label className="text-[#FFA08C] cursor-pointer hover:underline font-extrabold">browse file<input type="file" accept="image/*" onChange={handleImageFileUpload} className="hidden" /></label>
                        </div>
                        <div className="text-[10px] text-[#786b66]">
                          Press <kbd className="px-1.5 py-0.2 rounded bg-[#181412] text-slate-300 font-mono">Ctrl + V</kbd> to paste directly from clipboard
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={handleStartExtraction}
                      disabled={!imagePreviewUrl && !selectedImagePreset}
                      className="btn-coral text-[11px] py-1.5 px-4 font-extrabold disabled:opacity-50"
                    >
                      <Sparkles size={13} />
                      <span>Process OCR & Extract</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isExtracting && (
            <div className="py-10 text-center space-y-4">
              <div className="w-10 h-10 rounded-full border-2 border-[#FFA08C]/20 border-t-[#FFA08C] animate-spin mx-auto shadow-[0_0_14px_rgba(255,160,140,0.4)]"></div>
              <div>
                <div className="text-xs font-bold text-white">Extracting Freight Entities...</div>
                <div className="text-[11px] text-[#FFA08C] font-mono mt-0.5">{extractionProgress.text}</div>
              </div>
              <div className="w-64 mx-auto bg-[#181412] rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#FFA08C] h-full transition-all duration-300 shadow-[0_0_8px_rgba(255,160,140,0.5)]" style={{ width: `${extractionProgress.percent}%` }}></div>
              </div>
            </div>
          )}

          {extractedData && !isExtracting && (
            extractedData.isIrrelevant ? (
              /* Irrelevant / Spam / Auto-Reply Flagged Screen */
              <div className="space-y-3.5 animate-fadeIn">
                
                {/* Alert Header Strip */}
                <div className="p-3 rounded-xl bg-[#1c0d0b] border border-red-500/40 flex items-center justify-between shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-red-400">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                      <Ban size={14} className="text-red-400" />
                    </div>
                    <span>EMAIL FLAGGED: NON-FREIGHT CONTENT</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-extrabold uppercase">
                      {extractedData.categoryLabel || "Irrelevant Email"}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#120f0e] text-[#a1928c] border border-[#261f1b] font-mono font-bold">
                      {extractedData.confidenceScore || 95}% Match
                    </span>
                  </div>
                </div>

                {/* Main Explanation Hero */}
                <div className="p-3.5 rounded-xl bg-[#120f0e] border border-red-500/25 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={18} className="text-[#FFA08C] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white">
                        {extractedData.flagReason}
                      </div>
                      <div className="text-[10.5px] text-[#a1928c] leading-relaxed">
                        The Polestar Smart Ingestion Engine determined that this email does not contain commercial freight forwarding or ocean container rate parameters.
                      </div>
                    </div>
                  </div>

                  {/* Triggered Reasons Breakdown */}
                  {extractedData.reasons && extractedData.reasons.length > 0 && (
                    <div className="pt-2 border-t border-[#1f1917] space-y-1.5">
                      <div className="text-[10px] font-extrabold text-[#FFA08C] uppercase tracking-wider">
                        Filter Criteria Triggered:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {extractedData.reasons.map((r, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[#090706] border border-[#1f1917] text-[10.5px] text-slate-300">
                            <XCircle size={12} className="text-red-400 shrink-0" />
                            <span className="truncate">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Scanned Email Metadata Snapshot */}
                <div className="p-3 rounded-xl bg-[#090706] border border-[#1f1917] space-y-2">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Scanned Email Context:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[#786b66] text-[10px] block">Sender:</span>
                      <span className="text-white font-medium">{extractedData.senderName || "Unknown"} {extractedData.senderEmail ? `<${extractedData.senderEmail}>` : ""}</span>
                    </div>
                    <div>
                      <span className="text-[#786b66] text-[10px] block">Subject:</span>
                      <span className="text-white font-medium truncate block">{extractedData.subject || "No Subject"}</span>
                    </div>
                  </div>
                  {extractedData.rawContentSnippet && (
                    <div className="pt-1.5 border-t border-[#1a1412]">
                      <span className="text-[#786b66] text-[10px] block mb-0.5">Content Preview:</span>
                      <p className="text-[10px] font-mono text-[#8a7e79] bg-[#120f0e] p-2 rounded-lg border border-[#1a1412] line-clamp-2">
                        {extractedData.rawContentSnippet}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-[#1c1715]">
                  <button
                    onClick={() => setExtractedData(null)}
                    className="btn-coral text-[11px] py-1.5 px-4 font-extrabold"
                  >
                    <RefreshCw size={12} />
                    <span>Scan Another Email</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-950/40 border border-red-500/30 text-[10.5px] font-bold text-red-400">
                      <Lock size={12} />
                      <span>Ingestion Blocked</span>
                    </div>
                    <button
                      onClick={onClose}
                      className="btn-dark text-[11px] py-1.5 px-4 font-bold"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              /* Valid Freight Inquiry Extraction Form */
              <div className="space-y-3 animate-fadeIn">
                
                <div className="p-2.5 rounded-xl bg-[#120f0e] border border-[rgba(255,160,140,0.35)] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <CheckCircle2 size={15} className="text-emerald-400" />
                    <span>Extracted Reference: <span className="font-mono text-[#FFA08C] font-bold">{extractedData.id}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#786b66] font-bold uppercase">Status:</span>
                    <select
                      value={extractedData.status}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      className="scm-select text-[10.5px] py-0.5 px-2 font-extrabold text-[#FFA08C]"
                    >
                      <option value="INQUIRY_RECEIVED">Inquiry Received</option>
                      <option value="UNDER_REVIEW">Under Liner Review</option>
                      <option value="QUOTED_REPLIED">Quoted & Replied</option>
                      <option value="FOLLOWUP_NEEDED">Follow-up Needed</option>
                      <option value="BOOKING_WON">Booking Won</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* Col 1 */}
                  <div className="p-3 rounded-xl bg-[#120f0e] border border-[#201a18] space-y-2">
                    <div className="text-[10px] font-extrabold text-[#FFA08C] uppercase tracking-wider border-b border-[#201a18] pb-1">
                      1. Shipper & GSTIN
                    </div>
                    <div>
                      <label className="text-[10px] text-[#786b66] block">Company Name</label>
                      <input
                        type="text"
                        value={extractedData.shipperName || ''}
                        onChange={(e) => handleFieldChange('shipperName', e.target.value)}
                        className="scm-input text-xs w-full font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#786b66] block">GSTIN / Tax ID</label>
                      <input
                        type="text"
                        value={extractedData.gstin || ''}
                        onChange={(e) => handleFieldChange('gstin', e.target.value)}
                        className="scm-input text-xs w-full font-mono text-[#FFA08C] font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#786b66] block">Contact Person & Phone</label>
                      <input
                        type="text"
                        value={`${extractedData.contactPerson || ''} - ${extractedData.contactPhone || ''}`}
                        onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
                        className="scm-input text-xs w-full"
                      />
                    </div>
                  </div>

                  {/* Col 2 */}
                  <div className="p-3 rounded-xl bg-[#120f0e] border border-[#201a18] space-y-2">
                    <div className="text-[10px] font-extrabold text-[#FFA08C] uppercase tracking-wider border-b border-[#201a18] pb-1">
                      2. Routing & Cargo
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] text-[#786b66] block">POL (Origin)</label>
                        <input
                          type="text"
                          value={extractedData.pol || ''}
                          onChange={(e) => handleFieldChange('pol', e.target.value)}
                          className="scm-input text-xs w-full"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#786b66] block">POD (Dest)</label>
                        <input
                          type="text"
                          value={extractedData.pod || ''}
                          onChange={(e) => handleFieldChange('pod', e.target.value)}
                          className="scm-input text-xs w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#786b66] block">Container / Specs</label>
                      <input
                        type="text"
                        value={extractedData.containerType || ''}
                        onChange={(e) => handleFieldChange('containerType', e.target.value)}
                        className="scm-input text-xs w-full font-semibold text-[#FFA08C]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] text-[#786b66] block">Gross Wt (KG)</label>
                        <input
                          type="number"
                          value={extractedData.grossWeightKg || 0}
                          onChange={(e) => handleFieldChange('grossWeightKg', parseFloat(e.target.value) || 0)}
                          className="scm-input text-xs w-full font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#786b66] block">Volume (CBM)</label>
                        <input
                          type="number"
                          value={extractedData.volumeCbm || 0}
                          onChange={(e) => handleFieldChange('volumeCbm', parseFloat(e.target.value) || 0)}
                          className="scm-input text-xs w-full font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Col 3 */}
                  <div className="p-3 rounded-xl bg-[#120f0e] border border-[#201a18] space-y-2">
                    <div className="text-[10px] font-extrabold text-[#FFA08C] uppercase tracking-wider border-b border-[#201a18] pb-1">
                      3. Quotation & Response
                    </div>
                    <div>
                      <label className="text-[10px] text-[#786b66] block">Quoted Freight Rate</label>
                      <input
                        type="text"
                        value={extractedData.quotedRate || ''}
                        onChange={(e) => handleFieldChange('quotedRate', e.target.value)}
                        placeholder="e.g. $1,450 / 40'HC"
                        className="scm-input text-xs w-full font-mono text-emerald-400 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#786b66] block">Destination Free Days</label>
                      <input
                        type="text"
                        value={extractedData.freeDaysAtPod || ''}
                        onChange={(e) => handleFieldChange('freeDaysAtPod', e.target.value)}
                        className="scm-input text-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#786b66] block">Assigned CS Desk</label>
                      <input
                        type="text"
                        value={extractedData.assignedTo || ''}
                        onChange={(e) => handleFieldChange('assignedTo', e.target.value)}
                        className="scm-input text-xs w-full"
                      />
                    </div>
                  </div>

                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#a1928c] block mb-1">Executive Gist / Follow-up:</label>
                  <textarea
                    value={extractedData.conversationGist || ''}
                    onChange={(e) => handleFieldChange('conversationGist', e.target.value)}
                    rows={2}
                    className="scm-input text-xs w-full rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1c1715]">
                  <button
                    onClick={() => setExtractedData(null)}
                    className="btn-dark text-[11px] py-1 px-3"
                  >
                    <RefreshCw size={11} />
                    <span>Scan Another</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={onClose}
                      className="btn-dark text-[11px] py-1 px-3"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveToCrm}
                      className="btn-coral text-[11px] py-1.5 px-5 font-extrabold"
                    >
                      <Check size={13} />
                      <span>Approve & Add Row</span>
                    </button>
                  </div>
                </div>

              </div>
            )
          )}

        </div>

      </div>
    </div>
  );
}
