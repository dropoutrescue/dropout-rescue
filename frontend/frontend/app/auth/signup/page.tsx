'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Image from 'next/image';
import Link from 'next/link';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', area: '', bio: '', phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.name || !formData.email || !formData.password) {
      setError('Name, email and password are required');
      return;
    }
    if (formData.bio && formData.bio.length > 120) {
      setError('Bio must be 120 characters or less');
      return;
    }
    setLoading(true);
    try {
      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        area: formData.area || undefined,
        bio: formData.bio || undefined,
        phone: formData.phone || undefined,
      });
      router.push('/dashboard/games');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const field = (className = '') =>
    `w-full px-[14px] py-3 text-[15px] bg-[var(--surface)] border border-[var(--border-2)] rounded-control text-[var(--text)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors ${className}`;

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Image src="/logo.png" alt="Dropout Rescue" width={150} height={150} className="mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">Create account</h1>
          <p className="text-[var(--text-2)] text-sm mt-1">Join the football community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/40 text-[var(--danger)] px-4 py-3 rounded-control text-sm">
              {error}
            </div>
          )}

          <input type="text"     placeholder="Name *"      value={formData.name}     onChange={(e) => setFormData({...formData, name: e.target.value})}     className={field()} />
          <input type="email"    placeholder="Email *"     value={formData.email}    onChange={(e) => setFormData({...formData, email: e.target.value})}    className={field()} />
          <input type="password" placeholder="Password *"  value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className={field()} />
          <input type="text"     placeholder="Area (e.g. Arnold, City Centre)" value={formData.area} onChange={(e) => setFormData({...formData, area: e.target.value})} className={field()} />

          <div>
            <input type="text" placeholder="Short bio (e.g. Happy to sub midweek)"
              value={formData.bio} maxLength={120}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              className={field()} />
            <p className="text-[var(--text-3)] text-xs mt-1 text-right">{formData.bio.length}/120</p>
          </div>

          <input type="tel" placeholder="Phone (optional)" value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})} className={field()} />

          <button type="submit" disabled={loading}
            className="w-full bg-[var(--primary)] text-black font-extrabold uppercase tracking-[0.1em] py-[11px] rounded-control hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? 'Creating…' : 'Sign up'}
          </button>

          <p className="text-center text-[var(--text-2)] text-sm pt-1">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[var(--primary)] font-bold hover:opacity-80">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
