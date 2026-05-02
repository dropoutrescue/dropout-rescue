'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (token) {
      fetchNotificationCount();
      const interval = setInterval(fetchNotificationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchNotificationCount = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/notifications/count?token=${token}`);
      setNotificationCount(res.data.count);
    } catch {}
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  const isActive = (path: string) => pathname === path;

  const mobileNavCls = (path: string) =>
    isActive(path)
      ? 'text-[var(--primary)]'
      : 'text-[var(--text-3)] hover:text-[var(--text-2)]';

  const sidebarCls = (path: string) =>
    isActive(path)
      ? 'block px-4 py-2.5 rounded-control bg-[var(--primary)]/10 text-[var(--primary)] font-bold border border-[var(--primary)]/20'
      : 'block px-4 py-2.5 rounded-control text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors';

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20 md:pb-0">
      {/* Mobile top header */}
      <header className="fixed top-0 left-0 right-0 bg-[var(--bg)] border-b border-[var(--border)] md:hidden z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Dropout Rescue" width={26} height={26} className="rounded-control" />
            <span className="text-[var(--text)] font-bold text-sm tracking-tight">Dropout Rescue</span>
          </div>
          <Link href="/dashboard/notifications" className="relative p-2">
            <svg className="w-5 h-5 text-[var(--text-2)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notificationCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-[var(--danger)] text-[var(--text)] microlabel rounded-full w-4 h-4 flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] md:hidden z-50">
        <div className="flex justify-around items-center h-16">
          {[
            { href: '/dashboard/games',    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', label: 'Find' },
            { href: '/dashboard/create',   icon: 'M12 4v16m8-8H4',                               label: 'Create' },
            { href: '/dashboard/my-games', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'My Games' },
            { href: '/dashboard/profile',  icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Profile' },
          ].map(({ href, icon, label }) => (
            <Link key={href} href={href} className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${mobileNavCls(href)}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
              </svg>
              <span className="microlabel">{label}</span>
            </Link>
          ))}
          {user.email === 'kyle@dropoutrescue.co.uk' && (
            <Link href="/dashboard/admin" className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${mobileNavCls('/dashboard/admin')}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="microlabel">Admin</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 flex-col bg-[var(--surface)] border-r border-[var(--border)] p-5">
        <div className="flex items-center gap-3 mb-8">
          <Image src="/logo.png" alt="Dropout Rescue" width={36} height={36} className="rounded-control" />
          <div>
            <p className="text-[var(--text)] font-extrabold tracking-tight text-sm leading-none">Dropout Rescue</p>
            <p className="text-[var(--text-3)] text-xs mt-0.5">{user.name}</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {[
            { href: '/dashboard/games',    label: 'Find games' },
            { href: '/dashboard/create',   label: 'Create game' },
            { href: '/dashboard/my-games', label: 'My games' },
            { href: '/dashboard/profile',  label: 'Profile' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className={sidebarCls(href)}>{label}</Link>
          ))}
          {user.email === 'kyle@dropoutrescue.co.uk' && (
            <Link href="/dashboard/admin" className={sidebarCls('/dashboard/admin')}>Admin</Link>
          )}
        </nav>
      </aside>

      <main className="md:ml-60 pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
