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

  useEffect(() => {
    fetchGames();
  }, []);

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
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} • ${hours}:${minutes}`;
  };

  const formatUrgentTime = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    if (date.toDateString() === today.toDateString()) {
      return `Today • ${hours}:${minutes}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow • ${hours}:${minutes}`;
    }
    return `${hours}:${minutes}`;
  };

  // Convert format shorthand to full text (e.g., "5s" -> "5-a-side")
  const formatGameType = (format: string) => {
    const match = format.match(/^(\d+)s?$/i);
    if (match) {
      return `${match[1]}-a-side`;
    }
    return format;
  };

  // Check if a game is today
  const isToday = (isoString: string) => {
    const gameDate = new Date(isoString);
    const today = new Date();
    return gameDate.toDateString() === today.toDateString();
  };

  // Filter and sort games
  const now = new Date();
  
  // Urgent: Today's games with players needed > 0, sorted by kickoff time
  const urgentGames = games
    .filter(game => isToday(game.date_time) && game.players_needed > 0 && new Date(game.date_time) > now)
    .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());

  // Upcoming: Future games (not today), sorted by date
  const upcomingGames = games
    .filter(game => !isToday(game.date_time) && new Date(game.date_time) > now)
    .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  const GameCard = ({ game, urgent = false }: { game: Game; urgent?: boolean }) => (
    <Link
      href={`/dashboard/games/${game.id}`}
      className={`block rounded-lg p-5 transition-colors ${
        urgent 
          ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-2 border-orange-500 hover:border-orange-400' 
          : 'bg-zinc-900 border border-zinc-800 hover:border-cyan-400'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-bold text-white">{game.venue}</h3>
        {urgent ? (
          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
            {formatUrgentTime(game.date_time)}
          </span>
        ) : game.status === 'FULL' ? (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            FULL
          </span>
        ) : null}
      </div>

      {!urgent && (
        <p className="text-gray-400 text-sm mb-3">{formatDateTime(game.date_time)}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm">
          <span className="text-cyan-400">{formatGameType(game.format)}</span>
          {game.subs && <span className="text-gray-400">£{game.subs}</span>}
        </div>
        
        <div className={`flex items-center gap-1 font-bold ${
          urgent ? 'text-orange-400' : game.players_needed > 0 ? 'text-cyan-400' : 'text-gray-500'
        }`}>
          <span className="text-2xl">{game.players_needed}</span>
          <span className="text-xs">needed</span>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Find Games</h1>
        <button
          onClick={fetchGames}
          className="text-cyan-400 hover:text-cyan-300 text-sm"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Urgent Section - Today's Games */}
      {urgentGames.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔥</span>
            <h2 className="text-lg font-bold text-orange-400">Urgent – Need Players Today</h2>
          </div>
          <div className="space-y-3">
            {urgentGames.map((game) => (
              <GameCard key={game.id} game={game} urgent />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">📅</span>
          <h2 className="text-lg font-bold text-white">Upcoming Games</h2>
        </div>
        
        {upcomingGames.length === 0 && urgentGames.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">⚽</p>
            <p className="text-gray-400 text-lg">No games available</p>
            <p className="text-gray-600 text-sm mt-2">Create one to get started!</p>
          </div>
        ) : upcomingGames.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No upcoming games scheduled</p>
        ) : (
          <div className="space-y-3">
            {upcomingGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
