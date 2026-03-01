'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Game {
  id: string;
  venue: string;
  date_time: string;
  format: string;
  players_needed: number;
  organiser_name: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  area?: string;
  games_played: number;
  games_confirmed: number;
  no_shows: number;
}

export default function AdminPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'games' | 'users'>('games');
  const { user, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.email !== 'kyle@dropoutrescue.co.uk') {
      alert('Admin access required');
      router.replace('/dashboard/games');
    } else if (token) {
      fetchData();
    }
  }, [user, token]);

  const fetchData = async () => {
    try {
      const [gamesRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/games`),
        axios.get(`${API_URL}/admin/users?token=${token}`)
      ]);
      setGames(gamesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (gameId: string, venue: string) => {
    if (!confirm(`Delete "${venue}"?`)) return;

    if (!token) {
      alert('Not authenticated. Please login again.');
      return;
    }

    try {
      await axios.delete(`${API_URL}/games/${gameId}?token=${token}`);
      alert('Game deleted');
      fetchData();
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(error.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Delete user "${userName}"?\n\nThis will also delete:\n- All their game participations\n- All games they organised`)) return;

    if (!token) {
      alert('Not authenticated. Please login again.');
      return;
    }

    try {
      await axios.delete(`${API_URL}/admin/users/${userId}?token=${token}`);
      alert('User deleted');
      fetchData();
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  // Helper for reliability badge
  const getReliabilityBadge = (gamesPlayed: number) => {
    if (gamesPlayed === 0) return { emoji: '🔵', label: 'New' };
    if (gamesPlayed <= 5) return { emoji: '🟡', label: 'Getting Started' };
    return { emoji: '🟢', label: 'Regular' };
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('games')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'games' 
              ? 'bg-cyan-400 text-black' 
              : 'bg-zinc-800 text-gray-400 hover:text-white'
          }`}
        >
          Games ({games.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'users' 
              ? 'bg-cyan-400 text-black' 
              : 'bg-zinc-800 text-gray-400 hover:text-white'
          }`}
        >
          Users ({users.length})
        </button>
      </div>

      {/* Games Tab */}
      {activeTab === 'games' && (
        <>
          {games.length === 0 ? (
            <p className="text-center text-gray-400 py-20">No games to manage</p>
          ) : (
            <div className="space-y-3">
              {games.map((game) => (
                <div key={game.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold">{game.venue}</h3>
                    <p className="text-sm text-gray-400">by {game.organiser_name}</p>
                    <p className="text-sm text-gray-500">{game.format} • {game.players_needed} needed</p>
                  </div>
                  <button
                    onClick={() => handleDelete(game.id, game.venue)}
                    className="bg-red-500/10 border-2 border-red-500 text-red-500 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <>
          {users.length === 0 ? (
            <p className="text-center text-gray-400 py-20">No users</p>
          ) : (
            <div className="space-y-3">
              {users.map((u) => {
                const badge = getReliabilityBadge(u.games_played || 0);
                const isAdmin = u.email === 'kyle@dropoutrescue.co.uk';
                return (
                  <div key={u.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{badge.emoji}</span>
                        <h3 className="text-white font-bold">{u.name}</h3>
                        {isAdmin && <span className="text-xs bg-cyan-400 text-black px-2 py-0.5 rounded">Admin</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{badge.label}</span>
                        {!isAdmin && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="text-red-400 hover:text-red-300 text-xs font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{u.email}</p>
                    {u.area && <p className="text-xs text-gray-500 mb-2">Area: {u.area}</p>}
                    <div className="flex gap-4 text-xs">
                      <div className="bg-zinc-800 px-3 py-1 rounded">
                        <span className="text-gray-400">Played: </span>
                        <span className="text-white font-bold">{u.games_played || 0}</span>
                      </div>
                      <div className="bg-zinc-800 px-3 py-1 rounded">
                        <span className="text-gray-400">Confirmed: </span>
                        <span className="text-green-400 font-bold">{u.games_confirmed || 0}</span>
                      </div>
                      <div className="bg-zinc-800 px-3 py-1 rounded">
                        <span className="text-gray-400">No-shows: </span>
                        <span className="text-red-400 font-bold">{u.no_shows || 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
