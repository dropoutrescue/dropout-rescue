'use client';

import { useState, use } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function LeavePage({
  params,
  searchParams,
}: {
  params: Promise<{ participantId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { participantId } = use(params);
  const { t: token } = use(searchParams);

  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLeave = async () => {
    if (!token) {
      setErrorMsg('This link is no longer valid.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      await axios.post(`${API_URL}/public/participants/${participantId}/withdraw`, { token });
      setStatus('done');
    } catch (err: any) {
      if (err.response?.status === 410) {
        setErrorMsg('Please log in to leave this game.');
      } else {
        setErrorMsg('This link is no longer valid.');
      }
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="microlabel text-[var(--primary)]">Dropout Rescue</p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6 text-center">
          {status === 'done' ? (
            <>
              <p className="text-[var(--text)] text-xl font-extrabold tracking-tight mb-2">Done</p>
              <p className="text-[var(--text-2)] text-sm">Thanks for letting us know.</p>
            </>
          ) : status === 'error' ? (
            <>
              <p className="text-[var(--danger)] text-xl font-extrabold tracking-tight mb-2">Link invalid</p>
              <p className="text-[var(--text-2)] text-sm">{errorMsg}</p>
            </>
          ) : (
            <>
              <p className="text-[var(--text)] font-bold mb-2">Can't make it?</p>
              <p className="text-[var(--text-2)] text-sm mb-6">Tap below to remove yourself from this game.</p>
              <button
                onClick={handleLeave}
                disabled={status === 'loading'}
                className="w-full bg-[var(--primary)] text-black font-extrabold uppercase tracking-[0.1em] py-[11px] rounded-control hover:opacity-90 transition-opacity disabled:opacity-50">
                {status === 'loading' ? 'Removing…' : 'Yes, remove me'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
