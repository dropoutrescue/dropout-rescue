'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    area: user?.area || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
  });

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) logout();
  };

  const handleResetSession = () => {
    if (confirm('This will clear ALL app data and reload.\n\n⚠️ Continue?')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/auth/login';
    }
  };

  const handleEdit = () => {
    setForm({ name: user?.name || '', area: user?.area || '', bio: user?.bio || '', phone: user?.phone || '' });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      setEditing(false);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const getReliabilityBadge = (gamesPlayed: number) => {
    if (gamesPlayed === 0) return { emoji: '🔵', label: 'New' };
    if (gamesPlayed <= 5) return { emoji: '🟡', label: `Getting started (${gamesPlayed} games)` };
    return { emoji: '🟢', label: `Regular (${gamesPlayed} games)` };
  };

  if (!user) return null;

  const badge = getReliabilityBadge(user.games_played || 0);
  const inputCls = 'w-full bg-bg border border-white/6 text-white rounded-control px-3 py-2 focus:border-phosphor focus:outline-none transition-colors';

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-surface rounded-full mx-auto mb-4 flex items-center justify-center border border-white/10">
          <svg className="w-10 h-10 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{user.name}</h1>
        <p className="text-secondary text-sm mt-1">{user.email}</p>
        <div className="mt-3 inline-flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-control border border-white/6">
          <span>{badge.emoji}</span>
          <span className="text-secondary text-sm">{badge.label}</span>
        </div>
      </div>

      <div className="bg-surface border border-white/6 rounded-card p-5 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-bold">About</h2>
          {!editing && (
            <button onClick={handleEdit} className="text-phosphor text-sm font-medium hover:opacity-80 transition-opacity">Edit</button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-secondary text-xs font-bold uppercase tracking-widest block mb-1">Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-secondary text-xs font-bold uppercase tracking-widest block mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="07700 900000" className={inputCls} />
              <p className="text-tertiary text-xs mt-1">Used so organisers can WhatsApp you when confirmed</p>
            </div>
            <div>
              <label className="text-secondary text-xs font-bold uppercase tracking-widest block mb-1">Area</label>
              <input type="text" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="e.g. Arnold, City Centre" className={inputCls} />
            </div>
            <div>
              <label className="text-secondary text-xs font-bold uppercase tracking-widest block mb-1">
                Bio <span className="text-tertiary normal-case tracking-normal">({form.bio.length}/120)</span>
              </label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value.slice(0, 120) }))}
                rows={3} className={`${inputCls} resize-none`} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-phosphor text-black font-bold py-2 rounded-control hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} disabled={saving}
                className="flex-1 bg-bg border border-white/10 text-white font-medium py-2 rounded-control hover:border-white/20 transition-colors disabled:opacity-50">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {user.phone && (
              <div className="flex justify-between">
                <span className="text-secondary text-sm">Phone</span>
                <span className="text-white font-medium text-sm">{user.phone}</span>
              </div>
            )}
            {user.area && (
              <div className="flex justify-between">
                <span className="text-secondary text-sm">Area</span>
                <span className="text-white font-medium text-sm">{user.area}</span>
              </div>
            )}
            {user.bio && (
              <div>
                <span className="text-secondary text-sm block mb-1">Bio</span>
                <p className="text-white text-sm">{user.bio}</p>
              </div>
            )}
            {!user.area && !user.bio && !user.phone && (
              <p className="text-tertiary text-sm italic">No additional info added</p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <button onClick={handleLogout}
          className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold py-3 rounded-control hover:bg-red-500/15 transition-colors flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Log out
        </button>
        <button onClick={handleResetSession}
          className="w-full bg-surface border border-white/6 text-secondary font-medium py-3 rounded-control hover:border-white/10 transition-colors text-sm">
          Force reset (if stuck)
        </button>
      </div>
    </div>
  );
}
