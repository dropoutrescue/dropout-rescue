'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function CreateGamePage() {
  const [formData, setFormData] = useState({
    venue: '', date: '', time: '', players_needed: '', format: '5s', subs: '', notes: '',
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
    if (isNaN(playersNum) || playersNum < 1) { setError('Enter a valid number of players'); return; }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/games`,
        {
          venue: formData.venue,
          date_time: new Date(`${formData.date}T${formData.time}:00`).toISOString(),
          players_needed: playersNum,
          format: formData.format,
          subs: formData.subs ? parseFloat(formData.subs) : null,
          notes: formData.notes || null,
        },
        { params: { token } }
      );
      router.push('/dashboard/games');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 bg-surface border border-white/6 rounded-control text-white placeholder-tertiary focus:outline-none focus:border-phosphor transition-colors';
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-extrabold tracking-tight text-white mb-6">Create game</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 rounded-control text-sm">{error}</div>
        )}

        <div>
          <label className="block text-secondary text-xs font-bold uppercase tracking-widest mb-2">Venue *</label>
          <input type="text" placeholder="e.g. Goals Nottingham" value={formData.venue}
            onChange={(e) => setFormData({ ...formData, venue: e.target.value })} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-secondary text-xs font-bold uppercase tracking-widest mb-2">Date *</label>
            <input type="date" value={formData.date} min={getTodayDate()}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-secondary text-xs font-bold uppercase tracking-widest mb-2">Time *</label>
            <input type="time" value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-secondary text-xs font-bold uppercase tracking-widest mb-2">Players needed *</label>
          <input type="number" placeholder="e.g. 6" min="1" value={formData.players_needed}
            onChange={(e) => setFormData({ ...formData, players_needed: e.target.value })} className={inputCls} />
        </div>

        <div>
          <label className="block text-secondary text-xs font-bold uppercase tracking-widest mb-2">Format *</label>
          <div className="grid grid-cols-7 gap-1.5">
            {['5s', '6s', '7s', '8s', '9s', '10s', '11s'].map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormData({ ...formData, format: fmt })}
                className={`py-2.5 rounded-control text-sm font-bold transition-colors ${
                  formData.format === fmt
                    ? 'bg-phosphor text-black'
                    : 'bg-surface border border-white/6 text-secondary hover:border-white/20'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-secondary text-xs font-bold uppercase tracking-widest mb-2">Subs (£)</label>
          <input type="number" step="0.01" placeholder="e.g. 5" value={formData.subs}
            onChange={(e) => setFormData({ ...formData, subs: e.target.value })} className={inputCls} />
        </div>

        <div>
          <label className="block text-secondary text-xs font-bold uppercase tracking-widest mb-2">Notes</label>
          <textarea placeholder="Any additional info…" rows={3} value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className={`${inputCls} resize-none`} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-phosphor text-black font-bold py-3.5 rounded-control hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create game'}
        </button>
      </form>
    </div>
  );
}
