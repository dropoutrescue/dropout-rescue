'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Game {
  id: string;
  organiser_id: string;
  organiser_name: string;
  organiser_phone?: string;
  venue: string;
  date_time: string;
  players_needed: number;
  format: string;
  subs?: number;
  notes?: string;
  status: string;
  confirmed_count: number;
  reserve_count: number;
}

interface Participant {
  id: string;
  game_id: string;
  user_id: string;
  user_name: string;
  user_area?: string;
  user_phone?: string;
  user_games_played: number;
  status: string;
}

// Helper function for reliability badge - shows full label
const getReliabilityBadge = (gamesPlayed: number) => {
  if (gamesPlayed === 0) return { emoji: '🔵', label: 'New (0 games)', short: 'New' };
  if (gamesPlayed <= 5) return { emoji: '🟡', label: `Getting Started (${gamesPlayed} games)`, short: `${gamesPlayed} games` };
  return { emoji: '🟢', label: `Regular (${gamesPlayed} games)`, short: `${gamesPlayed} games` };
};

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const gameId = resolvedParams.id;
  
  const [game, setGame] = useState<Game | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const { user, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (gameId) {
      fetchGameDetails();
    }
  }, [gameId]);

  const fetchGameDetails = async () => {
    try {
      const [gameRes, participantsRes] = await Promise.all([
        axios.get(`${API_URL}/games/${gameId}`),
        axios.get(`${API_URL}/games/${gameId}/participants`)
      ]);
      setGame(gameRes.data);
      setParticipants(participantsRes.data);
    } catch (error) {
      console.error('Error fetching game:', error);
      alert('Game not found');
      router.push('/dashboard/games');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} at ${hours}:${minutes}`;
  };

  const formatShortDate = (isoString: string) => {
    const date = new Date(isoString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} @ ${hours}:${minutes}`;
  };

  // Convert format shorthand to full text (e.g., "5s" -> "5-a-side")
  const formatGameType = (format: string) => {
    const match = format.match(/^(\d+)s?$/i);
    if (match) {
      return `${match[1]}-a-side`;
    }
    return format;
  };

  // Check user's participation status
  const userParticipation = participants.find(p => p.user_id === user?.id);
  const isOrganiser = game?.organiser_id === user?.id;

  // Group participants by status
  const requestedPlayers = participants.filter(p => p.status === 'REQUESTED');
  const confirmedPlayers = participants.filter(p => p.status === 'CONFIRMED');
  const reservePlayers = participants.filter(p => p.status === 'RESERVE');

  const handleRequestSpot = async () => {
    if (!token) {
      alert('Please log in first');
      return;
    }

    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/participants?token=${token}`, {
        game_id: gameId,
        action: 'REQUESTED'
      });
      await fetchGameDetails();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to request spot');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinReserve = async () => {
    if (!token) {
      alert('Please log in first');
      return;
    }

    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/participants?token=${token}`, {
        game_id: gameId,
        action: 'RESERVE'
      });
      await fetchGameDetails();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to join reserve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (participantId: string) => {
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/participants/${participantId}/approve?token=${token}`);
      await fetchGameDetails();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (participantId: string) => {
    if (!confirm('Decline this request?')) return;
    
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/participants/${participantId}/decline?token=${token}`);
      await fetchGameDetails();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to decline');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async (participantId: string, playerName: string) => {
    if (!confirm(`Remove ${playerName} from the game?`)) return;
    
    setActionLoading(true);
    try {
      await axios.delete(`${API_URL}/participants/${participantId}?token=${token}`);
      await fetchGameDetails();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to remove');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm("This will notify the organiser and free up your spot. Continue?")) return;
    
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/participants/withdraw?game_id=${gameId}&token=${token}`);
      alert("You've been removed from the game. The organiser has been notified.");
      await fetchGameDetails();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to withdraw');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessageOrganiser = () => {
    if (!game) return;
    
    const message = `Hey, I can't make ${game.venue} on ${formatShortDate(game.date_time)}. Please fill my spot 🙏`;
    const encodedMessage = encodeURIComponent(message);
    
    if (game.organiser_phone) {
      // Format phone number (remove spaces, ensure it starts with country code)
      let phone = game.organiser_phone.replace(/\s+/g, '').replace(/^0/, '44');
      if (!phone.startsWith('+') && !phone.startsWith('44')) {
        phone = '44' + phone;
      }
      // Open WhatsApp directly to organiser
      window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
    } else {
      // Fallback: copy message to clipboard
      navigator.clipboard.writeText(message).then(() => {
        alert('Message copied! Paste it in WhatsApp to the organiser.\n\n(Organiser has no phone number on file)');
      }).catch(() => {
        // Double fallback: show alert with message
        alert(`Copy this message to send to organiser:\n\n${message}`);
      });
    }
  };

  const handleShareGame = () => {
    if (!game) return;
    
    const spotsRemaining = game.players_needed;
    const gameUrl = window.location.href;
    
    let message = `⚽ DROPOUT RESCUE\n\n`;
    message += `${game.venue}\n`;
    message += `${formatShortDate(game.date_time)}\n`;
    message += `${formatGameType(game.format)}\n`;
    message += `${spotsRemaining} spot${spotsRemaining !== 1 ? 's' : ''} left\n`;
    
    if (game.subs) {
      message += `Subs: £${game.subs}\n`;
    }
    
    if (game.notes) {
      message += `Notes: ${game.notes}\n`;
    }
    
    message += `\nJoin: ${gameUrl}`;

    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = message;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-400 mb-4">Game not found</p>
        <Link href="/dashboard/games" className="text-cyan-400">Back to games</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32">
      {/* Back Button with Logo */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard/games"
          className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Games
        </Link>
        <Image src="/logo.png" alt="Dropout Rescue" width={24} height={24} className="rounded opacity-60" />
      </div>

      {/* Game Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold text-white">{game.venue}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            game.status === 'FULL' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}>
            {game.status}
          </span>
        </div>

        <p className="text-cyan-400 font-medium mb-4">{formatDateTime(game.date_time)}</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-gray-400 text-sm">Format</p>
            <p className="text-white font-bold">{formatGameType(game.format)}</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-gray-400 text-sm">Spots Left</p>
            <p className={`font-bold ${game.players_needed > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {game.players_needed}
            </p>
          </div>
        </div>

        {game.subs && (
          <div className="bg-zinc-800 rounded-lg p-3 mb-4">
            <p className="text-gray-400 text-sm">Subs</p>
            <p className="text-white font-bold">£{game.subs}</p>
          </div>
        )}

        {game.notes && (
          <div className="bg-zinc-800 rounded-lg p-3 mb-4">
            <p className="text-gray-400 text-sm">Notes</p>
            <p className="text-white">{game.notes}</p>
          </div>
        )}

        <div className="border-t border-zinc-700 pt-4">
          <p className="text-gray-400 text-sm">Organised by</p>
          <p className="text-white font-medium">{game.organiser_name}</p>
        </div>
      </div>

      {/* Share Button */}
      <button
        onClick={handleShareGame}
        className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 mb-6 transition-all ${
          copied 
            ? 'bg-green-500 text-white' 
            : 'bg-zinc-800 text-white border border-zinc-700 hover:border-cyan-400'
        }`}
      >
        {copied ? (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied to Clipboard!
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Game
          </>
        )}
      </button>

      {/* Player Action Section */}
      {!isOrganiser && (
        <div className="mb-6">
          {userParticipation ? (
            <div className="space-y-3">
              {/* Status Badge */}
              <div className={`text-center py-4 rounded-lg ${
                userParticipation.status === 'CONFIRMED' 
                  ? 'bg-green-500/10 border-2 border-green-500' 
                  : userParticipation.status === 'REQUESTED'
                  ? 'bg-yellow-500/10 border-2 border-yellow-500'
                  : 'bg-cyan-400/10 border-2 border-cyan-400'
              }`}>
                <p className={`font-bold ${
                  userParticipation.status === 'CONFIRMED' 
                    ? 'text-green-500' 
                    : userParticipation.status === 'REQUESTED'
                    ? 'text-yellow-500'
                    : 'text-cyan-400'
                }`}>
                  {userParticipation.status === 'CONFIRMED' && "You're IN!"}
                  {userParticipation.status === 'REQUESTED' && 'Request Pending'}
                  {userParticipation.status === 'RESERVE' && "You're on Reserve"}
                </p>
              </div>

              {/* Can't Make It + Message Organiser (for Confirmed or Reserve) */}
              {(userParticipation.status === 'CONFIRMED' || userParticipation.status === 'RESERVE') && (
                <div className="flex gap-2">
                  <button
                    onClick={handleWithdraw}
                    disabled={actionLoading}
                    className="flex-1 bg-red-500/10 border border-red-500 text-red-500 font-semibold py-3 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 text-sm"
                  >
                    Can't make it
                  </button>
                  <button
                    onClick={handleMessageOrganiser}
                    className="flex-1 bg-green-500/10 border border-green-500 text-green-500 font-semibold py-3 rounded-lg hover:bg-green-500/20 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Message
                  </button>
                </div>
              )}
            </div>
          ) : game.status === 'OPEN' ? (
            <button
              onClick={handleRequestSpot}
              disabled={actionLoading}
              className="w-full bg-cyan-400 text-black font-bold py-4 rounded-lg hover:bg-cyan-300 transition-colors disabled:opacity-50"
            >
              {actionLoading ? 'Requesting...' : 'Request Spot'}
            </button>
          ) : (
            <button
              onClick={handleJoinReserve}
              disabled={actionLoading}
              className="w-full bg-zinc-800 text-cyan-400 border-2 border-cyan-400 font-bold py-4 rounded-lg hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
            >
              {actionLoading ? 'Joining...' : 'Join Reserve List'}
            </button>
          )}
        </div>
      )}

      {/* Organiser Badge */}
      {isOrganiser && (
        <div className="bg-cyan-400/10 border-2 border-cyan-400 rounded-lg p-4 mb-6 text-center">
          <p className="text-cyan-400 font-bold">You're the Organiser</p>
          <p className="text-gray-400 text-sm mt-1">Manage player requests below</p>
        </div>
      )}

      {/* Pending Requests (Organiser Only) */}
      {isOrganiser && requestedPlayers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
            Pending Requests ({requestedPlayers.length})
          </h2>
          <div className="space-y-2">
            {requestedPlayers.map((player) => {
              const badge = getReliabilityBadge(player.user_games_played || 0);
              return (
                <div key={player.id} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{player.user_name}</p>
                        <span className="text-xs text-gray-400">{badge.emoji} {badge.label}</span>
                      </div>
                      {player.user_area && <p className="text-gray-400 text-sm">{player.user_area}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(player.id)}
                        disabled={actionLoading}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-400 transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDecline(player.id)}
                        disabled={actionLoading}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-400 transition-colors disabled:opacity-50"
                      >
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

      {/* Confirmed Players */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Confirmed ({confirmedPlayers.length})
        </h2>
        {confirmedPlayers.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No players confirmed yet</p>
        ) : (
          <div className="space-y-2">
            {confirmedPlayers.map((player) => {
              const badge = getReliabilityBadge(player.user_games_played || 0);
              return (
                <div key={player.id} className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{player.user_name}</p>
                        <span className="text-xs text-gray-400">{badge.emoji} {badge.label}</span>
                      </div>
                      {player.user_area && <p className="text-gray-400 text-sm">{player.user_area}</p>}
                    </div>
                    {isOrganiser && (
                      <button
                        onClick={() => handleRemove(player.id, player.user_name)}
                        disabled={actionLoading}
                        className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors disabled:opacity-50"
                      >
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

      {/* Reserve List */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
          Reserve ({reservePlayers.length})
        </h2>
        {reservePlayers.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No reserve players</p>
        ) : (
          <div className="space-y-2">
            {reservePlayers.map((player) => {
              const badge = getReliabilityBadge(player.user_games_played || 0);
              return (
                <div key={player.id} className="bg-cyan-400/10 border border-cyan-400/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{player.user_name}</p>
                        <span className="text-xs text-gray-400">{badge.emoji} {badge.label}</span>
                      </div>
                      {player.user_area && <p className="text-gray-400 text-sm">{player.user_area}</p>}
                    </div>
                    {isOrganiser && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(player.id)}
                          disabled={actionLoading || game.players_needed === 0}
                          className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors disabled:opacity-50"
                          title={game.players_needed === 0 ? 'Game is full' : 'Move to confirmed'}
                        >
                          Promote
                        </button>
                        <button
                          onClick={() => handleRemove(player.id, player.user_name)}
                          disabled={actionLoading}
                          className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
