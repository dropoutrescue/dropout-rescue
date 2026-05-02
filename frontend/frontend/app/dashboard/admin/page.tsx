'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Game {
  id: string; venue: string; date_time: string; format: string;
  players_needed: number; organiser_name: string;
}
interface AdminUser {
  id: string; name: string; email: string; area?: string;
  games_played: number; games_confirmed: number; no_shows: number;
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
      router.replace('/dashboard/games');
    } else if (token) {
      fetchData();
    }
  }, [user, token]);

  const fetchData = async () => {
    try {
      const [gamesRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/games?token`),
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
    try {
      await axios.delete(`${API_URL}/games/${gameId}?token=${token}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Delete user "${userName}"?\n\nThis will also delete all their participations and games.`)) return;
    try {
      await axios.delete(`${API_URL}/admin/users/${userId}?token=${token}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const tabCls = (active: boolean) =>
    `px-4 py-2 rounded-control text-sm font-bold transition-colors ${
      active
        ? 'bg-[var(--primary)] text-black'
        : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text)]'
    }`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)] mb-6">Admin panel</h1>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab('games')} className={tabCls(activeTab === 'games')}>
          Games ({games.length})
        </button>
        <button onClick={() => setActiveTab('users')} className={tabCls(activeTab === 'users')}>
          Users ({users.length})
        </button>
      </div>

      {activeTab === 'games' && (
        games.length === 0
          ? <p className="text-center text-[var(--text-2)] py-20">No games</p>
          : (
            <div className="space-y-2">
              {games.map(game => (
                <div key={game.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[var(--text)] font-bold">{game.venue}</h3>
                    <p className="text-[var(--text-2)] text-sm">by {game.organiser_name}</p>
                    <p className="text-[var(--text-3)] text-sm">{game.format} · {game.players_needed} needed</p>
                  </div>
                  <button onClick={() => handleDelete(game.id, game.venue)}
                    className="shrink-0 border px-3 py-1.5 rounded-control text-sm hover:bg-[var(--danger)]/5 transition-colors"
                    style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )
      )}

      {activeTab === 'users' && (
        users.length === 0
          ? <p className="text-center text-[var(--text-2)] py-20">No users</p>
          : (
            <div className="space-y-2">
              {users.map(u => {
                const isAdmin = u.email === 'kyle@dropoutrescue.co.uk';
                return (
                  <div key={u.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[var(--text)] font-bold">{u.name}</h3>
                        {isAdmin && (
                          <span className="microlabel px-2 py-0.5 rounded-control"
                            style={{ background: 'rgba(0,255,136,0.15)', color: 'var(--primary)' }}>
                            Admin
                          </span>
                        )}
                      </div>
                      {!isAdmin && (
                        <button onClick={() => handleDeleteUser(u.id, u.name)}
                          className="text-sm hover:opacity-70 transition-opacity"
                          style={{ color: 'var(--danger)' }}>
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="text-[var(--text-2)] text-sm mb-2">{u.email}</p>
                    {u.area && <p className="text-[var(--text-3)] text-xs mb-2">{u.area}</p>}
                    <div className="flex gap-3 text-xs">
                      <span className="bg-[var(--surface-2)] px-2.5 py-1 rounded-control text-[var(--text-2)]">
                        Played <span className="text-[var(--text)] font-bold tabular-nums">{u.games_played || 0}</span>
                      </span>
                      <span className="bg-[var(--surface-2)] px-2.5 py-1 rounded-control text-[var(--text-2)]">
                        Confirmed <span className="font-bold tabular-nums" style={{ color: 'var(--primary)' }}>{u.games_confirmed || 0}</span>
                      </span>
                      <span className="bg-[var(--surface-2)] px-2.5 py-1 rounded-control text-[var(--text-2)]">
                        No-shows <span className="font-bold tabular-nums" style={{ color: 'var(--danger)' }}>{u.no_shows || 0}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
      )}
    </div>
  );
}
