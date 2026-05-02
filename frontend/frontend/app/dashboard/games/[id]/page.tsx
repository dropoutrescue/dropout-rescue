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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <p className="text-[var(--text-2)]">Game not found</p>
        <Link href="/dashboard/games" className="text-[var(--primary)] text-sm">Back to games</Link>
      </div>
    );
  }

  const totalSquad = game.confirmed_count + game.players_needed;
  const isPastGame = new Date(game.date_time) < new Date();
  const d = new Date(game.date_time);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hudDay = dayNames[d.getDay()];
  const hudDate = `${d.getDate()} ${monthNames[d.getMonth()]}`;
  const hudTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  const statusColor = game.status === 'FULL' ? 'var(--text-3)' : 'var(--primary)';

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32">

      {/* Back */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard/games" className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)] transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <Image src="/logo.png" alt="Dropout Rescue" width={22} height={22} className="rounded-control opacity-40" />
      </div>

      {/* Hero */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
          <span className="microlabel" style={{ color: statusColor }}>
            {game.status === 'FULL' ? 'Full' : 'Open'}
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-[var(--text)] mb-1" style={{ letterSpacing: '-0.025em' }}>
          {game.venue}
        </h1>
        <p className="text-sm text-[var(--text-2)]">
          {formatGameType(game.format)} · by {game.organiser_name}
        </p>
      </div>

      {/* HUD */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card flex overflow-hidden mb-4">
        <div className="flex-1 p-4">
          <p className="microlabel text-[var(--text-3)] mb-1.5">When</p>
          <p className="text-[var(--text)] font-bold leading-tight">{hudDay}</p>
          <p className="text-[var(--text-2)] text-sm tabular-nums">{hudDate} · {hudTime}</p>
        </div>
        <div className="w-px" style={{ background: 'var(--border)' }} />
        <div className="flex-1 p-4">
          <p className="microlabel text-[var(--text-3)] mb-1.5">Subs</p>
          {game.subs ? (
            <>
              <p className="text-[var(--text)] font-bold tabular-nums">£{game.subs}</p>
              <p className="text-[var(--text-2)] text-sm">per player</p>
            </>
          ) : (
            <p className="text-[var(--text-2)]">—</p>
          )}
        </div>
      </div>

      {/* Notes */}
      {game.notes && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-4 mb-4">
          <p className="microlabel text-[var(--text-3)] mb-1.5">Notes</p>
          <p className="text-[var(--text)] text-sm">{game.notes}</p>
        </div>
      )}

      {/* Player action — non-organiser */}
      {!isOrganiser && (
        <div className="mb-5">
          {userParticipation ? (
            <div className="space-y-2">
              <div className={`text-center py-2.5 rounded-control border text-sm font-bold ${
                userParticipation.status === 'CONFIRMED'
                  ? 'border-[var(--primary-dim)] text-[var(--primary)]'
                  : userParticipation.status === 'REQUESTED'
                  ? 'text-[var(--warn)]'
                  : 'border-[var(--primary-dim)] text-[var(--primary)]'
              }`}
              style={
                userParticipation.status === 'CONFIRMED' || userParticipation.status === 'RESERVE'
                  ? { background: 'var(--primary-tint)', borderColor: 'var(--primary-dim)' }
                  : { background: 'rgba(255,181,71,0.06)', borderColor: 'rgba(255,181,71,0.30)' }
              }>
                {userParticipation.status === 'CONFIRMED' && "You're confirmed"}
                {userParticipation.status === 'REQUESTED' && 'Request pending'}
                {userParticipation.status === 'RESERVE' && "You're on reserve"}
              </div>

              {(userParticipation.status === 'CONFIRMED' || userParticipation.status === 'RESERVE') && (
                <div className="flex gap-2">
                  <button onClick={handleWithdraw} disabled={actionLoading}
                    className="flex-1 border border-[var(--danger)] text-[var(--danger)] font-bold py-2.5 rounded-control hover:bg-[var(--danger)]/5 transition-colors disabled:opacity-50 text-sm">
                    Leave game
                  </button>
                  <button onClick={handleMessageOrganiser}
                    className="flex-1 bg-[var(--surface)] border border-[var(--border-2)] text-[var(--text)] font-semibold py-2.5 rounded-control hover:border-[var(--border-2)] transition-colors text-sm flex items-center justify-center gap-1.5">
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
              className="w-full bg-[var(--primary)] text-black font-extrabold uppercase tracking-[0.1em] py-[11px] rounded-control hover:opacity-90 transition-opacity disabled:opacity-50">
              {actionLoading ? 'Requesting…' : 'Request spot'}
            </button>
          ) : (
            <button onClick={handleJoinReserve} disabled={actionLoading}
              className="w-full border font-bold py-[11px] rounded-control transition-colors disabled:opacity-50"
              style={{ background: 'var(--primary-tint)', borderColor: 'var(--primary-dim)', color: 'var(--primary)' }}>
              {actionLoading ? 'Joining…' : 'Join reserve list'}
            </button>
          )}
        </div>
      )}

      {/* Organiser controls */}
      {isOrganiser && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-4 mb-5">
          <p className="microlabel mb-3" style={{ color: 'var(--primary)' }}>Organiser</p>
          <div className="flex gap-2 mb-2">
            <button onClick={handleShareGame}
              className={`flex-1 border font-semibold py-2.5 rounded-control text-sm transition-colors ${
                copied
                  ? 'text-[var(--primary)]'
                  : 'border-[var(--border-2)] text-[var(--text)] hover:border-[var(--border-2)]'
              }`}
              style={copied ? { background: 'var(--primary-tint)', borderColor: 'var(--primary-dim)' } : {}}>
              {copied ? 'Copied!' : 'Share game'}
            </button>
            <button onClick={handleShareJoinLink}
              className={`flex-1 border font-semibold py-2.5 rounded-control text-sm transition-colors ${
                linkCopied
                  ? 'text-[var(--primary)]'
                  : 'border-[var(--border-2)] text-[var(--text)] hover:border-[var(--border-2)]'
              }`}
              style={linkCopied ? { background: 'var(--primary-tint)', borderColor: 'var(--primary-dim)' } : {}}>
              {linkCopied ? 'Link copied!' : 'Copy join link'}
            </button>
          </div>
          {isPastGame && (
            <div>
              {repeatError && <p className="text-[var(--danger)] text-xs mb-2">{repeatError}</p>}
              <button onClick={handleRepeat} disabled={repeatLoading}
                className="w-full border border-[var(--border-2)] text-[var(--text-2)] font-medium py-2.5 rounded-control hover:text-[var(--text)] transition-colors disabled:opacity-50 text-sm">
                {repeatLoading ? 'Creating…' : '↻ Post again next week'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Squad */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="microlabel text-[var(--text-3)]">Squad</p>
          <span className="text-sm font-bold tabular-nums text-[var(--text)]">
            {game.confirmed_count}
            <span className="text-[var(--text-3)] font-normal"> / {totalSquad}</span>
          </span>
        </div>

        {/* Segmented bar */}
        {totalSquad > 0 && (
          <div className="flex gap-[3px] mb-4">
            {Array.from({ length: totalSquad }).map((_, i) => (
              <div key={i} className="flex-1 h-[4px] rounded-sm"
                style={{ background: i < game.confirmed_count ? 'var(--primary)' : 'rgba(255,255,255,0.10)' }} />
            ))}
          </div>
        )}

        {/* Pending requests — organiser only, above confirmed */}
        {isOrganiser && requestedPlayers.length > 0 && (
          <div className="space-y-2 mb-2">
            {requestedPlayers.map(player => {
              const badge = getReliabilityBadge(player.user_games_played || 0);
              return (
                <div key={player.id} className="flex items-center gap-3 p-3 rounded-card border"
                  style={{ background: 'rgba(255,181,71,0.04)', borderColor: 'rgba(255,181,71,0.25)' }}>
                  {/* Avatar */}
                  <div className="w-[30px] h-[30px] rounded-full flex-shrink-0 flex items-center justify-center border"
                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border-2)' }}>
                    <span className="text-[11px] font-extrabold tabular-nums" style={{ color: 'var(--warn)' }}>?</span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text)] text-[15px] font-medium leading-tight truncate">{player.user_name}</p>
                    <p className="text-[11px] text-[var(--text-2)] mt-0.5">
                      {badge.emoji} {badge.label}{player.user_area ? ` · ${player.user_area}` : ''}
                    </p>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => handleApprove(player)} disabled={actionLoading}
                      className="bg-[var(--primary)] text-black text-[11px] font-extrabold uppercase tracking-[0.08em] px-3 py-1.5 rounded-control hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap">
                      Approve
                    </button>
                    <button onClick={() => handleDecline(player.id)} disabled={actionLoading}
                      className="border text-[11px] font-bold px-2.5 py-1.5 rounded-control hover:bg-[var(--danger)]/5 transition-colors disabled:opacity-50"
                      style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Confirmed players */}
        {confirmedPlayers.length === 0 && requestedPlayers.length === 0 ? (
          <p className="text-[var(--text-3)] text-sm text-center py-4">No players confirmed yet</p>
        ) : (
          <div className="space-y-1.5">
            {confirmedPlayers.map((player, i) => {
              const badge = getReliabilityBadge(player.user_games_played || 0);
              return (
                <div key={player.id} className="flex items-center gap-3 p-3 rounded-card border border-[var(--border)] bg-[var(--surface)]">
                  <div className="w-[30px] h-[30px] rounded-full flex-shrink-0 flex items-center justify-center border"
                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border-2)' }}>
                    <span className="text-[11px] font-extrabold tabular-nums text-[var(--text)]">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text)] text-[15px] font-medium leading-tight truncate">{player.user_name}</p>
                    <p className="text-[11px] text-[var(--text-2)] mt-0.5">
                      {badge.emoji} {badge.label}{player.user_area ? ` · ${player.user_area}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="microlabel" style={{ color: 'var(--primary)' }}>In</span>
                    {isOrganiser && (
                      <button onClick={() => handleRemove(player.id, player.user_name)} disabled={actionLoading}
                        className="text-[var(--text-3)] hover:text-[var(--danger)] text-xs transition-colors disabled:opacity-40">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reserve */}
      {reservePlayers.length > 0 && (
        <div className="mb-5">
          <p className="microlabel text-[var(--text-3)] mb-3">Reserve</p>
          <div className="space-y-1.5">
            {reservePlayers.map((player, i) => {
              const badge = getReliabilityBadge(player.user_games_played || 0);
              return (
                <div key={player.id} className="flex items-center gap-3 p-3 rounded-card border border-[var(--border)] bg-[var(--surface)]">
                  <div className="w-[30px] h-[30px] rounded-full flex-shrink-0 flex items-center justify-center border"
                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border-2)' }}>
                    <span className="text-[11px] font-extrabold tabular-nums text-[var(--text-2)]">R{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text)] text-[15px] font-medium leading-tight truncate">{player.user_name}</p>
                    <p className="text-[11px] text-[var(--text-2)] mt-0.5">
                      {badge.emoji} {badge.label}{player.user_area ? ` · ${player.user_area}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="microlabel" style={{ color: 'var(--warn)' }}>Reserve</span>
                    {isOrganiser && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(player)} disabled={actionLoading || game.players_needed === 0}
                          className="text-[var(--primary)] text-xs font-medium transition-colors disabled:opacity-40"
                          title={game.players_needed === 0 ? 'Game is full' : 'Move to confirmed'}>
                          Promote
                        </button>
                        <button onClick={() => handleRemove(player.id, player.user_name)} disabled={actionLoading}
                          className="text-[var(--text-3)] hover:text-[var(--danger)] text-xs transition-colors disabled:opacity-40">
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete */}
      {isOrganiser && (
        <div className="mt-4">
          {deleteError && <p className="text-[var(--danger)] text-xs mb-2">{deleteError}</p>}
          <button onClick={handleDelete} disabled={deleteLoading}
            className="w-full py-2.5 rounded-control border font-bold text-sm hover:bg-[var(--danger)]/5 transition-colors disabled:opacity-50"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
            {deleteLoading ? 'Deleting…' : 'Delete game'}
          </button>
        </div>
      )}
    </div>
  );
}
