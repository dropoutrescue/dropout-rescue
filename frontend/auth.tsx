'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  // Fetch notification count periodically
  useEffect(() => {
    if (token) {
      fetchNotificationCount();
      const interval = setInterval(fetchNotificationCount, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchNotificationCount = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/notifications/count?token=${token}`);
      setNotificationCount(res.data.count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen bg-zinc-950 pb-20 md:pb-0">
      {/* Mobile Top Header with Logo + Notifications */}
      <header className="fixed top-0 left-0 right-0 bg-zinc-950 border-b border-zinc-800 md:hidden z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Dropout Rescue" width={28} height={28} className="rounded" />
            <span className="text-white font-bold text-sm">Dropout Rescue</span>
          </div>
          <Link href="/dashboard/notifications" className="relative p-2">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notificationCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 md:hidden z-50">
        <div className="flex justify-around items-center h-16">
          <Link
            href="/dashboard/games"
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              isActive('/dashboard/games') ? 'text-cyan-400' : 'text-gray-500'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs mt-1">Find</span>
          </Link>

          <Link
            href="/dashboard/create"
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              isActive('/dashboard/create') ? 'text-cyan-400' : 'text-gray-500'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs mt-1">Create</span>
          </Link>

          <Link
            href="/dashboard/my-games"
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              isActive('/dashboard/my-games') ? 'text-cyan-400' : 'text-gray-500'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1">My Games</span>
          </Link>

          <Link
            href="/dashboard/profile"
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              isActive('/dashboard/profile') ? 'text-cyan-400' : 'text-gray-500'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs mt-1">Profile</span>
          </Link>

          {user.email === 'kyle@dropoutrescue.co.uk' && (
            <Link
              href="/dashboard/admin"
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                isActive('/dashboard/admin') ? 'text-cyan-400' : 'text-gray-500'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-xs mt-1">Admin</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 bottom-0 w-64 bg-zinc-900 border-r border-zinc-800 p-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Image src="/logo.png" alt="Dropout Rescue" width={40} height={40} className="rounded" />
            <h1 className="text-xl font-bold text-white">Dropout Rescue</h1>
          </div>
          <p className="text-sm text-gray-400">{user.name}</p>
        </div>

        <nav className="space-y-2">
          <Link
            href="/dashboard/games"
            className={`block px-4 py-3 rounded-lg transition-colors ${
              isActive('/dashboard/games')
                ? 'bg-cyan-400 text-black font-semibold'
                : 'text-gray-400 hover:bg-zinc-800'
            }`}
          >
            Find Games
          </Link>

          <Link
            href="/dashboard/create"
            className={`block px-4 py-3 rounded-lg transition-colors ${
              isActive('/dashboard/create')
                ? 'bg-cyan-400 text-black font-semibold'
                : 'text-gray-400 hover:bg-zinc-800'
            }`}
          >
            Create Game
          </Link>

          <Link
            href="/dashboard/my-games"
            className={`block px-4 py-3 rounded-lg transition-colors ${
              isActive('/dashboard/my-games')
                ? 'bg-cyan-400 text-black font-semibold'
                : 'text-gray-400 hover:bg-zinc-800'
            }`}
          >
            My Games
          </Link>

          <Link
            href="/dashboard/profile"
            className={`block px-4 py-3 rounded-lg transition-colors ${
              isActive('/dashboard/profile')
                ? 'bg-cyan-400 text-black font-semibold'
                : 'text-gray-400 hover:bg-zinc-800'
            }`}
          >
            Profile
          </Link>

          {user.email === 'kyle@dropoutrescue.co.uk' && (
            <Link
              href="/dashboard/admin"
              className={`block px-4 py-3 rounded-lg transition-colors ${
                isActive('/dashboard/admin')
                  ? 'bg-cyan-400 text-black font-semibold'
                  : 'text-gray-400 hover:bg-zinc-800'
              }`}
            >
              Admin
            </Link>
          )}
        </nav>
      </aside>

      {/* Main Content - pt-14 for mobile header space */}
      <main className="md:ml-64 pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
