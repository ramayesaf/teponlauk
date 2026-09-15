import React, { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Copy, 
  Check, 
  Volume2, 
  Sparkles, 
  Users, 
  Share2,
  Sliders,
  Radio
} from 'lucide-react';
import { Participant } from '../types';

interface NavbarProps {
  roomCode: string;
  isHost: boolean;
  participantCount: number;
  participants: Participant[];
  isMuted: boolean;
  isVideoOff: boolean;
  musicVolume: number;
  micVolume: number;
  isKaraokeReverb: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onMusicVolumeChange: (val: number) => void;
  onMicVolumeChange: (val: number) => void;
  onToggleReverb: () => void;
  onLeaveRoom: () => void;
  onOpenSongModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomCode,
  isHost,
  participantCount,
  isMuted,
  isVideoOff,
  musicVolume,
  micVolume,
  isKaraokeReverb,
  onToggleMute,
  onToggleVideo,
  onMusicVolumeChange,
  onMicVolumeChange,
  onToggleReverb,
  onLeaveRoom,
  onOpenSongModal,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showVolumePopup, setShowVolumePopup] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-3 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Room Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-400 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <span className="text-xl">🎤</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold tracking-tight text-white">KaraokeCall</h1>
                <span className="bg-pink-500/20 text-pink-400 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-pink-500/30">
                  FREE CALL
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Live Room
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Room Code Badge */}
          <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700/80 rounded-lg p-1 px-2.5">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Kode Room:</span>
            <span className="font-mono text-sm font-bold tracking-wider text-pink-400">{roomCode}</span>
            <button
              onClick={copyCode}
              title="Salin Kode Room"
              className="ml-1.5 p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={copyInviteLink}
              title="Salin Link Undangan"
              className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Participant count */}
          <div className="hidden md:flex items-center gap-1 text-xs text-slate-400 bg-slate-800/50 px-2.5 py-1 rounded-lg border border-slate-800">
            <Users className="w-3.5 h-3.5 text-pink-400" />
            <span>{participantCount} orang</span>
            {isHost && <span className="ml-1 text-[10px] text-amber-400 font-medium bg-amber-400/10 px-1.5 py-0.2 rounded">Host</span>}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Add Song Button */}
          <button
            onClick={onOpenSongModal}
            className="flex items-center gap-1.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-md shadow-pink-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>➕</span>
            <span className="hidden sm:inline">Tambah Lagu</span>
          </button>

          {/* Mic Toggle */}
          <button
            onClick={onToggleMute}
            className={`p-2 sm:px-3 sm:py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
            title={isMuted ? 'Nyalakan Mic (Unmute)' : 'Matikan Mic (Mute)'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />}
            <span className="hidden md:inline">{isMuted ? 'Muted' : 'Mic Aktif'}</span>
          </button>

          {/* Camera Toggle */}
          <button
            onClick={onToggleVideo}
            className={`p-2 sm:px-3 sm:py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isVideoOff
                ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30'
            }`}
            title={isVideoOff ? 'Nyalakan Kamera' : 'Matikan Kamera'}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4 text-indigo-400" />}
            <span className="hidden md:inline">{isVideoOff ? 'Kamera Mati' : 'Kamera Nyala'}</span>
          </button>

          {/* Volume & Audio Mixer Button */}
          <div className="relative">
            <button
              onClick={() => setShowVolumePopup(!showVolumePopup)}
              className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
                showVolumePopup
                  ? 'bg-pink-500/20 border-pink-500/40 text-pink-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Mixer Audio Karaoke & Mic"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Mixer Popover */}
            {showVolumePopup && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl z-50 text-slate-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-pink-400" /> Mixer Suara Karaoke
                  </h3>
                  <button
                    onClick={() => setShowVolumePopup(false)}
                    className="text-slate-500 hover:text-slate-300 text-xs"
                  >
                    ✕
                  </button>
                </div>

                {/* Music Volume (YouTube) */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1 font-medium">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Volume2 className="w-3.5 h-3.5 text-rose-400" /> Musik YouTube
                    </span>
                    <span className="text-pink-400 font-mono">{musicVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={musicVolume}
                    onChange={(e) => onMusicVolumeChange(Number(e.target.value))}
                    className="w-full accent-pink-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Mic Volume Boost */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1 font-medium">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Mic className="w-3.5 h-3.5 text-emerald-400" /> Suara Mic / Vokal
                    </span>
                    <span className="text-emerald-400 font-mono">{micVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    value={micVolume}
                    onChange={(e) => onMicVolumeChange(Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                    <span>Normal</span>
                    <span>Boost vokal</span>
                  </div>
                </div>

                {/* Reverb Toggle */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs flex items-center gap-1.5 text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Efek Reverb Vokal KTV
                  </span>
                  <button
                    onClick={onToggleReverb}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                      isKaraokeReverb
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isKaraokeReverb ? 'Aktif' : 'Nonaktif'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Leave Call Button */}
          <button
            onClick={onLeaveRoom}
            className="p-2 sm:px-3 sm:py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Keluar dari Room"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
