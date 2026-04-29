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

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Dropout Rescue" width={200} height={200} className="mx-auto mb-4" />
          <p className="text-secondary text-sm">Built for local football. Powered by the community.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 rounded-control text-sm">
              {error}
            </div>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-surface border border-white/6 rounded-control text-white placeholder-tertiary focus:outline-none focus:border-phosphor transition-colors"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-surface border border-white/6 rounded-control text-white placeholder-tertiary focus:outline-none focus:border-phosphor transition-colors"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-phosphor text-black font-bold py-3 rounded-control hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>

          <p className="text-center text-secondary text-sm pt-1">
            No account?{' '}
            <Link href="/auth/signup" className="text-phosphor font-bold hover:opacity-80">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
