'use client';

import { useState, useEffect, use } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PublicGame {
  id: string; venue: string; date_time: string; format: string;
  players_needed: number; status: string; confirmed_count: number; organiser_name: string;
}

const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} at ${hh}:${mm}`;
};

const formatGameType = (format: string) => {
  const match = format.match(/^(\d+)s?$/i);
  return match ? `${match[1]}-a-side` : format;
};

export default function JoinPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);

  const [game, setGame] = useState<PublicGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [withdrawInfo, setWithdrawInfo] = useState<{ participantId: string; token: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/public/games/${gameId}`)
      .then(res => setGame(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [gameId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanPhone = phone.replace(/\s+/g, '');
    if (!name.trim()) { setError('Name is required'); return; }
    if (!/^(\+44|0)\d{10}$/.test(cleanPhone)) {
      setError('Enter a valid UK phone number (e.g. 07700 900000)');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/public/games/${gameId}/quick-join`, { name: name.trim(), phone: cleanPhone });
      setWithdrawInfo({ participantId: res.data.participant_id, token: res.data.withdraw_token });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (notFound || !game) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <p className="text-[var(--text-2)]">Game not found</p>
      </div>
    );
  }

  if (game.status !== 'OPEN') {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 text-center">
        <div>
          <p className="text-[var(--danger)] text-xl font-extrabold tracking-tight mb-1">This game is full</p>
          <p className="text-[var(--text-2)] text-sm">No spots available right now</p>
        </div>
      </div>
    );
  }

  const organiserFirstName = game.organiser_name.split(' ')[0];
  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border-2)] text-[var(--text)] rounded-control px-4 py-3 focus:border-[var(--primary)] focus:outline-none transition-colors placeholder:text-[var(--text-3)]';
  const labelCls = 'text-[var(--text-2)] text-xs font-bold uppercase tracking-widest block mb-1.5';

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-md mx-auto p-4 pt-10">
        <div className="text-center mb-8">
          <p className="microlabel text-[var(--primary)]">Dropout Rescue</p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-5 mb-5">
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--text)] mb-1">{game.venue}</h1>
          <p className="text-[var(--primary)] text-sm font-medium mb-4">{formatDateTime(game.date_time)}</p>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[var(--bg)] rounded-control p-3 text-center border border-[var(--border)]">
              <p className="microlabel text-[var(--text-3)] mb-1">Format</p>
              <p className="text-[var(--text)] font-bold text-sm">{formatGameType(game.format)}</p>
            </div>
            <div className="bg-[var(--bg)] rounded-control p-3 text-center border border-[var(--border)]">
              <p className="microlabel text-[var(--text-3)] mb-1">Spots left</p>
              <p className="text-[var(--primary)] font-bold tabular-nums">{game.players_needed}</p>
            </div>
            <div className="bg-[var(--bg)] rounded-control p-3 text-center border border-[var(--border)]">
              <p className="microlabel text-[var(--text-3)] mb-1">Organiser</p>
              <p className="text-[var(--text)] font-bold text-sm">{organiserFirstName}</p>
            </div>
          </div>
        </div>

        {success ? (
          <div className="rounded-card p-6 border"
            style={{ background: 'var(--primary-tint)', borderColor: 'var(--primary-dim)' }}>
            <p className="text-[var(--primary)] text-xl font-extrabold tracking-tight mb-2 text-center">Request sent ✓</p>
            <p className="text-[var(--text-2)] text-sm text-center mb-4">
              {organiserFirstName} will message you on WhatsApp when you're confirmed.
            </p>
            {withdrawInfo && (
              <div className="bg-[var(--bg)] border border-[var(--border-2)] rounded-control p-3">
                <p className="text-[var(--text-2)] text-xs mb-2">Can't make it later?</p>
                <a href={`/leave/${withdrawInfo.participantId}?t=${withdrawInfo.token}`}
                  className="text-[var(--primary)] text-sm font-medium hover:opacity-80 transition-opacity block mb-2">
                  Use this link to remove yourself →
                </a>
                <p className="text-[var(--text-3)] text-xs">Save this link — you'll need it if you can't make it.</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className={labelCls}>Your name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="First and last name" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Your phone (WhatsApp)</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="07700 900000" required className={inputCls} />
              <p className="text-[var(--text-3)] text-xs mt-1">The organiser will WhatsApp you if you're confirmed</p>
            </div>

            {error && <p className="text-[var(--danger)] text-sm">{error}</p>}

            <button type="submit" disabled={submitting}
              className="w-full bg-[var(--primary)] text-black font-extrabold uppercase tracking-[0.1em] py-[11px] rounded-control hover:opacity-90 transition-opacity disabled:opacity-50">
              {submitting ? 'Sending…' : 'Request to join'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
