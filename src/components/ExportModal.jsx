import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Download, 
  Check, 
  Building2, 
  Table
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { exportInquiriesToExcel, exportColorCodedHtmlExcel } from '../utils/excelExporter';

export default function ExportModal({ isOpen, onClose, inquiries, currentUser }) {
  const [csAgentName, setCsAgentName] = useState(currentUser?.name || "Aarti Sharma (Senior CS Executive)");
  const [targetHierarchy, setTargetHierarchy] = useState("VP of Customer Service (Rajiv Kapoor)");
  const [shiftName, setShiftName] = useState("General Day Shift (09:00 - 18:00 IST)");
  const [branch, setBranch] = useState("Nhava Sheva & Mundra Consolidation Hub");
  const [exportFormat, setExportFormat] = useState("xlsx");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const total = inquiries.length;
  const quotedCount = inquiries.filter(i => i.isQuoted || i.status === 'QUOTED_REPLIED' || i.status === 'BOOKING_WON').length;
  const pendingCount = inquiries.filter(i => i.status === 'INQUIRY_RECEIVED' || i.status === 'UNDER_REVIEW').length;
  const wonCount = inquiries.filter(i => i.status === 'BOOKING_WON').length;

  const handleTriggerExport = async () => {
    setIsExporting(true);

    const exportOpts = {
      csAgentName,
      targetHierarchy,
      shiftName,
      branch,
      reportDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    if (exportFormat === "xlsx") {
      exportInquiriesToExcel(inquiries, exportOpts);
    } else {
      exportColorCodedHtmlExcel(inquiries, exportOpts);
    }

    try {
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.7 }
      });
    } catch (e) {}

    setIsExporting(false);
    setExportSuccess(true);
    setTimeout(() => {
      setExportSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0d0b0a] border border-emerald-500/50 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.25)]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c1715] bg-[#110e0d]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.4)]">
              <FileSpreadsheet size={15} />
            </div>
            <div>
              <div className="text-xs font-extrabold text-white flex items-center gap-2">
                <span>EXPORT INQUIRIES EXCEL EOD SHEET</span>
                <span className="text-[9px] uppercase px-2 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-bold">
                  VP / Director Report
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1 rounded-full bg-[#181412] hover:bg-emerald-950 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5 text-xs">
          
          {/* Summary */}
          <div className="grid grid-cols-4 gap-2 p-2.5 rounded-xl bg-[#120f0e] border border-[#201a18] text-center font-mono">
            <div>
              <div className="text-[9px] text-[#786b66] uppercase font-bold">Total Rows</div>
              <div className="text-sm font-bold text-white">{total}</div>
            </div>
            <div>
              <div className="text-[9px] text-[#786b66] uppercase font-bold">Quoted</div>
              <div className="text-sm font-bold text-emerald-400">{quotedCount}</div>
            </div>
            <div>
              <div className="text-[9px] text-[#786b66] uppercase font-bold">Pending</div>
              <div className="text-sm font-bold text-[#FFA08C]">{pendingCount}</div>
            </div>
            <div>
              <div className="text-[9px] text-[#786b66] uppercase font-bold">Won</div>
              <div className="text-sm font-bold text-emerald-300">{wonCount}</div>
            </div>
          </div>

          {/* Form */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-extrabold text-[#a1928c] block mb-1">Target Recipient in Hierarchy:</label>
              <select
                value={targetHierarchy}
                onChange={(e) => setTargetHierarchy(e.target.value)}
                className="scm-select text-xs w-full font-bold text-[#FFA08C]"
              >
                <option value="VP of Customer Service (Rajiv Kapoor)">VP of Customer Service (Rajiv Kapoor)</option>
                <option value="Director of Freight Operations (Sanjay Kulkarni)">Director of Freight Operations (Sanjay Kulkarni)</option>
                <option value="CS Team Lead (Vikram Singhania)">CS Team Lead (Vikram Singhania)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#a1928c] block mb-1">Prepared By (CS Rep):</label>
              <input
                type="text"
                value={csAgentName}
                onChange={(e) => setCsAgentName(e.target.value)}
                className="scm-input text-xs w-full"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#a1928c] block mb-1">Operational Shift:</label>
              <select
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                className="scm-select text-xs w-full"
              >
                <option value="General Day Shift (09:00 - 18:00 IST)">General Day Shift (09:00 - 18:00 IST)</option>
                <option value="Morning Consolidation (07:00 - 15:30 IST)">Morning Consolidation (07:00 - 15:30 IST)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#a1928c] block mb-1">Regional Branch:</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="scm-select text-xs w-full"
              >
                <option value="Nhava Sheva & Mundra Hub">Nhava Sheva & Mundra Hub</option>
                <option value="Chennai South Ocean Desk">Chennai South Ocean Desk</option>
              </select>
            </div>
          </div>

          {/* Format Selector */}
          <div>
            <label className="text-[10px] font-extrabold text-[#a1928c] block mb-1.5">Spreadsheet Format:</label>
            <div className="grid grid-cols-2 gap-2">
              <div 
                onClick={() => setExportFormat("xlsx")}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  exportFormat === "xlsx" 
                    ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                    : 'bg-[#120f0e] border-[#201a18] text-[#a1928c]'
                }`}
              >
                <div className="font-bold text-[11px] flex items-center gap-1.5">
                  <FileSpreadsheet size={13} className="text-emerald-400" />
                  <span>Standard Multi-Sheet (.xlsx)</span>
                </div>
                <div className="text-[9.5px] text-[#786b66] mt-0.5">3 sheets with Master + VP summary</div>
              </div>

              <div 
                onClick={() => setExportFormat("color_xls")}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  exportFormat === "color_xls" 
                    ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                    : 'bg-[#120f0e] border-[#201a18] text-[#a1928c]'
                }`}
              >
                <div className="font-bold text-[11px] flex items-center gap-1.5">
                  <Table size={13} className="text-[#FFA08C]" />
                  <span>Color-Coded Sheet (.xls)</span>
                </div>
                <div className="text-[9.5px] text-[#786b66] mt-0.5">Embedded status fill colors</div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#1c1715] bg-[#110e0d]">
          <button
            onClick={onClose}
            className="btn-dark text-[11px] py-1 px-3.5"
          >
            Cancel
          </button>

          <button
            onClick={handleTriggerExport}
            disabled={isExporting}
            className="btn-green text-[11px] py-1.5 px-5 font-extrabold"
          >
            {exportSuccess ? <Check size={13} /> : <Download size={13} />}
            <span>{exportSuccess ? 'Downloaded!' : 'Download Excel File'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
