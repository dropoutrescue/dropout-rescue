'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import axios from 'axios';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Game {
  id: string; organiser_id: string; venue: string;
  date_time: string; players_needed: number; format: string;
}
interface JoinedGame {
  id: string; venue: string; date_time: string; format: string;
  players_needed: number; organiser_name: string; status: string;
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

  useEffect(() => { if (token) fetchMyGames(); }, [token]);

  const isUpcoming = (dt: string) => new Date(dt) > new Date();

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

  const formatDateTime = (isoString: string) =>
    new Date(isoString).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const formatGameType = (format: string) => {
    const match = format.match(/^(\d+)s?$/i);
    return match ? `${match[1]}-a-side` : format;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-500/15 text-green-400';
      case 'RESERVE':   return 'bg-phosphor/10 text-phosphor';
      default:          return 'bg-warn/15 text-warn';
    }
  };
  const statusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'Confirmed';
      case 'RESERVE':   return 'Reserve';
      default:          return 'Pending';
    }
  };

  const tabCls = (active: boolean) =>
    `px-5 py-3 font-bold text-sm transition-colors border-b-2 ${
      active ? 'text-phosphor border-phosphor' : 'text-tertiary border-transparent hover:text-secondary'
    }`;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-phosphor"></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-extrabold tracking-tight text-white mb-6">My games</h1>

      <div className="flex gap-1 mb-6 border-b border-white/6">
        <button onClick={() => setTab('created')} className={tabCls(tab === 'created')}>
          Created ({createdGames.length})
        </button>
        <button onClick={() => setTab('joined')} className={tabCls(tab === 'joined')}>
          Joined ({joinedGames.length})
        </button>
      </div>

      {tab === 'created' && (
        <>
          {createdGames.length === 0 && pastCreatedGames.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-secondary">No games created yet</p>
              <p className="text-tertiary text-sm mt-1">Tap Create to post your first game</p>
            </div>
          ) : (
            <>
              {createdGames.length > 0 && (
                <div className="space-y-2 mb-8">
                  {createdGames.map(game => (
                    <Link key={game.id} href={`/dashboard/games/${game.id}`}
                      className="block bg-surface border border-white/6 rounded-card p-4 hover:border-white/20 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-white font-bold">{game.venue}</h3>
                        <span className="microlabel bg-warn/15 text-warn px-2 py-1 rounded-control">Organiser</span>
                      </div>
                      <p className="text-secondary text-sm">{formatDateTime(game.date_time)}</p>
                      <p className="text-phosphor text-sm mt-1.5">{formatGameType(game.format)} · {game.players_needed} needed</p>
                    </Link>
                  ))}
                </div>
              )}

              {pastCreatedGames.length > 0 && (
                <div>
                  <p className="microlabel text-tertiary mb-3">Past games</p>
                  {repeatError && <p className="text-red-400 text-sm mb-3">{repeatError}</p>}
                  <div className="space-y-2">
                    {pastCreatedGames.map(game => (
                      <div key={game.id} className="bg-surface border border-white/6 rounded-card p-4 flex items-center justify-between gap-4">
                        <Link href={`/dashboard/games/${game.id}`} className="flex-1 min-w-0">
                          <h3 className="text-white font-bold truncate">{game.venue}</h3>
                          <p className="text-secondary text-sm">{formatDateTime(game.date_time)}</p>
                          <p className="text-tertiary text-sm mt-0.5">{formatGameType(game.format)}</p>
                        </Link>
                        <button onClick={() => handleRepeat(game.id)} disabled={repeatingId === game.id}
                          className="shrink-0 bg-phosphor/10 border border-phosphor/30 text-phosphor text-sm font-bold px-3 py-2 rounded-control hover:bg-phosphor/15 transition-colors disabled:opacity-50 whitespace-nowrap">
                          {repeatingId === game.id ? 'Posting…' : 'Post again'}
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
              <p className="text-secondary">No games joined yet</p>
              <p className="text-tertiary text-sm mt-1">Find games and request a spot to play</p>
            </div>
          ) : (
            <div className="space-y-2">
              {joinedGames.map(game => (
                <Link key={game.id} href={`/dashboard/games/${game.id}`}
                  className="block bg-surface border border-white/6 rounded-card p-4 hover:border-white/20 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-white font-bold">{game.venue}</h3>
                    <span className={`microlabel px-2 py-1 rounded-control ${statusBadge(game.status)}`}>
                      {statusLabel(game.status)}
                    </span>
                  </div>
                  <p className="text-secondary text-sm">{formatDateTime(game.date_time)}</p>
                  <p className="text-tertiary text-sm mt-0.5">by {game.organiser_name}</p>
                  <p className="text-phosphor text-sm mt-1.5">{formatGameType(game.format)}</p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
