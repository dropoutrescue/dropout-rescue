'use client';

import { useState, useEffect, use } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PublicGame {
  id: string;
  venue: string;
  date_time: string;
  format: string;
  players_needed: number;
  status: string;
  confirmed_count: number;
  organiser_name: string;
}

const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} at ${hours}:${minutes}`;
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
      await axios.post(`${API_URL}/public/games/${gameId}/quick-join`, {
        name: name.trim(),
        phone: cleanPhone,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (notFound || !game) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <p className="text-gray-400 text-lg">Game not found</p>
      </div>
    );
  }

  if (game.status !== 'OPEN') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
        <p className="text-red-400 text-xl font-bold mb-2">This game is full</p>
        <p className="text-gray-400">No spots available right now</p>
      </div>
    );
  }

  const organiserFirstName = game.organiser_name.split(' ')[0];

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-md mx-auto p-4 pt-10">
        <div className="text-center mb-8">
          <p className="text-cyan-400 font-bold text-lg tracking-wide">DROPOUT RESCUE</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">{game.venue}</h1>
          <p className="text-cyan-400 font-medium mb-4">{formatDateTime(game.date_time)}</p>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">Format</p>
              <p className="text-white font-bold text-sm">{formatGameType(game.format)}</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">Spots Left</p>
              <p className="text-green-400 font-bold">{game.players_needed}</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">Organiser</p>
              <p className="text-white font-bold text-sm">{organiserFirstName}</p>
            </div>
          </div>
        </div>

        {success ? (
          <div className="bg-green-500/10 border-2 border-green-500 rounded-lg p-6 text-center">
            <p className="text-green-400 text-xl font-bold mb-2">Request sent ✓</p>
            <p className="text-gray-300">
              {organiserFirstName} will message you on WhatsApp when you're confirmed.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="First and last name"
                required
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Your Phone (WhatsApp)</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="07700 900000"
                required
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:border-cyan-400 focus:outline-none"
              />
              <p className="text-gray-500 text-xs mt-1">The organiser will WhatsApp you if you're confirmed</p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-cyan-400 text-black font-bold py-4 rounded-lg hover:bg-cyan-300 transition-colors disabled:opacity-50 text-lg"
            >
              {submitting ? 'Sending...' : 'Request to Join'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
