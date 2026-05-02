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
  confirmed_count: number;
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

  const formatGameType = (format: string) => {
    const match = format.match(/^(\d+)s?$/i);
    return match ? `${match[1]}-a-side` : format;
  };

  const formatUrgentTime = (isoString: string) => {
    const date = new Date(isoString);
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const formatShortDate = (isoString: string) => {
    const date = new Date(isoString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  const GameCard = ({ game, urgent = false }: { game: Game; urgent?: boolean }) => {
    const confirmed = game.confirmed_count || 0;
    const total = confirmed + game.players_needed;
    const isFull = game.status === 'FULL';
    const timeStr = formatUrgentTime(game.date_time);

    const dotColor = isFull ? 'var(--text-3)' : urgent ? 'var(--warn)' : 'var(--primary)';
    const statusLabel = isFull ? 'Full' : urgent ? 'Today' : 'Open';
    const statusTextColor = isFull ? 'text-[var(--text-3)]' : urgent ? 'text-[var(--warn)]' : 'text-[var(--primary)]';

    return (
      <Link
        href={`/dashboard/games/${game.id}`}
        className={`block rounded-card p-4 border transition-colors ${
          urgent
            ? 'bg-[var(--surface)] border-[var(--warn)]/30 hover:border-[var(--warn)]/60'
            : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-2)]'
        }`}
      >
        {/* Status row */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
          <span className={`microlabel ${statusTextColor}`}>{statusLabel}</span>
          {urgent && (
            <span className="ml-auto tabular-nums text-[var(--warn)] text-xs font-bold">{timeStr}</span>
          )}
        </div>

        {/* Venue + time */}
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <h3 className="text-[var(--text)] font-extrabold text-[15px] leading-snug" style={{ letterSpacing: '-0.015em' }}>
            {game.venue}
          </h3>
          {!urgent && (
            <span className="text-[var(--text-2)] tabular-nums text-sm shrink-0">{timeStr}</span>
          )}
        </div>

        {/* Meta */}
        <p className="text-[var(--text-2)] text-xs mb-3">
          {!urgent && `${formatShortDate(game.date_time)} · `}
          {formatGameType(game.format)}
          {game.subs ? ` · £${game.subs}` : ''}
          {total > 0 ? ` · ${confirmed}/${total}` : ''}
        </p>

        {/* Segmented bar */}
        {total > 0 && (
          <div className="flex gap-[3px]">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className="flex-1 h-[4px] rounded-sm"
                style={{ background: i < confirmed ? 'var(--primary)' : 'rgba(255,255,255,0.10)' }} />
            ))}
          </div>
        )}
      </Link>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)]" style={{ letterSpacing: '-0.025em' }}>Find games</h1>
        <button onClick={fetchGames} className="text-[var(--text-3)] hover:text-[var(--text-2)] text-sm transition-colors">↻ Refresh</button>
      </div>

      {urgentGames.length > 0 && (
        <section className="mb-8">
          <p className="microlabel text-[var(--warn)] mb-3">Urgent — need players today</p>
          <div className="space-y-2">
            {urgentGames.map(game => <GameCard key={game.id} game={game} urgent />)}
          </div>
        </section>
      )}

      <section>
        <p className="microlabel text-[var(--text-3)] mb-3">Upcoming games</p>
        {upcomingGames.length === 0 && urgentGames.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">⚽</p>
            <p className="text-[var(--text-2)]">No games available</p>
            <p className="text-[var(--text-3)] text-sm mt-1">Create one to get started</p>
          </div>
        ) : upcomingGames.length === 0 ? (
          <p className="text-[var(--text-3)] text-sm text-center py-8">No upcoming games scheduled</p>
        ) : (
          <div className="space-y-2">
            {upcomingGames.map(game => <GameCard key={game.id} game={game} />)}
          </div>
        )}
      </section>
    </div>
  );
}
