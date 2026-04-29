'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  status: string;
}

export default function MyGamesPage() {
  const [tab, setTab] = useState<'created' | 'joined'>('created');
  const [createdGames, setCreatedGames] = useState<Game[]>([]);
  const [pastCreatedGames, setPastCreatedGames] = useState<Game[]>([]);
  const [joinedGames, setJoinedGames] = useState<JoinedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [repeatingId, setRepeatingId] = useState<string | null>(null);
  const [repeatError, setRepeatError] = useState('');

  const { user, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (token) fetchMyGames();
  }, [token]);

  const isUpcoming = (dateTime: string) => new Date(dateTime) > new Date();

  async function fetchMyGames() {
    try {
      const gamesResponse = await axios.get(`${API_URL}/games`);
      const allGames: Game[] = gamesResponse.data;

      setCreatedGames(allGames.filter(g => g.organiser_id === user?.id && isUpcoming(g.date_time)));
      setPastCreatedGames(
        allGames
          .filter(g => g.organiser_id === user?.id && !isUpcoming(g.date_time))
          .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime())
      );

      if (token) {
        const joinedResponse = await axios.get(`${API_URL}/my-games/joined?token=${token}`);
        setJoinedGames(joinedResponse.data.filter((g: JoinedGame) => isUpcoming(g.date_time)));
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleRepeat = async (gameId: string) => {
    setRepeatingId(gameId);
    setRepeatError('');
    try {
      const res = await axios.post(`${API_URL}/games/${gameId}/repeat?token=${token}`, {});
      router.push(`/dashboard/games/${res.data.id}`);
    } catch (error: any) {
      setRepeatError(error.response?.data?.detail || 'Failed to repost game');
      setRepeatingId(null);
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatGameType = (format: string) => {
    const match = format.match(/^(\d+)s?$/i);
    return match ? `${match[1]}-a-side` : format;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return { bg: 'bg-green-500/20', text: 'text-green-500', label: 'CONFIRMED' };
      case 'RESERVE': return { bg: 'bg-cyan-400/20', text: 'text-cyan-400', label: 'RESERVE' };
      default: return { bg: 'bg-yellow-500/20', text: 'text-yellow-500', label: 'PENDING' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-white mb-6">My Games</h1>

      <div className="flex gap-2 mb-6 border-b border-zinc-800">
        <button
          onClick={() => setTab('created')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            tab === 'created' ? 'text-cyan-400 border-cyan-400' : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          Created ({createdGames.length})
        </button>
        <button
          onClick={() => setTab('joined')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            tab === 'joined' ? 'text-cyan-400 border-cyan-400' : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          Joined ({joinedGames.length})
        </button>
      </div>

      {tab === 'created' && (
        <>
          {createdGames.length === 0 && pastCreatedGames.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400">No games created yet</p>
              <p className="text-gray-600 text-sm mt-2">Tap Create to post your first game</p>
            </div>
          ) : (
            <>
              {createdGames.length > 0 && (
                <div className="space-y-3 mb-8">
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

              {pastCreatedGames.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past Games</h2>
                  {repeatError && <p className="text-red-400 text-sm mb-3">{repeatError}</p>}
                  <div className="space-y-3">
                    {pastCreatedGames.map(game => (
                      <div key={game.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between gap-4">
                        <Link href={`/dashboard/games/${game.id}`} className="flex-1 min-w-0">
                          <h3 className="text-white font-bold truncate">{game.venue}</h3>
                          <p className="text-sm text-gray-500">{formatDateTime(game.date_time)}</p>
                          <p className="text-sm text-gray-600 mt-1">{formatGameType(game.format)}</p>
                        </Link>
                        <button
                          onClick={() => handleRepeat(game.id)}
                          disabled={repeatingId === game.id}
                          className="shrink-0 bg-cyan-400/10 border border-cyan-400/40 text-cyan-400 text-sm font-semibold px-3 py-2 rounded-lg hover:bg-cyan-400/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {repeatingId === game.id ? 'Posting...' : 'Post again'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
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
