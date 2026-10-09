import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import MetricsBar from './components/MetricsBar';
import InquiryTable from './components/InquiryTable';
import InquiryIntakeModal from './components/InquiryIntakeModal';
import InquiryDetailModal from './components/InquiryDetailModal';
import ExportModal from './components/ExportModal';
import QuickQuoteModal from './components/QuickQuoteModal';
import { initialInquiries } from './data/mockInquiries';
import { 
  supabase, 
  isSupabaseConfigured, 
  fetchInquiriesDb, 
  createInquiryDb, 
  updateInquiryDb, 
  deleteInquiryDb, 
  clearAllInquiriesDb,
  mapRowToInquiry
} from './lib/supabase';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'polestar_cs_inquiries_live_clean_v1';

export default function App() {
  const [inquiries, setInquiries] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load inquiries from localStorage", e);
    }
    return initialInquiries;
  });

  const [currentUser, setCurrentUser] = useState({
    name: "Aarti Sharma",
    role: "Senior CS Executive",
    avatar: "AS"
  });

  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dbLoading, setDbLoading] = useState(isSupabaseConfigured);

  // Modals
  const [intakeModalOpen, setIntakeModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [quickQuoteModalOpen, setQuickQuoteModalOpen] = useState(false);
  const [quoteInquiryTarget, setQuoteInquiryTarget] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Initial Load from Supabase Live DB
  useEffect(() => {
    async function loadLiveData() {
      if (isSupabaseConfigured) {
        setDbLoading(true);
        const liveData = await fetchInquiriesDb();
        if (liveData !== null) {
          setInquiries(liveData);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(liveData));
        }
        setDbLoading(false);
      }
    }
    loadLiveData();
  }, []);

  // 2. Real-time Database Sync Subscription
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inquiries' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newInq = mapRowToInquiry(payload.new);
            setInquiries(prev => {
              if (prev.some(i => i.id === newInq.id)) return prev;
              return [newInq, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedInq = mapRowToInquiry(payload.new);
            setInquiries(prev => prev.map(i => i.id === updatedInq.id ? updatedInq : i));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setInquiries(prev => prev.filter(i => i.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. LocalStorage persistence cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inquiries));
    } catch (e) {
      console.error("Failed to save inquiries to localStorage", e);
    }
  }, [inquiries]);

  // Filtered inquiries
  const filteredInquiries = useMemo(() => {
    return inquiries.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        item.id.toLowerCase().includes(q) ||
        (item.shipperName && item.shipperName.toLowerCase().includes(q)) ||
        (item.gstin && item.gstin.toLowerCase().includes(q)) ||
        (item.pol && item.pol.toLowerCase().includes(q)) ||
        (item.pod && item.pod.toLowerCase().includes(q)) ||
        (item.commodity && item.commodity.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [inquiries, searchTerm, statusFilter]);

  // Handlers with Live Supabase Sync
  const handleSaveInquiry = async (newInquiry) => {
    if (!newInquiry || newInquiry.isIrrelevant) {
      showToast("Cannot ingest irrelevant or non-freight email", "error");
      return;
    }

    // Optimistic UI update
    setInquiries(prev => [newInquiry, ...prev]);
    showToast(`Inquiry ${newInquiry.id} logged!`, 'success');

    // Sync to Supabase Database
    if (isSupabaseConfigured) {
      await createInquiryDb(newInquiry);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    let updatedItem = null;
    setInquiries(prev => prev.map(item => {
      if (item.id === id) {
        const auditEntry = {
          timestamp: new Date().toISOString(),
          action: `Status updated to ${newStatus}`,
          by: currentUser.name
        };
        const updated = {
          ...item,
          status: newStatus,
          isQuoted: newStatus === 'QUOTED_REPLIED' || newStatus === 'BOOKING_WON' ? true : item.isQuoted,
          hasReplied: newStatus === 'QUOTED_REPLIED' || newStatus === 'BOOKING_WON' ? true : item.hasReplied,
          auditLog: [...(item.auditLog || []), auditEntry]
        };
        updatedItem = updated;
        if (selectedInquiry?.id === id) {
          setSelectedInquiry(updated);
        }
        return updated;
      }
      return item;
    }));

    showToast(`Status updated to ${newStatus}`, 'info');

    // Sync to Supabase Database
    if (isSupabaseConfigured && updatedItem) {
      await updateInquiryDb(id, updatedItem);
    }
  };

  const handleSaveUpdates = async (updatedInquiry) => {
    setInquiries(prev => prev.map(item => item.id === updatedInquiry.id ? updatedInquiry : item));
    if (selectedInquiry?.id === updatedInquiry.id) {
      setSelectedInquiry(updatedInquiry);
    }
    showToast(`Inquiry ${updatedInquiry.id} updated!`, 'success');

    // Sync to Supabase Database
    if (isSupabaseConfigured) {
      await updateInquiryDb(updatedInquiry.id, updatedInquiry);
    }
  };

  const handleDeleteInquiry = async (id) => {
    if (window.confirm(`Delete inquiry ${id}?`)) {
      setInquiries(prev => prev.filter(item => item.id !== id));
      if (selectedInquiry?.id === id) setSelectedInquiry(null);
      showToast(`Deleted ${id}`, 'info');

      // Sync to Supabase Database
      if (isSupabaseConfigured) {
        await deleteInquiryDb(id);
      }
    }
  };

  const handleViewDetails = (item) => {
    setSelectedInquiry(item);
    setDetailModalOpen(true);
  };

  const handleOpenQuickQuote = (item) => {
    setQuoteInquiryTarget(item);
    setQuickQuoteModalOpen(true);
  };

  const handleSaveQuote = async (updatedItem) => {
    setInquiries(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    showToast(`Quote recorded for ${updatedItem.id}!`, 'success');

    // Sync to Supabase Database
    if (isSupabaseConfigured) {
      await updateInquiryDb(updatedItem.id, updatedItem);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
  };

  const handleClearAllInquiries = async () => {
    if (window.confirm("Clear all inquiries in sheet?")) {
      setInquiries([]);
      setSelectedInquiry(null);
      showToast("All inquiries cleared", "info");

      // Sync to Supabase Database
      if (isSupabaseConfigured) {
        await clearAllInquiriesDb();
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080605] text-[#f5f5f5] antialiased font-sans">
      
      {/* Top Header */}
      <Header
        onOpenIntake={() => setIntakeModalOpen(true)}
        onOpenExport={() => setExportModalOpen(true)}
        inquiriesCount={inquiries.length}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        isLiveDb={isSupabaseConfigured}
      />

      {/* Main High-Density Workspace */}
      <main className="flex-1 px-4 py-3 space-y-3 max-w-7xl w-full mx-auto">
        
        {/* Simple Control & KPI Strip */}
        <MetricsBar
          inquiries={inquiries}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onResetFilters={handleResetFilters}
          onClearAll={handleClearAllInquiries}
        />

        {/* Clean Data Table */}
        <InquiryTable
          inquiries={filteredInquiries}
          onUpdateStatus={handleUpdateStatus}
          onViewDetails={handleViewDetails}
          onQuickQuote={handleOpenQuickQuote}
          onDeleteInquiry={handleDeleteInquiry}
          onOpenIntake={() => setIntakeModalOpen(true)}
        />

      </main>

      {/* Footer */}
      <footer className="px-4 py-2 border-t border-[#1c1715] bg-[#080605] flex items-center justify-between text-[10px] text-slate-500 max-w-7xl w-full mx-auto">
        <div>POLESTAR SHIPPING • CUSTOMER SERVICE LIVE INQUIRY PORTAL</div>
        <div className="font-mono text-slate-500">FRESA ERP INTEGRATED • SCMTR COMPLIANT</div>
      </footer>

      {/* MODALS */}
      <InquiryIntakeModal
        isOpen={intakeModalOpen}
        onClose={() => setIntakeModalOpen(false)}
        onSaveInquiry={handleSaveInquiry}
        currentUser={currentUser}
      />

      <InquiryDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        inquiry={selectedInquiry}
        onUpdateStatus={handleUpdateStatus}
        onSaveUpdates={handleSaveUpdates}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        inquiries={inquiries}
        currentUser={currentUser}
      />

      <QuickQuoteModal
        isOpen={quickQuoteModalOpen}
        onClose={() => setQuickQuoteModalOpen(false)}
        inquiry={quoteInquiryTarget}
        onSaveQuote={handleSaveQuote}
        currentUser={currentUser}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-fadeIn">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#120f0e] border border-[#FFA08C] text-[11px] font-bold text-white shadow-[0_0_18px_rgba(255,160,140,0.4)]">
            {toast.type === 'success' ? <CheckCircle2 size={14} className="text-emerald-400" /> : <AlertCircle size={14} className="text-[#FFA08C]" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
}
