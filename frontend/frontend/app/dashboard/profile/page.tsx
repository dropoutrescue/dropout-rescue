'use client';

import { useAuth } from '@/lib/auth';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const handleResetSession = () => {
    if (confirm('This will clear ALL app data and reload. Use this if you\'re stuck logged in.\n\n⚠️ Continue?')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/auth/login';
    }
  };

  // Get reliability badge
  const getReliabilityBadge = (gamesPlayed: number) => {
    if (gamesPlayed === 0) return { emoji: '🔵', label: 'New' };
    if (gamesPlayed <= 5) return { emoji: '🟡', label: `Getting Started (${gamesPlayed} games)` };
    return { emoji: '🟢', label: `Regular (${gamesPlayed} games)` };
  };

  if (!user) return null;

  const badge = getReliabilityBadge(user.games_played || 0);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="text-center mb-8">
        <div className="w-24 h-24 bg-zinc-900 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-cyan-400">
          <svg className="w-12 h-12 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">{user.name}</h1>
        <p className="text-gray-400">{user.email}</p>
        
        {/* Reliability Badge */}
        <div className="mt-3 inline-flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-full">
          <span className="text-lg">{badge.emoji}</span>
          <span className="text-sm text-gray-300">{badge.label}</span>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-4">About</h2>
        
        <div className="space-y-4">
          {user.area && (
            <div className="flex justify-between">
              <span className="text-gray-400">Area</span>
              <span className="text-white font-semibold">{user.area}</span>
            </div>
          )}
          {user.bio && (
            <div>
              <span className="text-gray-400 block mb-1">Bio</span>
              <p className="text-white">{user.bio}</p>
            </div>
          )}
          {user.phone && (
            <div className="flex justify-between">
              <span className="text-gray-400">Phone</span>
              <span className="text-white font-semibold">{user.phone}</span>
            </div>
          )}
          {!user.area && !user.bio && !user.phone && (
            <p className="text-gray-500 text-sm italic">No additional info added</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white">Account Actions</h2>
        
        <button
          onClick={handleLogout}
          className="w-full bg-red-500 text-white font-bold py-3 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Log Out
        </button>

        <button
          onClick={handleResetSession}
          className="w-full bg-zinc-800 text-yellow-500 border border-yellow-500/50 font-semibold py-3 rounded-lg hover:bg-yellow-500/10 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Force Reset (if stuck)
        </button>
      </div>
    </div>
  );
}
