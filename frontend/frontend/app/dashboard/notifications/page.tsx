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
    if (token) {
      fetchNotifications();
    }
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

  const markAsRead = async (id: string) => {
    try {
      await axios.post(`${API_URL}/notifications/${id}/read?token=${token}`);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'NEW_REQUEST':
        return '🙋';
      case 'NEW_RESERVE':
        return '📋';
      case 'PLAYER_WITHDREW':
        return '⚠️';
      case 'PROMOTED':
        return '🎉';
      default:
        return '📢';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/games" className="text-gray-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🔔</p>
          <p className="text-gray-400">No notifications yet</p>
          <p className="text-gray-600 text-sm mt-2">You'll be notified when players request spots or can't make it</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.read && markAsRead(notification.id)}
              className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                notification.read 
                  ? 'bg-zinc-900 border-zinc-800' 
                  : 'bg-cyan-400/5 border-cyan-400/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                <div className="flex-1">
                  <p className={`${notification.read ? 'text-gray-400' : 'text-white font-medium'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(notification.created_at)}</p>
                </div>
                {!notification.read && (
                  <span className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></span>
                )}
              </div>
              {notification.game_id && (
                <Link 
                  href={`/dashboard/games/${notification.game_id}`}
                  className="block mt-3 text-cyan-400 text-sm hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Game →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
