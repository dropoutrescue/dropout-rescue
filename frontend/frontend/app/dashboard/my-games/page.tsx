'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import axios from 'axios';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Game {
  id: string;
  organiser_id: string;
  venue: string;
  date_time: string;
  players_needed: number;
  format: string;
}

interface JoinedGame {
  id: string;
  venue: string;
  date_time: string;
  format: string;
  players_needed: number;
  organiser_name: string;
  status: string; // REQUESTED, CONFIRMED, RESERVE
}

export default function MyGamesPage() {
  const [tab, setTab] = useState<'created' | 'joined'>('created');
  const [createdGames, setCreatedGames] = useState<Game[]>([]);
  const [joinedGames, setJoinedGames] = useState<JoinedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuth();

  useEffect(() => {
    if (token) {
      fetchMyGames();
    }
  }, [token]);

  const fetchMyGames = async () => {
    try {
      // Fetch all games
      const gamesResponse = await axios.get(`${API_URL}/games`);
      const allGames: Game[] = gamesResponse.data;
      
      // Games I created
      const created = allGames.filter(g => g.organiser_id === user?.id);
      setCreatedGames(created);

      // Fetch games I joined
      if (token) {
        const joinedResponse = await axios.get(`${API_URL}/my-games/joined?token=${token}`);
        setJoinedGames(joinedResponse.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div></div>;
  }

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Convert format shorthand to full text (e.g., "5s" -> "5-a-side")
  const formatGameType = (format: string) => {
    const match = format.match(/^(\d+)s?$/i);
    if (match) {
      return `${match[1]}-a-side`;
    }
    return format;
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return { bg: 'bg-green-500/20', text: 'text-green-500', label: 'CONFIRMED' };
      case 'RESERVE':
        return { bg: 'bg-cyan-400/20', text: 'text-cyan-400', label: 'RESERVE' };
      case 'REQUESTED':
      default:
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-500', label: 'PENDING' };
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-white mb-6">My Games</h1>

      <div className="flex gap-2 mb-6 border-b border-zinc-800">
        <button
          onClick={() => setTab('created')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            tab === 'created'
              ? 'text-cyan-400 border-cyan-400'
              : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          Created ({createdGames.length})
        </button>
        <button
          onClick={() => setTab('joined')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            tab === 'joined'
              ? 'text-cyan-400 border-cyan-400'
              : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          Joined ({joinedGames.length})
        </button>
      </div>

      {tab === 'created' && (
        <>
          {createdGames.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400">No games created yet</p>
              <p className="text-gray-600 text-sm mt-2">Tap Create to post your first game</p>
            </div>
          ) : (
            <div className="space-y-3">
              {createdGames.map(game => (
                <Link
                  key={game.id}
                  href={`/dashboard/games/${game.id}`}
                  className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-cyan-400 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-white font-bold">{game.venue}</h3>
                    <span className="bg-yellow-500/20 text-yellow-500 text-xs font-bold px-2 py-1 rounded">ORGANISER</span>
                  </div>
                  <p className="text-sm text-gray-400">{formatDateTime(game.date_time)}</p>
                  <p className="text-sm text-cyan-400 mt-2">{formatGameType(game.format)} • {game.players_needed} needed</p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'joined' && (
        <>
          {joinedGames.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400">No games joined yet</p>
              <p className="text-gray-600 text-sm mt-2">Find games and request a spot to play</p>
            </div>
          ) : (
            <div className="space-y-3">
              {joinedGames.map(game => {
                const badge = getStatusBadge(game.status);
                return (
                  <Link
                    key={game.id}
                    href={`/dashboard/games/${game.id}`}
                    className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-cyan-400 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-white font-bold">{game.venue}</h3>
                      <span className={`${badge.bg} ${badge.text} text-xs font-bold px-2 py-1 rounded`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{formatDateTime(game.date_time)}</p>
                    <p className="text-sm text-gray-500 mt-1">by {game.organiser_name}</p>
                    <p className="text-sm text-cyan-400 mt-2">{formatGameType(game.format)}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
