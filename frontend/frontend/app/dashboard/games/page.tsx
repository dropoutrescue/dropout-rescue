'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Game {
  id: string;
  venue: string;
  date_time: string;
  players_needed: number;
  format: string;
  subs?: number;
  notes?: string;
  status: string;
}

export default function FindGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchGames(); }, []);

  const fetchGames = async () => {
    try {
      const response = await axios.get(`${API_URL}/games`);
      setGames(response.data);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} · ${hours}:${minutes}`;
  };

  const formatUrgentTime = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    if (date.toDateString() === today.toDateString()) return `Today · ${hh}:${mm}`;
    if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow · ${hh}:${mm}`;
    return `${hh}:${mm}`;
  };

  const formatGameType = (format: string) => {
    const match = format.match(/^(\d+)s?$/i);
    return match ? `${match[1]}-a-side` : format;
  };

  const isToday = (isoString: string) => new Date(isoString).toDateString() === new Date().toDateString();
  const now = new Date();

  const urgentGames = games
    .filter(g => isToday(g.date_time) && g.players_needed > 0 && new Date(g.date_time) > now)
    .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());

  const upcomingGames = games
    .filter(g => !isToday(g.date_time) && new Date(g.date_time) > now)
    .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-phosphor"></div>
      </div>
    );
  }

  const GameCard = ({ game, urgent = false }: { game: Game; urgent?: boolean }) => (
    <Link
      href={`/dashboard/games/${game.id}`}
      className={`block rounded-card p-5 border transition-colors ${
        urgent
          ? 'bg-warn/8 border-warn/40 hover:border-warn'
          : 'bg-surface border-white/6 hover:border-white/20'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-base font-bold text-white tracking-tight">{game.venue}</h3>
        {urgent ? (
          <span className="microlabel bg-warn/20 text-warn px-2 py-1 rounded-control animate-pulse">
            {formatUrgentTime(game.date_time)}
          </span>
        ) : game.status === 'FULL' ? (
          <span className="microlabel bg-red-500/15 text-red-400 px-2 py-1 rounded-control">Full</span>
        ) : null}
      </div>

      {!urgent && (
        <p className="text-secondary text-sm mb-3">{formatDateTime(game.date_time)}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm">
          <span className="text-phosphor font-medium">{formatGameType(game.format)}</span>
          {game.subs && <span className="text-secondary">£{game.subs}</span>}
        </div>
        <div className={`flex items-baseline gap-1 font-bold tabular-nums ${
          urgent ? 'text-warn' : game.players_needed > 0 ? 'text-phosphor' : 'text-tertiary'
        }`}>
          <span className="text-2xl">{game.players_needed}</span>
          <span className="microlabel text-current opacity-70">needed</span>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Find games</h1>
        <button onClick={fetchGames} className="text-secondary hover:text-white text-sm transition-colors">↻ Refresh</button>
      </div>

      {urgentGames.length > 0 && (
        <section className="mb-8">
          <p className="microlabel text-warn mb-3">Urgent — need players today</p>
          <div className="space-y-2">
            {urgentGames.map(game => <GameCard key={game.id} game={game} urgent />)}
          </div>
        </section>
      )}

      <section>
        <p className="microlabel text-secondary mb-3">Upcoming games</p>
        {upcomingGames.length === 0 && urgentGames.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">⚽</p>
            <p className="text-secondary">No games available</p>
            <p className="text-tertiary text-sm mt-1">Create one to get started</p>
          </div>
        ) : upcomingGames.length === 0 ? (
          <p className="text-tertiary text-sm text-center py-8">No upcoming games scheduled</p>
        ) : (
          <div className="space-y-2">
            {upcomingGames.map(game => <GameCard key={game.id} game={game} />)}
          </div>
        )}
      </section>
    </div>
  );
}
