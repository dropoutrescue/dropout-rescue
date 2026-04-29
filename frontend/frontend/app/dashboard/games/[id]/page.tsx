'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Game {
  id: string; organiser_id: string; organiser_name: string; organiser_phone?: string;
  venue: string; date_time: string; players_needed: number; format: string;
  subs?: number; notes?: string; status: string; confirmed_count: number; reserve_count: number;
}

interface Participant {
  id: string; game_id: string; user_id: string; user_name: string;
  user_area?: string; user_phone?: string; user_games_played: number; status: string;
}

const getReliabilityBadge = (gamesPlayed: number) => {
  if (gamesPlayed === 0) return { emoji: '🔵', label: 'New' };
  if (gamesPlayed <= 5) return { emoji: '🟡', label: `${gamesPlayed} games` };
  return { emoji: '🟢', label: `${gamesPlayed} games` };
};

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const gameId = resolvedParams.id;

  const [game, setGame] = useState<Game | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [repeatLoading, setRepeatLoading] = useState(false);
  const [repeatError, setRepeatError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const { user, token } = useAuth();
  const router = useRouter();

  useEffect(() => { if (gameId) fetchGameDetails(); }, [gameId]);

  const fetchGameDetails = async () => {
    try {
      const [gameRes, participantsRes] = await Promise.all([
        axios.get(`${API_URL}/games/${gameId}`),
        axios.get(`${API_URL}/games/${gameId}/participants`)
      ]);
      setGame(gameRes.data);
      setParticipants(participantsRes.data);
    } catch {
      router.push('/dashboard/games');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} at ${hh}:${mm}`;
  };

  const formatShortDate = (isoString: string) => {
    const date = new Date(isoString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} @ ${hh}:${mm}`;
  };

  const formatGameType = (format: string) => {
    const match = format.match(/^(\d+)s?$/i);
    return match ? `${match[1]}-a-side` : format;
  };

  const userParticipation = participants.find(p => p.user_id === user?.id);
  const isOrganiser = game?.organiser_id === user?.id;
  const requestedPlayers = participants.filter(p => p.status === 'REQUESTED');
  const confirmedPlayers = participants.filter(p => p.status === 'CONFIRMED');
  const reservePlayers  = participants.filter(p => p.status === 'RESERVE');

  const handleRequestSpot = async () => {
    if (!token) { alert('Please log in first'); return; }
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/participants?token=${token}`, { game_id: gameId, action: 'REQUESTED' });
      await fetchGameDetails();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to request spot');
    } finally { setActionLoading(false); }
  };

  const handleJoinReserve = async () => {
    if (!token) { alert('Please log in first'); return; }
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/participants?token=${token}`, { game_id: gameId, action: 'RESERVE' });
      await fetchGameDetails();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to join reserve');
    } finally { setActionLoading(false); }
  };

  const handleApprove = async (player: Participant) => {
    setActionLoading(true);
    const waWindow = player.user_phone ? window.open('', '_blank') : null;
    try {
      await axios.post(`${API_URL}/participants/${player.id}/approve?token=${token}`);
      await fetchGameDetails();
      if (waWindow && player.user_phone && game) {
        let phone = player.user_phone.replace(/\s+/g, '').replace(/^0/, '44');
        if (!phone.startsWith('+') && !phone.startsWith('44')) phone = '44' + phone;
        const message = `You're confirmed 👍\nGame: ${game.venue}\nTime: ${formatShortDate(game.date_time)}\nSee you there`;
        waWindow.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      }
    } catch (error: any) {
      waWindow?.close();
      alert(error.response?.data?.detail || 'Failed to approve');
    } finally { setActionLoading(false); }
  };

  const handleDecline = async (participantId: string) => {
    if (!confirm('Decline this request?')) return;
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/participants/${participantId}/decline?token=${token}`);
      await fetchGameDetails();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to decline');
    } finally { setActionLoading(false); }
  };

  const handleRemove = async (participantId: string, playerName: string) => {
    if (!confirm(`Remove ${playerName} from the game?`)) return;
    setActionLoading(true);
    try {
      await axios.delete(`${API_URL}/participants/${participantId}?token=${token}`);
      await fetchGameDetails();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to remove');
    } finally { setActionLoading(false); }
  };

  const handleWithdraw = async () => {
    if (!confirm('This will notify the organiser and free up your spot. Continue?')) return;
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/participants/withdraw?game_id=${gameId}&token=${token}`);
      alert("You've been removed from the game. The organiser has been notified.");
      await fetchGameDetails();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to withdraw');
    } finally { setActionLoading(false); }
  };

  const handleMessageOrganiser = () => {
    if (!game) return;
    const message = `Hey, I can't make ${game.venue} on ${formatShortDate(game.date_time)}. Please fill my spot 🙏`;
    if (game.organiser_phone) {
      let phone = game.organiser_phone.replace(/\s+/g, '').replace(/^0/, '44');
      if (!phone.startsWith('+') && !phone.startsWith('44')) phone = '44' + phone;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      navigator.clipboard.writeText(message)
        .then(() => alert('Message copied! Paste it in WhatsApp to the organiser.'))
        .catch(() => alert(`Copy this message to the organiser:\n\n${message}`));
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this game? This cannot be undone.')) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await axios.delete(`${API_URL}/games/${game?.id}?token=${token}`);
      router.push('/dashboard/games');
    } catch (error: any) {
      setDeleteError(error.response?.data?.detail || 'Failed to delete game');
    } finally { setDeleteLoading(false); }
  };

  const handleRepeat = async () => {
    if (!game) return;
    setRepeatLoading(true);
    setRepeatError('');
    try {
      const res = await axios.post(`${API_URL}/games/${game.id}/repeat?token=${token}`, {});
      router.push(`/dashboard/games/${res.data.id}`);
    } catch (error: any) {
      setRepeatError(error.response?.data?.detail || 'Failed to repost game');
    } finally { setRepeatLoading(false); }
  };

  const handleShareJoinLink = () => {
    if (!game) return;
    const joinUrl = `${window.location.origin}/join/${game.id}`;
    if (navigator.share) {
      navigator.share({ title: `Join ${game.venue}`, url: joinUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(joinUrl).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      });
    }
  };

  const handleShareGame = () => {
    if (!game) return;
    let message = `⚽ DROPOUT RESCUE\n\n${game.venue}\n${formatShortDate(game.date_time)}\n${formatGameType(game.format)}\n${game.players_needed} spot${game.players_needed !== 1 ? 's' : ''} left\n`;
    if (game.subs) message += `Subs: £${game.subs}\n`;
    if (game.notes) message += `Notes: ${game.notes}\n`;
    message += `\nJoin: ${window.location.href}`;

    const copy = () => {
      const ta = document.createElement('textarea');
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    navigator.clipboard.writeText(message)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(copy);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-phosphor"></div></div>;
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <p className="text-secondary">Game not found</p>
        <Link href="/dashboard/games" className="text-phosphor text-sm">Back to games</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32">
      {/* Back */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/dashboard/games" className="inline-flex items-center gap-1.5 text-secondary hover:text-white transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <Image src="/logo.png" alt="Dropout Rescue" width={22} height={22} className="rounded-control opacity-50" />
      </div>

      {/* Game header */}
      <div className="bg-surface border border-white/6 rounded-card p-5 mb-5">
        <div className="flex justify-between items-start mb-3">
          <h1 className="text-xl font-extrabold tracking-tight text-white pr-3">{game.venue}</h1>
          <span className={`microlabel px-2 py-1 rounded-control shrink-0 ${
            game.status === 'FULL' ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'
          }`}>
            {game.status}
          </span>
        </div>

        <p className="text-phosphor text-sm font-medium mb-4">{formatDateTime(game.date_time)}</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-bg border border-white/6 rounded-control p-3">
            <p className="microlabel text-tertiary mb-1">Format</p>
            <p className="text-white font-bold text-sm">{formatGameType(game.format)}</p>
          </div>
          <div className="bg-bg border border-white/6 rounded-control p-3">
            <p className="microlabel text-tertiary mb-1">Spots left</p>
            <p className={`font-bold tabular-nums ${game.players_needed > 0 ? 'text-phosphor' : 'text-red-400'}`}>
              {game.players_needed}
            </p>
          </div>
        </div>

        {game.subs && (
          <div className="bg-bg border border-white/6 rounded-control p-3 mb-2">
            <p className="microlabel text-tertiary mb-1">Subs</p>
            <p className="text-white font-bold tabular-nums">£{game.subs}</p>
          </div>
        )}

        {game.notes && (
          <div className="bg-bg border border-white/6 rounded-control p-3 mb-3">
            <p className="microlabel text-tertiary mb-1">Notes</p>
            <p className="text-white text-sm">{game.notes}</p>
          </div>
        )}

        {/* Share game button */}
        <button
          onClick={handleShareGame}
          className={`w-full py-2.5 rounded-control font-bold flex items-center justify-center gap-2 mb-4 transition-all text-sm ${
            copied ? 'bg-green-500/15 border border-green-500/30 text-green-400' : 'bg-bg border border-white/10 text-secondary hover:border-white/20 hover:text-white'
          }`}
        >
          {copied ? (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied!</>
          ) : (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>Share game</>
          )}
        </button>

        <div className="border-t border-white/6 pt-3">
          <p className="text-tertiary text-xs">Organised by</p>
          <p className="text-white font-medium text-sm mt-0.5">{game.organiser_name}</p>
        </div>

        {/* Player action */}
        {!isOrganiser && (
          <div className="mt-4">
            {userParticipation ? (
              <div className="space-y-2">
                <div className={`text-center py-2.5 rounded-control border ${
                  userParticipation.status === 'CONFIRMED'
                    ? 'bg-green-500/10 border-green-500/40 text-green-400'
                    : userParticipation.status === 'REQUESTED'
                    ? 'bg-warn/10 border-warn/30 text-warn'
                    : 'bg-phosphor/10 border-phosphor/30 text-phosphor'
                }`}>
                  <p className="font-bold text-sm">
                    {userParticipation.status === 'CONFIRMED' && "You're confirmed for this game"}
                    {userParticipation.status === 'REQUESTED' && 'Request pending'}
                    {userParticipation.status === 'RESERVE' && "You're on reserve"}
                  </p>
                </div>

                {(userParticipation.status === 'CONFIRMED' || userParticipation.status === 'RESERVE') && (
                  <div className="flex gap-2">
                    <button onClick={handleWithdraw} disabled={actionLoading}
                      className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 font-bold py-2.5 rounded-control hover:bg-red-500/15 transition-colors disabled:opacity-50 text-sm">
                      Leave game
                    </button>
                    <button onClick={handleMessageOrganiser}
                      className="flex-1 bg-green-500/10 border border-green-500/30 text-green-400 font-bold py-2.5 rounded-control hover:bg-green-500/15 transition-colors text-sm flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Message organiser
                    </button>
                  </div>
                )}
              </div>
            ) : game?.status === 'OPEN' ? (
              <button onClick={handleRequestSpot} disabled={actionLoading}
                className="w-full bg-phosphor text-black font-bold py-3.5 rounded-control hover:opacity-90 transition-opacity disabled:opacity-50">
                {actionLoading ? 'Requesting…' : 'Request spot'}
              </button>
            ) : (
              <button onClick={handleJoinReserve} disabled={actionLoading}
                className="w-full bg-phosphor/10 border-2 border-phosphor text-phosphor font-bold py-3.5 rounded-control hover:bg-phosphor/15 transition-colors disabled:opacity-50">
                {actionLoading ? 'Joining…' : 'Join reserve list'}
              </button>
            )}
          </div>
        )}

        {/* Organiser badge */}
        {isOrganiser && (
          <div className="mt-4 bg-bg border border-white/10 rounded-control p-4">
            <p className="text-phosphor font-bold text-sm">You're the organiser</p>
            <p className="text-secondary text-xs mt-0.5 mb-3">Manage player requests below</p>
            <button onClick={handleShareJoinLink}
              className={`w-full py-2 rounded-control text-sm font-bold transition-all ${
                linkCopied ? 'bg-green-500/15 border border-green-500/30 text-green-400' : 'bg-phosphor/10 border border-phosphor/20 text-phosphor hover:bg-phosphor/15'
              }`}>
              {linkCopied ? 'Link copied!' : 'Copy join link'}
            </button>
          </div>
        )}

        {/* Repeat — past games only */}
        {isOrganiser && new Date(game.date_time) < new Date() && (
          <div className="mt-3">
            {repeatError && <p className="text-red-400 text-xs mb-2">{repeatError}</p>}
            <button onClick={handleRepeat} disabled={repeatLoading}
              className="w-full bg-bg border border-white/10 text-secondary font-medium py-2.5 rounded-control hover:border-white/20 hover:text-white transition-colors disabled:opacity-50 text-sm">
              {repeatLoading ? 'Creating…' : '↻ Post again next week'}
            </button>
          </div>
        )}
      </div>

      {/* Pending Requests */}
      {isOrganiser && requestedPlayers.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 bg-warn rounded-full animate-pulse"></span>
            <p className="microlabel text-warn">Pending requests ({requestedPlayers.length})</p>
          </div>
          <div className="space-y-2">
            {requestedPlayers.map(player => {
              const badge = getReliabilityBadge(player.user_games_played || 0);
              return (
                <div key={player.id} className="bg-warn/8 border border-warn/20 rounded-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-white font-bold text-sm">{player.user_name}</p>
                      <p className="text-tertiary text-xs mt-0.5">{badge.emoji} {badge.label}{player.user_area ? ` · ${player.user_area}` : ''}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleApprove(player)} disabled={actionLoading}
                        className="bg-green-500/15 border border-green-500/30 text-green-400 px-3 py-1.5 rounded-control text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50">
                        Approve & Message
                      </button>
                      <button onClick={() => handleDecline(player.id)} disabled={actionLoading}
                        className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-control text-xs font-bold hover:bg-red-500/15 transition-colors disabled:opacity-50">
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmed */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
          <p className="microlabel text-secondary">Confirmed ({confirmedPlayers.length})</p>
        </div>
        {confirmedPlayers.length === 0 ? (
          <p className="text-tertiary text-sm text-center py-4">No players confirmed yet</p>
        ) : (
          <div className="space-y-1.5">
            {confirmedPlayers.map(player => {
              const badge = getReliabilityBadge(player.user_games_played || 0);
              return (
                <div key={player.id} className="bg-surface border border-white/6 rounded-card p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{player.user_name}</p>
                    <p className="text-tertiary text-xs mt-0.5">{badge.emoji} {badge.label}{player.user_area ? ` · ${player.user_area}` : ''}</p>
                  </div>
                  {isOrganiser && (
                    <button onClick={() => handleRemove(player.id, player.user_name)} disabled={actionLoading}
                      className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors disabled:opacity-50">
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reserve */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 bg-phosphor rounded-full"></span>
          <p className="microlabel text-secondary">Reserve ({reservePlayers.length})</p>
        </div>
        {reservePlayers.length === 0 ? (
          <p className="text-tertiary text-sm text-center py-4">No reserve players</p>
        ) : (
          <div className="space-y-1.5">
            {reservePlayers.map(player => {
              const badge = getReliabilityBadge(player.user_games_played || 0);
              return (
                <div key={player.id} className="bg-surface border border-white/6 rounded-card p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{player.user_name}</p>
                    <p className="text-tertiary text-xs mt-0.5">{badge.emoji} {badge.label}{player.user_area ? ` · ${player.user_area}` : ''}</p>
                  </div>
                  {isOrganiser && (
                    <div className="flex gap-3">
                      <button onClick={() => handleApprove(player)} disabled={actionLoading || game.players_needed === 0}
                        className="text-green-400 hover:text-green-300 text-xs font-medium transition-colors disabled:opacity-50"
                        title={game.players_needed === 0 ? 'Game is full' : 'Move to confirmed'}>
                        Promote
                      </button>
                      <button onClick={() => handleRemove(player.id, player.user_name)} disabled={actionLoading}
                        className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors disabled:opacity-50">
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete */}
      {isOrganiser && (
        <div className="mt-2">
          {deleteError && <p className="text-red-400 text-xs mb-2">{deleteError}</p>}
          <button onClick={handleDelete} disabled={deleteLoading}
            className="w-full py-2.5 rounded-control border border-red-500/20 text-red-500/70 text-sm font-medium hover:border-red-500/40 hover:text-red-400 transition-colors disabled:opacity-50">
            {deleteLoading ? 'Deleting…' : 'Delete game'}
          </button>
        </div>
      )}
    </div>
  );
}
