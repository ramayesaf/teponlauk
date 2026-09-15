import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Crown, Sparkles, Pin, VideoOff } from 'lucide-react';
import { Participant } from '../types';

interface CallGridProps {
  participants: Participant[];
  localUserId: string;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  localAudioLevel: number;
  isLocalSpeaking: boolean;
  onToggleSinging: (isSinging: boolean) => void;
  pinnedUserId: string | null;
  onPinUser: (userId: string | null) => void;
}

// Subcomponent for each Participant Card
const ParticipantVideoCard: React.FC<{
  participant: Participant;
  isLocal: boolean;
  stream: MediaStream | null;
  audioLevel?: number;
  isSpeaking?: boolean;
  isPinned: boolean;
  onPin: () => void;
  onToggleSinging?: (isSinging: boolean) => void;
}> = ({ participant, isLocal, stream, isSpeaking, isPinned, onPin, onToggleSinging }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream && !participant.isVideoOff && stream.getVideoTracks().length > 0;

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-slate-900 border transition-all duration-200 flex flex-col items-center justify-center min-w-[140px] sm:min-w-[170px] h-[130px] sm:h-[150px] group ${
        isSpeaking
          ? 'border-emerald-400 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/10'
          : participant.isSinging
          ? 'border-pink-500 ring-2 ring-pink-500/30'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Video Feed */}
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Always mute local video playback to avoid feedback
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        /* Avatar Placeholder */
        <div className="flex flex-col items-center justify-center p-3 text-center">
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md transition-transform ${
              isSpeaking ? 'scale-110' : ''
            }`}
            style={{ backgroundColor: participant.avatarColor || '#ec4899' }}
          >
            {participant.name.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <VideoOff className="w-3 h-3 text-slate-500" /> Kamera Mati
          </span>
        </div>
      )}

      {/* Floating badges: Top Row */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1">
          {participant.isHost && (
            <span className="bg-amber-500/90 text-slate-950 p-1 rounded text-[10px] font-bold flex items-center shadow" title="Host Room">
              <Crown className="w-3 h-3" />
            </span>
          )}
          {participant.isSinging && (
            <span className="bg-pink-600/90 text-white px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5 shadow">
              <Sparkles className="w-2.5 h-2.5" /> Bernyanyi
            </span>
          )}
        </div>

        {/* Pin button */}
        <button
          onClick={onPin}
          className={`pointer-events-auto p-1 rounded-md transition-opacity ${
            isPinned
              ? 'bg-pink-600 text-white opacity-100'
              : 'bg-slate-900/80 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100'
          }`}
          title={isPinned ? 'Lepas Pin' : 'Sematkan Peserta'}
        >
          <Pin className="w-3 h-3" />
        </button>
      </div>

      {/* Floating Badges: Bottom Row (Name & Mic) */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none bg-slate-950/75 backdrop-blur px-2 py-1 rounded-md text-[11px]">
        <div className="flex items-center gap-1 min-w-0 max-w-[70%]">
          <span className="text-white font-medium truncate">
            {participant.name} {isLocal && '(Anda)'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {participant.isMuted ? (
            <MicOff className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Mic className={`w-3.5 h-3.5 ${isSpeaking ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
          )}
        </div>
      </div>

      {/* Quick Singing Toggle for Local User */}
      {isLocal && onToggleSinging && (
        <button
          onClick={() => onToggleSinging(!participant.isSinging)}
          className={`absolute top-2 right-2 pointer-events-auto text-[10px] px-2 py-0.5 rounded-full font-medium shadow transition-all ${
            participant.isSinging
              ? 'bg-pink-500 text-white'
              : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {participant.isSinging ? '🎤 Giliran Saya' : '🎤 Nyanyi'}
        </button>
      )}
    </div>
  );
};

export const CallGrid: React.FC<CallGridProps> = ({
  participants,
  localUserId,
  localStream,
  remoteStreams,
  isLocalSpeaking,
  onToggleSinging,
  pinnedUserId,
  onPinUser,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Peserta Panggilan Bebas ({participants.length})
          </h3>
          <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
            Voice & Video Aktif
          </span>
        </div>
      </div>

      {/* Horizontal Scrollable or Grid Ribbon for Call Feeds */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
        {participants.map((p) => {
          const isLocal = p.id === localUserId;
          const stream = isLocal ? localStream : remoteStreams[p.id] || null;
          const isSpeaking = isLocal ? isLocalSpeaking : false;

          return (
            <ParticipantVideoCard
              key={p.id}
              participant={p}
              isLocal={isLocal}
              stream={stream}
              isSpeaking={isSpeaking}
              isPinned={pinnedUserId === p.id}
              onPin={() => onPinUser(pinnedUserId === p.id ? null : p.id)}
              onToggleSinging={isLocal ? onToggleSinging : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};
