import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Header from './components/Header';
import MetricsBar from './components/MetricsBar';
import InquiryTable from './components/InquiryTable';
import EmailIntakeModal from './components/EmailIntakeModal';
import InquiryDetailModal from './components/InquiryDetailModal';
import ExportModal from './components/ExportModal';
import ReplyComposerModal from './components/ReplyComposerModal';
import ReplyReminderPopup from './components/ReplyReminderPopup';
import useReplyReminders from './hooks/useReplyReminders';
import useDbSync from './hooks/useDbSync';
import ConfirmBookingModal from './components/ConfirmBookingModal';
import NominationSheet from './components/NominationSheet';
import AddNominationModal from './components/AddNominationModal';
import MyDay from './components/MyDay';
import FollowUps from './components/FollowUps';
import WeeklyPlan from './components/WeeklyPlan';
import { fetchPlan, savePlan, deletePlan } from './lib/plans';
import Sidebar from './components/Sidebar';
import TeamReport from './components/TeamReport';
import FollowUpModal from './components/FollowUpModal';
import useFollowUpAlerts from './hooks/useFollowUpAlerts';
import { isAwaitingReply } from './hooks/useReplyReminders';
import { fetchIsManager, syncProfileDb, fetchTargets, saveTargetDb, weekKey } from './lib/team';
import { cbmProgress, weekRange } from './utils/teamReport';
import { getNominations, dayKey } from './utils/nominations';
import { userKey, readUserItem } from './utils/userStorage';
import { initialInquiries } from './data/mockInquiries';
import { 
  supabase, 
  isSupabaseConfigured, 
  fetchInquiriesDb, 
  clearAllInquiriesDb,
  mapRowToInquiry
} from './lib/supabase';
import { CheckCircle2, AlertCircle, CloudOff, RefreshCw } from 'lucide-react';

const STORAGE_KEY = 'polestar_cs_inquiries_live_clean_v1';

export default function App({ currentUser, onSignOut, onEditProfile }) {
  const [inquiries, setInquiries] = useState(() => {
    try {
      const saved = readUserItem(STORAGE_KEY, currentUser.id);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load inquiries from localStorage", e);
    }
    return initialInquiries;
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
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [addNominationOpen, setAddNominationOpen] = useState(false);
  const [followUpTarget, setFollowUpTarget] = useState(null);
  const [view, setView] = useState('myday');
  const [isManager, setIsManager] = useState(false);
  const [targets, setTargets] = useState([]);
  const [plans, setPlans] = useState({}); // weekStart -> plan, null = none, missing = not loaded

  const { now, dueInquiries, dismissAll, dismissOne } = useReplyReminders(inquiries);
  const followUps = useFollowUpAlerts(inquiries, now, currentUser.id);
  const progress = useMemo(() => cbmProgress(inquiries, targets, currentUser.id, weekRange(now)), [inquiries, targets, currentUser.id, now]);
  const myDayCount = inquiries.filter(isAwaitingReply).length + followUps.due.length + followUps.cold.length;
  const todaysNominations = useMemo(
    () => getNominations(inquiries).filter(n => dayKey(n.confirmedAt) === dayKey(now)).length,
    [inquiries, now]
  );

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Database saves: failures are queued and retried instead of being lost.
  const inquiriesRef = useRef(inquiries);
  inquiriesRef.current = inquiries;
  const getInquiry = useCallback((id) => inquiriesRef.current.find(i => i.id === id), []);
  const onSaveFailed = useCallback(() => {
    setToast({ message: "Couldn't save to the database. Kept on this device and will retry.", type: 'error' });
    setTimeout(() => setToast(null), 5000);
  }, []);
  const { pendingCount, pendingRef, syncing, persist, persistDelete, flush } = useDbSync(getInquiry, onSaveFailed, currentUser.id);

  // 1. Initial Load from Supabase Live DB
  useEffect(() => {
    async function loadLiveData() {
      if (isSupabaseConfigured) {
        setDbLoading(true);
        const liveData = await fetchInquiriesDb(currentUser.id);
        if (liveData !== null) {
          const { upserts, deletes } = pendingRef.current;
          setInquiries(prev => {
            const local = new Map(prev.map(i => [i.id, i]));
            const merged = liveData
              .filter(i => !deletes.includes(i.id))
              .map(i => upserts.includes(i.id) && local.has(i.id) ? local.get(i.id) : { ...(local.get(i.id) || {}), ...i });
            const unsyncedNew = prev.filter(i => upserts.includes(i.id) && !liveData.some(d => d.id === i.id));
            return [...unsyncedNew, ...merged];
          });
          flush();
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
          // Managers can read every rep's rows; this workspace shows only the rep's own.
          const ownerId = (payload.new && payload.new.owner_id) || payload.old?.owner_id;
          if (ownerId && ownerId !== currentUser.id) return;
          if (payload.eventType === 'INSERT') {
            const newInq = mapRowToInquiry(payload.new);
            setInquiries(prev => {
              if (prev.some(i => i.id === newInq.id)) return prev;
              return [newInq, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedInq = mapRowToInquiry(payload.new);
            setInquiries(prev => prev.map(i => i.id === updatedInq.id ? { ...i, ...updatedInq } : i));
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

  // Weekly plans from the VP. A ref keeps quick successive ticks from overwriting each other.
  const plansRef = useRef(plans);
  const setPlanState = (weekStart, plan) => {
    plansRef.current = { ...plansRef.current, [weekStart]: plan };
    setPlans(plansRef.current);
  };
  const loadPlan = useCallback(async (weekStart) => {
    const plan = await fetchPlan(currentUser.id, weekStart);
    setPlanState(weekStart, plan);
    return plan;
  }, [currentUser.id]);
  const handleSavePlan = async (plan) => {
    setPlanState(plan.weekStart, plan);
    const err = await savePlan(currentUser.id, plan);
    if (err) showToast(`Plan kept on this device; couldn't save to the database (${err})`, 'error');
  };
  const handleChangePlan = (weekStart, fn) => {
    const current = plansRef.current[weekStart];
    if (current) handleSavePlan(fn(current));
  };
  const handleDeletePlan = async (weekStart) => {
    setPlanState(weekStart, null);
    const err = await deletePlan(currentUser.id, weekStart);
    if (err) showToast(`Couldn't remove the plan from the database (${err})`, 'error');
  };
  const currentWeek = weekKey(new Date(now));
  const thisWeekPlan = plans[currentWeek];
  const todayPlanLeft = (() => {
    const d = thisWeekPlan?.days.find(x => x.date === dayKey(new Date(now)));
    return d ? d.items.filter(i => !i.done).length : 0;
  })();
  useEffect(() => { if (!(currentWeek in plansRef.current)) loadPlan(currentWeek); }, [currentWeek, loadPlan]);

  // Profile (so managers see the rep's name), manager access, weekly targets.
  useEffect(() => {
    if (isSupabaseConfigured) {
      syncProfileDb(currentUser);
      fetchIsManager().then(setIsManager);
    }
    fetchTargets(currentUser.id).then(setTargets);
  }, [currentUser.id, currentUser.name, currentUser.role]);

  // 3. LocalStorage persistence cache
  useEffect(() => {
    try {
      localStorage.setItem(userKey(STORAGE_KEY, currentUser.id), JSON.stringify(inquiries));
    } catch (e) {
      console.error("Failed to save inquiries to localStorage", e);
      if (!isSupabaseConfigured) {
        setToast({ message: "Couldn't save on this device (browser storage is full or blocked). Back up your data now.", type: 'error' });
      }
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
  const handleSaveInquiry = async (newInquiry, { openComposer = true } = {}) => {
    if (!newInquiry || newInquiry.isIrrelevant) {
      showToast("Cannot ingest irrelevant or non-freight email", "error");
      return;
    }

    // Optimistic UI update
    setInquiries(prev => [newInquiry, ...prev]);
    if (openComposer) {
      showToast(`Inquiry ${newInquiry.id} logged – draft the reply now`, 'success');
      handleOpenQuickQuote(newInquiry);
    } else {
      showToast(`Inquiry ${newInquiry.id} logged`, 'success');
    }

    // Sync to Supabase Database
    persist(newInquiry);
  };

  // Full copy of every inquiry as a JSON file the rep can keep.
  const handleBackup = () => {
    const blob = new Blob([JSON.stringify({ app: 'polestar-cs-hub', version: 1, exportedAt: new Date().toISOString(), inquiries }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polestar-backup-${dayKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Backed up ${inquiries.length} inquiries`, 'success');
  };

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let restored;
    try {
      const data = JSON.parse(await file.text());
      restored = Array.isArray(data) ? data : data.inquiries;
      if (!Array.isArray(restored) || restored.some(i => !i || typeof i.id !== 'string')) throw new Error('bad format');
    } catch {
      showToast("That file isn't a valid Polestar backup", 'error');
      return;
    }
    const existingIds = new Set(inquiries.map(i => i.id));
    const replaced = restored.filter(i => existingIds.has(i.id)).length;
    if (!window.confirm(`Restore ${restored.length} inquiries from this backup?\n\n${restored.length - replaced} will be added and ${replaced} existing ones will be replaced with the backup version. Inquiries not in the backup are kept.`)) return;
    const byId = new Map(restored.map(i => [i.id, i]));
    setInquiries(prev => [...restored.filter(i => !existingIds.has(i.id)), ...prev.map(i => byId.get(i.id) || i)]);
    restored.forEach(persist);
    showToast(`Restored ${restored.length} inquiries`, 'success');
  };

  // Inline edits from the nomination sheet (booking no., carrier, ETD, ...).
  const handleEditNomination = (inquiry, patch) => {
    const field = Object.keys(patch)[0];
    handleUpdateInquiry({
      ...inquiry,
      nomination: { ...(inquiry.nomination || {}), ...patch },
      auditLog: [...(inquiry.auditLog || []), {
        timestamp: new Date().toISOString(),
        action: `Nomination sheet edited: ${field} = ${patch[field] || '(blank)'}`,
        by: currentUser.name
      }]
    }, `${inquiry.id} nomination updated`);
  };

  // Generic save for changes made from the email reader (replies, declines).
  const handleUpdateInquiry = async (updatedItem, message) => {
    setInquiries(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
    if (selectedInquiry?.id === updatedItem.id) setSelectedInquiry(updatedItem);
    showToast(message || `${updatedItem.id} updated`, 'success');

    persist(updatedItem);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    const item = inquiries.find(i => i.id === id);
    if (!item) return;

    // A confirmed booking needs its final details for the nomination sheet.
    if (newStatus === 'BOOKING_WON') {
      setDetailModalOpen(false);
      setConfirmTarget(item);
      return;
    }

    const isReplied = newStatus === 'QUOTED_REPLIED';
    const updatedItem = {
      ...item,
      status: newStatus,
      isQuoted: isReplied ? true : item.isQuoted,
      hasReplied: isReplied ? true : item.hasReplied,
      repliedAt: isReplied && !item.repliedAt ? new Date().toISOString() : item.repliedAt,
      auditLog: [...(item.auditLog || []), {
        timestamp: new Date().toISOString(),
        action: `Status updated to ${newStatus}`,
        by: currentUser.name
      }]
    };

    setInquiries(prev => prev.map(i => i.id === id ? updatedItem : i));
    if (selectedInquiry?.id === id) setSelectedInquiry(updatedItem);
    showToast(`Status updated to ${newStatus}`, 'info');

    // Sync to Supabase Database
    persist(updatedItem);
  };

  const handleConfirmBooking = async (updatedItem) => {
    setInquiries(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
    if (selectedInquiry?.id === updatedItem.id) setSelectedInquiry(updatedItem);
    showToast(`${updatedItem.id} confirmed – added to nomination sheet`, 'success');

    persist(updatedItem);
  };

  const handleSaveUpdates = async (updatedInquiry) => {
    setInquiries(prev => prev.map(item => item.id === updatedInquiry.id ? updatedInquiry : item));
    if (selectedInquiry?.id === updatedInquiry.id) {
      setSelectedInquiry(updatedInquiry);
    }
    showToast(`Inquiry ${updatedInquiry.id} updated!`, 'success');

    // Sync to Supabase Database
    persist(updatedInquiry);
  };

  const handleDeleteInquiry = async (id) => {
    if (window.confirm(`Delete inquiry ${id}?`)) {
      setInquiries(prev => prev.filter(item => item.id !== id));
      if (selectedInquiry?.id === id) setSelectedInquiry(null);
      showToast(`Deleted ${id}`, 'info');

      // Sync to Supabase Database
      persistDelete(id);
    }
  };

  const handleCloseLost = (inquiry) => {
    if (!window.confirm(`Close ${inquiry.id} (${inquiry.shipperName}) as lost: no response from the customer?`)) return;
    handleUpdateInquiry({
      ...inquiry,
      status: 'CLOSED_LOST',
      lostReason: 'No response from customer',
      auditLog: [...(inquiry.auditLog || []), {
        timestamp: new Date().toISOString(),
        action: `Closed as lost: no response after ${(inquiry.followUps || []).length} follow-ups`,
        by: currentUser.name
      }]
    }, `${inquiry.id} closed as lost`);
  };

  // For now each rep sets their own target after agreeing it with the VP in person.
  const canEditTarget = true;
  const handleSetTarget = async (cbm, week = weekKey(new Date())) => {
    const err = await saveTargetDb(currentUser.id, week, cbm, currentUser.name);
    if (err) {
      showToast(`Couldn't save the target: ${err}`, 'error');
      return false;
    }
    setTargets(prev => [...prev.filter(t => !(t.repId === currentUser.id && t.weekStart === week)), { repId: currentUser.id, weekStart: week, targetCbm: cbm, setBy: currentUser.name }]);
    showToast(`Weekly target set to ${cbm} CBM (week of ${new Date(`${week}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })})`, "success");
    return true;
  };

  const handleViewDetails = (item) => {
    setSelectedInquiry(item);
    setDetailModalOpen(true);
  };

  const handleOpenQuickQuote = (item) => {
    dismissOne(item.id);
    setDetailModalOpen(false);
    setQuoteInquiryTarget(item);
    setQuickQuoteModalOpen(true);
  };

  const handleSaveQuote = async (updatedItem) => {
    setInquiries(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    if (selectedInquiry?.id === updatedItem.id) setSelectedInquiry(updatedItem);
    showToast(`Reply sent – ${updatedItem.id} marked Quoted & Replied`, 'success');

    // Sync to Supabase Database
    persist(updatedItem);
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
      if (isSupabaseConfigured && !(await clearAllInquiriesDb())) {
        showToast("Couldn't clear the database. Other devices will still show these inquiries.", 'error');
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#080605] text-[#f5f5f5] antialiased font-sans">
      
      {/* Top Header */}
      <Header
        onOpenIntake={() => setIntakeModalOpen(true)}
        currentUser={currentUser}
        onSignOut={onSignOut}
        onEditProfile={onEditProfile}
      />

      <div className="flex-1 flex min-h-0">
      <Sidebar
        view={view}
        setView={setView}
        counts={{ myday: myDayCount, plan: todayPlanLeft, followups: followUps.due.length + followUps.cold.length, inquiries: inquiries.length, nominations: todaysNominations }}
        isManager={isManager}
        inquiriesCount={inquiries.length}
        onExport={() => setExportModalOpen(true)}
        onBackup={handleBackup}
        onRestore={handleRestore}
      />

      {/* Main High-Density Workspace */}
      <div className="flex-1 min-w-0 min-h-0 overflow-y-auto">
      <main className="px-4 py-3 space-y-3 max-w-7xl w-full mx-auto">
        
        {pendingCount > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-amber-400/60 bg-[rgba(251,191,36,0.08)]">
            <span className="flex items-center gap-2 text-sm font-bold text-amber-300">
              <CloudOff size={16} />
              {pendingCount} change{pendingCount === 1 ? '' : 's'} not saved to the database yet. They're kept on this device and retried every minute.
            </span>
            <button onClick={flush} disabled={syncing} className="btn-dark text-sm disabled:opacity-50">
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Retrying…' : 'Retry now'}</span>
            </button>
          </div>
        )}

        {view === 'myday' ? (
          <MyDay
            inquiries={inquiries}
            now={now}
            followUps={followUps}
            progress={progress}
            canEditTarget={canEditTarget}
            onSetTarget={handleSetTarget}
            onReply={handleOpenQuickQuote}
            onFollowUp={setFollowUpTarget}
            onConfirm={(inq) => setConfirmTarget(inq)}
            onCloseLost={handleCloseLost}
            onViewDetails={handleViewDetails}
            plan={thisWeekPlan}
            onChangePlan={handleChangePlan}
            onOpenPlan={() => setView('plan')}
          />
        ) : view === 'plan' ? (
          <WeeklyPlan
            plans={plans}
            loadPlan={loadPlan}
            onSavePlan={handleSavePlan}
            onChangePlan={handleChangePlan}
            onDeletePlan={handleDeletePlan}
            now={now}
            notify={(msg) => showToast(msg, 'success')}
            inquiries={inquiries}
            targets={targets}
            currentUser={currentUser}
            onSetTarget={handleSetTarget}
          />
        ) : view === 'followups' ? (
          <FollowUps
            inquiries={inquiries}
            now={now}
            followUps={followUps}
            onFollowUp={setFollowUpTarget}
            onCloseLost={handleCloseLost}
            onViewDetails={handleViewDetails}
          />
        ) : view === 'team' && isManager ? (
          <TeamReport currentUser={currentUser} now={now} />
        ) : view === 'inquiries' ? (
          <>
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
              now={now}
            />
          </>
        ) : (
          <NominationSheet
            inquiries={inquiries}
            onViewDetails={handleViewDetails}
            onAddNomination={() => setAddNominationOpen(true)}
            onEditNomination={handleEditNomination}
            currentUser={currentUser}
          />
        )}

      </main>
      </div>
      </div>

      {/* MODALS */}
      <EmailIntakeModal
        isOpen={intakeModalOpen}
        onClose={() => setIntakeModalOpen(false)}
        inquiries={inquiries}
        currentUser={currentUser}
        onCreateInquiry={handleSaveInquiry}
        onUpdateInquiry={handleUpdateInquiry}
        onOpenComposer={handleOpenQuickQuote}
        onOpenConfirm={(prefilled) => setConfirmTarget(prefilled)}
      />

      <InquiryDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        inquiry={selectedInquiry}
        onUpdateStatus={handleUpdateStatus}
        onSaveUpdates={handleSaveUpdates}
        onOpenReply={handleOpenQuickQuote}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        inquiries={inquiries}
        currentUser={currentUser}
      />

      <ReplyComposerModal
        isOpen={quickQuoteModalOpen}
        onClose={() => setQuickQuoteModalOpen(false)}
        inquiry={quoteInquiryTarget}
        onSendReply={handleSaveQuote}
        currentUser={currentUser}
      />

      <AddNominationModal
        isOpen={addNominationOpen}
        onClose={() => setAddNominationOpen(false)}
        inquiries={inquiries}
        onConvert={(inq) => { setAddNominationOpen(false); setConfirmTarget(inq); }}
        onPasteEmail={() => { setAddNominationOpen(false); setIntakeModalOpen(true); }}
      />

      <ConfirmBookingModal
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        inquiry={confirmTarget}
        onConfirm={handleConfirmBooking}
        currentUser={currentUser}
      />

      <FollowUpModal
        isOpen={Boolean(followUpTarget)}
        onClose={() => setFollowUpTarget(null)}
        inquiry={followUpTarget}
        onMarkSent={handleUpdateInquiry}
        onCloseLost={handleCloseLost}
        currentUser={currentUser}
      />

      {/* 30-minute unreplied inquiry reminders */}
      {!quickQuoteModalOpen && !intakeModalOpen && !confirmTarget && !addNominationOpen && !followUpTarget && (
        <ReplyReminderPopup
          inquiries={dueInquiries}
          now={now}
          onReply={handleOpenQuickQuote}
          onDismiss={dismissAll}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-fadeIn">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#120f0e] border border-[#FFA08C] text-[13.5px] font-bold text-white shadow-[0_0_18px_rgba(255,160,140,0.4)]">
            {toast.type === 'success' ? <CheckCircle2 size={14} className="text-emerald-400" /> : <AlertCircle size={14} className="text-[#FFA08C]" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
}
