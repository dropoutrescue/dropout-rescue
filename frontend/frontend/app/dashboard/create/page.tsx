'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function CreateGamePage() {
  const [formData, setFormData] = useState({
    venue: '',
    date: '',
    time: '',
    players_needed: '',
    format: '5s',
    subs: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.venue || !formData.date || !formData.time || !formData.players_needed) {
      setError('Please fill in all required fields');
      return;
    }

    const playersNum = parseInt(formData.players_needed);
    if (isNaN(playersNum) || playersNum < 1) {
      setError('Please enter a valid number of players');
      return;
    }

    setLoading(true);
    try {
      const dateTimeString = `${formData.date}T${formData.time}:00`;
      const dateTime = new Date(dateTimeString);

      await axios.post(
        `${API_URL}/games`,
        {
          venue: formData.venue,
          date_time: dateTime.toISOString(),
          players_needed: playersNum,
          format: formData.format,
          subs: formData.subs ? parseFloat(formData.subs) : null,
          notes: formData.notes || null,
        },
        { params: { token } }
      );

      alert('Game created successfully!');
      router.push('/dashboard/games');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="text-center mb-8">
        <p className="text-4xl mb-4">⚽</p>
        <h1 className="text-2xl font-bold text-white">Create Game</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm text-gray-400 mb-2">Venue *</label>
          <input
            type="text"
            placeholder="e.g., Goals Nottingham"
            value={formData.venue}
            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              min={getTodayDate()}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Time *</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Players Needed *</label>
          <input
            type="number"
            placeholder="e.g., 6"
            min="1"
            value={formData.players_needed}
            onChange={(e) => setFormData({ ...formData, players_needed: e.target.value })}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Format *</label>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
            {['5s', '6s', '7s', '8s', '9s', '10s', '11s'].map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormData({ ...formData, format: fmt })}
                className={`py-2 rounded-lg font-semibold transition-colors ${
                  formData.format === fmt
                    ? 'bg-cyan-400 text-black'
                    : 'bg-zinc-900 text-gray-400 border border-zinc-800 hover:border-cyan-400'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Subs (£)</label>
          <input
            type="number"
            step="0.01"
            placeholder="e.g., 5"
            value={formData.subs}
            onChange={(e) => setFormData({ ...formData, subs: e.target.value })}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Notes</label>
          <textarea
            placeholder="Any additional info..."
            rows={4}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-cyan-400 text-black font-bold py-4 rounded-lg hover:bg-cyan-500 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Game'}
        </button>
      </form>
    </div>
  );
}