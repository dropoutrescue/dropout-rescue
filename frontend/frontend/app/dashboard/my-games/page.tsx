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
  subs?: number; notes?: string;
}
interface JoinedGame {
  id: string; venue: string; date_time: string; format: string;
  players_needed: number; organiser_name: string; status: string;
}

interface RepeatForm {
  venue: string; date: string; time: string;
  players_needed: string; format: string; subs: string; notes: string;
}

export default function MyGamesPage() {
  const [tab, setTab] = useState<'created' | 'joined'>('created');
  const [createdGames, setCreatedGames] = useState<Game[]>([]);
  const [pastCreatedGames, setPastCreatedGames] = useState<Game[]>([]);
  const [joinedGames, setJoinedGames] = useState<JoinedGame[]>([]);
  const [loading, setLoading] = useState(true);

  const [repeatSelectedGame, setRepeatSelectedGame] = useState<Game | null>(null);
  const [repeatSheetOpen, setRepeatSheetOpen] = useState(false);
  const [repeatForm, setRepeatForm] = useState<RepeatForm>({ venue: '', date: '', time: '', players_needed: '', format: '', subs: '', notes: '' });
  const [repeatLoading, setRepeatLoading] = useState(false);
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

  const openRepeatSheet = (game: Game) => {
    const d = new Date(new Date(game.date_time).getTime() + 7 * 24 * 60 * 60 * 1000);
    setRepeatForm({
      venue: game.venue,
      date: d.toISOString().split('T')[0],
      time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
      players_needed: String(game.players_needed),
      format: game.format,
      subs: game.subs ? String(game.subs) : '',
      notes: game.notes || '',
    });
    setRepeatSelectedGame(game);
    setRepeatError('');
    setRepeatSheetOpen(true);
  };

  const handleRepeatSubmit = async () => {
    if (!repeatSelectedGame) return;
    setRepeatLoading(true);
    setRepeatError('');
    try {
      const res = await axios.post(`${API_URL}/games/${repeatSelectedGame.id}/repeat?token=${token}`, {
        venue: repeatForm.venue,
        date_time: `${repeatForm.date}T${repeatForm.time}:00`,
        format: repeatForm.format,
        players_needed: parseInt(repeatForm.players_needed),
        subs: repeatForm.subs ? parseFloat(repeatForm.subs) : null,
        notes: repeatForm.notes || null,
      });
      router.push(`/dashboard/games/${res.data.id}`);
    } catch (error: any) {
      setRepeatError(error.response?.data?.detail || 'Failed to repost game');
      setRepeatLoading(false);
    }
  };

  const formatDateTime = (isoString: string) =>
    new Date(isoString).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const formatRepeatDate = (isoString: string) => {
    const d = new Date(new Date(isoString).getTime() + 7 * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatGameType = (format: string) => {
    const match = format.match(/^(\d+)s?$/i);
    return match ? `${match[1]}-a-side` : format;
  };

  const statusColor = (status: string): string => {
    switch (status) {
      case 'CONFIRMED': return 'var(--primary)';
      case 'RESERVE':   return 'var(--warn)';
      default:          return 'var(--warn)';
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
      active
        ? 'text-[var(--primary)] border-[var(--primary)]'
        : 'text-[var(--text-3)] border-transparent hover:text-[var(--text-2)]'
    }`;

  const sheetInputCls = 'w-full px-[14px] py-3 text-[15px] bg-[var(--bg)] border border-[var(--border-2)] rounded-control text-[var(--text)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--primary)] transition-colors';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)] mb-6" style={{ letterSpacing: '-0.025em' }}>My games</h1>

      <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
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
              <p className="text-[var(--text-2)]">No games created yet</p>
              <p className="text-[var(--text-3)] text-sm mt-1">Tap Create to post your first game</p>
            </div>
          ) : (
            <>
              {createdGames.length > 0 && (
                <div className="space-y-2 mb-8">
                  {createdGames.map(game => (
                    <Link key={game.id} href={`/dashboard/games/${game.id}`}
                      className="block bg-[var(--surface)] border border-[var(--border)] rounded-card p-4 hover:border-[var(--border-2)] transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-[var(--text)] font-bold">{game.venue}</h3>
                        <span className="microlabel text-[var(--warn)] px-2 py-1 rounded-control" style={{ background: 'rgba(255,181,71,0.15)' }}>
                          Organiser
                        </span>
                      </div>
                      <p className="text-[var(--text-2)] text-sm">{formatDateTime(game.date_time)}</p>
                      <p className="text-[var(--primary)] text-sm mt-1.5">{formatGameType(game.format)} · {game.players_needed} needed</p>
                    </Link>
                  ))}
                </div>
              )}

              {pastCreatedGames.length > 0 && (
                <div>
                  <p className="microlabel text-[var(--text-3)] mb-3">Past games</p>
                  <div className="space-y-2">
                    {pastCreatedGames.map(game => (
                      <div key={game.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-4 flex items-center justify-between gap-4">
                        <Link href={`/dashboard/games/${game.id}`} className="flex-1 min-w-0">
                          <h3 className="text-[var(--text)] font-bold truncate">{game.venue}</h3>
                          <p className="text-[var(--text-2)] text-sm">{formatDateTime(game.date_time)}</p>
                          <p className="text-[var(--text-3)] text-sm mt-0.5">{formatGameType(game.format)}</p>
                        </Link>
                        <button onClick={() => openRepeatSheet(game)}
                          className="shrink-0 border border-[var(--border-2)] text-[var(--text-2)] text-sm font-semibold px-3 py-2 rounded-control hover:text-[var(--text)] transition-colors whitespace-nowrap">
                          ↻ Repost for {formatRepeatDate(game.date_time)}
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
              <p className="text-[var(--text-2)]">No games joined yet</p>
              <p className="text-[var(--text-3)] text-sm mt-1">Find games and request a spot to play</p>
            </div>
          ) : (
            <div className="space-y-2">
              {joinedGames.map(game => (
                <Link key={game.id} href={`/dashboard/games/${game.id}`}
                  className="block bg-[var(--surface)] border border-[var(--border)] rounded-card p-4 hover:border-[var(--border-2)] transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-[var(--text)] font-bold">{game.venue}</h3>
                    <span className="microlabel px-2 py-1 rounded-control" style={{ color: statusColor(game.status) }}>
                      {statusLabel(game.status)}
                    </span>
                  </div>
                  <p className="text-[var(--text-2)] text-sm">{formatDateTime(game.date_time)}</p>
                  <p className="text-[var(--text-3)] text-sm mt-0.5">by {game.organiser_name}</p>
                  <p className="text-[var(--primary)] text-sm mt-1.5">{formatGameType(game.format)}</p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>

    {/* Repeat sheet */}
    {repeatSheetOpen && (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={() => !repeatLoading && setRepeatSheetOpen(false)} />
        <div className="relative w-full md:max-w-lg bg-[var(--surface)] rounded-t-card md:rounded-card p-5 overflow-y-auto max-h-[90vh]">
          <h2 className="text-lg font-extrabold tracking-tight text-[var(--text)] mb-5" style={{ letterSpacing: '-0.025em' }}>New game</h2>
          <div className="space-y-4">
            <div>
              <label className="block microlabel text-[var(--text-3)] mb-2">Venue</label>
              <input type="text" value={repeatForm.venue}
                onChange={e => setRepeatForm(f => ({ ...f, venue: e.target.value }))}
                className={sheetInputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block microlabel text-[var(--text-3)] mb-2">Date</label>
                <input type="date" value={repeatForm.date}
                  onChange={e => setRepeatForm(f => ({ ...f, date: e.target.value }))}
                  className={sheetInputCls} />
              </div>
              <div>
                <label className="block microlabel text-[var(--text-3)] mb-2">Time</label>
                <input type="time" value={repeatForm.time}
                  onChange={e => setRepeatForm(f => ({ ...f, time: e.target.value }))}
                  className={sheetInputCls} />
              </div>
            </div>
            <div>
              <label className="block microlabel text-[var(--text-3)] mb-2">Format</label>
              <div className="grid grid-cols-7 gap-1.5">
                {['5s', '6s', '7s', '8s', '9s', '10s', '11s'].map(fmt => (
                  <button key={fmt} type="button"
                    onClick={() => setRepeatForm(f => ({ ...f, format: fmt }))}
                    className={`py-2 rounded-control text-sm font-bold transition-colors ${
                      repeatForm.format === fmt
                        ? 'bg-[var(--primary)] text-black'
                        : 'bg-[var(--bg)] border border-[var(--border-2)] text-[var(--text-2)] hover:text-[var(--text)]'
                    }`}>
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block microlabel text-[var(--text-3)] mb-2">Players needed</label>
              <input type="number" min="1" value={repeatForm.players_needed}
                onChange={e => setRepeatForm(f => ({ ...f, players_needed: e.target.value }))}
                className={sheetInputCls} />
            </div>
            <div>
              <label className="block microlabel text-[var(--text-3)] mb-2">Subs (£)</label>
              <input type="number" step="0.01" value={repeatForm.subs}
                onChange={e => setRepeatForm(f => ({ ...f, subs: e.target.value }))}
                className={sheetInputCls} />
            </div>
            <div>
              <label className="block microlabel text-[var(--text-3)] mb-2">Notes</label>
              <textarea rows={3} value={repeatForm.notes}
                onChange={e => setRepeatForm(f => ({ ...f, notes: e.target.value }))}
                className={`${sheetInputCls} resize-none`} />
            </div>
          </div>
          {repeatError && <p className="text-[var(--danger)] text-sm mt-3">{repeatError}</p>}
          <div className="flex gap-2 mt-5">
            <button onClick={handleRepeatSubmit} disabled={repeatLoading}
              className="flex-1 bg-[var(--primary)] text-black font-extrabold uppercase tracking-[0.1em] py-[11px] rounded-control hover:opacity-90 transition-opacity disabled:opacity-50">
              {repeatLoading ? 'Posting…' : 'Post game'}
            </button>
            <button onClick={() => setRepeatSheetOpen(false)} disabled={repeatLoading}
              className="flex-1 bg-[var(--bg)] border border-[var(--border-2)] text-[var(--text)] font-medium py-[11px] rounded-control hover:border-[var(--primary)]/40 transition-colors disabled:opacity-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
