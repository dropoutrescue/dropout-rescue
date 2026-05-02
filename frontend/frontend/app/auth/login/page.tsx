'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard/games');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-[14px] py-3 text-[15px] bg-[var(--surface)] border border-[var(--border-2)] rounded-control text-[var(--text)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors';

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Dropout Rescue" width={200} height={200} className="mx-auto mb-4" />
          <p className="text-[var(--text-2)] text-sm">Built for local football. Powered by the community.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/40 text-[var(--danger)] px-4 py-3 rounded-control text-sm">
              {error}
            </div>
          )}

          <input type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} className={inputCls} />

          <input type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} className={inputCls} />

          <button type="submit" disabled={loading}
            className="w-full bg-[var(--primary)] text-black font-extrabold uppercase tracking-[0.1em] py-[11px] rounded-control hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? 'Logging in…' : 'Log in'}
          </button>

          <p className="text-center text-[var(--text-2)] text-sm pt-1">
            No account?{' '}
            <Link href="/auth/signup" className="text-[var(--primary)] font-bold hover:opacity-80">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
