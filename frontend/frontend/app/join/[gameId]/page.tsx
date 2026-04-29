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
      await axios.post(`${API_URL}/public/games/${gameId}/quick-join`, { name: name.trim(), phone: cleanPhone });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-phosphor"></div>
      </div>
    );
  }

  if (notFound || !game) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <p className="text-secondary">Game not found</p>
      </div>
    );
  }

  if (game.status !== 'OPEN') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4 text-center">
        <div>
          <p className="text-red-400 text-xl font-extrabold tracking-tight mb-1">This game is full</p>
          <p className="text-secondary text-sm">No spots available right now</p>
        </div>
      </div>
    );
  }

  const organiserFirstName = game.organiser_name.split(' ')[0];
  const inputCls = 'w-full bg-surface border border-white/6 text-white rounded-control px-4 py-3 focus:border-phosphor focus:outline-none transition-colors placeholder:text-tertiary';

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-md mx-auto p-4 pt-10">
        <div className="text-center mb-8">
          <p className="microlabel text-phosphor">Dropout Rescue</p>
        </div>

        <div className="bg-surface border border-white/6 rounded-card p-5 mb-5">
          <h1 className="text-xl font-extrabold tracking-tight text-white mb-1">{game.venue}</h1>
          <p className="text-phosphor text-sm font-medium mb-4">{formatDateTime(game.date_time)}</p>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-bg rounded-control p-3 text-center border border-white/6">
              <p className="microlabel text-tertiary mb-1">Format</p>
              <p className="text-white font-bold text-sm">{formatGameType(game.format)}</p>
            </div>
            <div className="bg-bg rounded-control p-3 text-center border border-white/6">
              <p className="microlabel text-tertiary mb-1">Spots left</p>
              <p className="text-phosphor font-bold tabular-nums">{game.players_needed}</p>
            </div>
            <div className="bg-bg rounded-control p-3 text-center border border-white/6">
              <p className="microlabel text-tertiary mb-1">Organiser</p>
              <p className="text-white font-bold text-sm">{organiserFirstName}</p>
            </div>
          </div>
        </div>

        {success ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-card p-6 text-center">
            <p className="text-green-400 text-xl font-extrabold tracking-tight mb-2">Request sent ✓</p>
            <p className="text-secondary text-sm">
              {organiserFirstName} will message you on WhatsApp when you're confirmed.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-secondary text-xs font-bold uppercase tracking-widest block mb-1.5">Your name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="First and last name" required className={inputCls} />
            </div>
            <div>
              <label className="text-secondary text-xs font-bold uppercase tracking-widest block mb-1.5">Your phone (WhatsApp)</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="07700 900000" required className={inputCls} />
              <p className="text-tertiary text-xs mt-1">The organiser will WhatsApp you if you're confirmed</p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" disabled={submitting}
              className="w-full bg-phosphor text-black font-bold py-3.5 rounded-control hover:opacity-90 transition-opacity disabled:opacity-50 text-base">
              {submitting ? 'Sending…' : 'Request to join'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
