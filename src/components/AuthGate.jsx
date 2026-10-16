import React, { useState, useEffect } from 'react';
import { Sparkles, Mail, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const LOCAL_PROFILE_KEY = 'polestar_local_profile_v1';

function initials(name) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function toUser({ name, role, email }) {
  return { name, role, email, avatar: initials(name) };
}

function loadLocalProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(LOCAL_PROFILE_KEY));
    return p?.name ? p : null;
  } catch {
    return null;
  }
}

function Shell({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#080605]">
      <div className="w-full max-w-md rounded-2xl border border-[#FFA08C]/50 bg-[#0d0b0a] shadow-[0_0_30px_rgba(255,160,140,0.2)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#342b27] bg-[#110e0d] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFA08C] flex items-center justify-center"><Sparkles size={17} className="text-[#0d0b0a]" /></div>
          <div>
            <div className="font-extrabold text-[16px] tracking-wider text-white">POLESTAR <span className="text-[#FFA08C]">SHIPPING</span></div>
            <div className="text-[12px] text-[#dcd2cd] font-semibold tracking-wider">CS INQUIRY & OPERATIONS DESK</div>
          </div>
        </div>
        <div className="p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function Notice({ type, children }) {
  const ok = type === 'ok';
  return (
    <div className={`p-3 rounded-xl text-sm font-bold flex items-start gap-2 border ${ok ? 'border-emerald-500/50 bg-[rgba(16,185,129,0.08)] text-emerald-300' : 'border-[#f87171]/60 bg-[rgba(248,113,113,0.1)] text-[#fca5a5]'}`}>
      {ok ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
      <span>{children}</span>
    </div>
  );
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const signInWithPassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setMessage({ type: 'error', text: error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message });
    setBusy(false);
  };

  const sendLink = async () => {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Enter your work email first.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    });
    setMessage(error
      ? { type: 'error', text: /signups not allowed|not found/i.test(error.message) ? "This email doesn't have an account. Ask your admin to add you." : error.message }
      : { type: 'ok', text: `Sign-in link sent to ${email.trim()}. Open it on this device.` });
    setBusy(false);
  };

  return (
    <Shell>
      <div className="text-[17px] font-extrabold text-white">Sign in</div>
      {message && <Notice type={message.type}>{message.text}</Notice>}
      <form onSubmit={signInWithPassword} className="space-y-3">
        <label className="block">
          <span className="text-[12.5px] font-extrabold text-[#dcd2cd] block mb-1">Work email</span>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3a59e]" />
            <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="scm-input w-full !pl-9" autoComplete="email" />
          </div>
        </label>
        <label className="block">
          <span className="text-[12.5px] font-extrabold text-[#dcd2cd] block mb-1">Password</span>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3a59e]" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="scm-input w-full !pl-9" autoComplete="current-password" />
          </div>
        </label>
        <button type="submit" disabled={busy} className="btn-coral w-full justify-center disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <button onClick={sendLink} disabled={busy} className="btn-dark w-full justify-center disabled:opacity-50">Email me a sign-in link instead</button>
      <div className="text-[12.5px] text-[#b3a59e]">Accounts are created by your admin. If you forgot your password, use the sign-in link.</div>
    </Shell>
  );
}

function ProfileSetup({ initial, onSave, note }) {
  const [name, setName] = useState(initial?.name || '');
  const [role, setRole] = useState(initial?.role || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    const err = await onSave({ name: name.trim(), role: role.trim() });
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <Shell>
      <div className="text-[17px] font-extrabold text-white">{initial?.name ? 'Edit your details' : 'Welcome! Tell us who you are'}</div>
      <div className="text-sm text-[#dcd2cd]">Your name goes on replies, the nomination sheet and reports.</div>
      {note && <Notice type="error">{note}</Notice>}
      {error && <Notice type="error">{error}</Notice>}
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="text-[12.5px] font-extrabold text-[#dcd2cd] block mb-1">Full name</span>
          <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} className="scm-input w-full" placeholder="e.g. Aarti Sharma" />
        </label>
        <label className="block">
          <span className="text-[12.5px] font-extrabold text-[#dcd2cd] block mb-1">Role</span>
          <input value={role} onChange={(e) => setRole(e.target.value)} className="scm-input w-full" placeholder="e.g. Senior CS Executive" />
        </label>
        <button type="submit" disabled={busy || !name.trim()} className="btn-coral w-full justify-center disabled:opacity-50">{busy ? 'Saving…' : 'Continue'}</button>
      </form>
    </Shell>
  );
}

// Decides who is using the app before it renders.
// With Supabase: reps sign in, and their name/role live on their account.
// Without Supabase: no accounts exist, so the rep just enters their name on this device.
export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [localProfile, setLocalProfile] = useState(loadLocalProfile);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s || null));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    const saveLocal = async (p) => {
      try {
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(p));
      } catch {}
      setLocalProfile(p);
      setEditing(false);
    };
    if (!localProfile || editing) {
      return <ProfileSetup initial={localProfile} onSave={saveLocal} note={!localProfile ? 'No database is connected, so there are no logins: everything is saved in this browser only.' : null} />;
    }
    return children(toUser(localProfile), { onEditProfile: () => setEditing(true), onSignOut: null });
  }

  if (session === undefined) {
    return <div className="min-h-screen flex items-center justify-center bg-[#080605] text-[#dcd2cd] font-bold">Loading…</div>;
  }
  if (!session) return <SignIn />;

  const meta = session.user.user_metadata || {};
  const profile = { name: meta.full_name || '', role: meta.role || '', email: session.user.email };
  const saveRemote = async (p) => {
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: p.name, role: p.role } });
    if (error) return error.message;
    setSession(s => ({ ...s, user: data.user }));
    setEditing(false);
    return null;
  };
  if (!profile.name || editing) return <ProfileSetup initial={profile.name ? profile : null} onSave={saveRemote} />;

  return children(toUser(profile), {
    onEditProfile: () => setEditing(true),
    onSignOut: () => supabase.auth.signOut(),
  });
}
