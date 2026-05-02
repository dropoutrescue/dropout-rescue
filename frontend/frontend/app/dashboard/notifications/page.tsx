'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import axios from 'axios';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Notification {
  id: string;
  type: string;
  message: string;
  game_id?: string;
  created_at: string;
  read: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    if (token) fetchNotifications();
  }, [token]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_URL}/notifications?token=${token}`);
      setNotifications(res.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    try {
      await axios.delete(`${API_URL}/notifications?token=${token}`);
      setNotifications([]);
    } catch (error: any) {
      console.error('Error clearing notifications:', error);
    }
  };

  async function markAsRead(id: string) {
    try {
      await axios.post(`${API_URL}/notifications/${id}/read?token=${token}`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  }

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'NEW_REQUEST':      return '🙋';
      case 'NEW_RESERVE':      return '📋';
      case 'PLAYER_WITHDREW':  return '⚠️';
      case 'PROMOTED':         return '🎉';
      default:                 return '📢';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/games" className="text-[var(--text-2)] hover:text-[var(--text)] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">Notifications</h1>
        </div>
        {notifications.length > 0 && (
          <button onClick={handleClearAll} className="text-[var(--text-3)] hover:text-[var(--text-2)] text-sm transition-colors">
            Clear all
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🔔</p>
          <p className="text-[var(--text-2)]">No notifications yet</p>
          <p className="text-[var(--text-3)] text-sm mt-1">You'll be notified when players request spots or can't make it</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} onClick={() => !n.read && markAsRead(n.id)}
              className={`p-4 rounded-card border transition-colors cursor-pointer ${
                n.read
                  ? 'bg-[var(--surface)] border-[var(--border)]'
                  : 'border-[var(--primary-dim)] bg-[var(--primary-tint)]'
              }`}
              style={n.read ? {} : { background: 'var(--primary-tint)', borderColor: 'var(--primary-dim)' }}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{getIcon(n.type)}</span>
                <div className="flex-1">
                  <p className={`text-sm ${n.read ? 'text-[var(--text-2)]' : 'text-[var(--text)] font-medium'}`}>{n.message}</p>
                  <p className="text-xs text-[var(--text-3)] mt-1">{formatTimeAgo(n.created_at)}</p>
                </div>
                {!n.read && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: 'var(--primary)' }}></span>
                )}
              </div>
              {n.game_id && (
                <Link href={`/dashboard/games/${n.game_id}`}
                  className="block mt-2 text-[var(--primary)] text-sm hover:opacity-80 transition-opacity"
                  onClick={(e) => e.stopPropagation()}>
                  View game →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
