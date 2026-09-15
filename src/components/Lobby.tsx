import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Users, 
  Play, 
  Plus, 
  Music, 
  Sparkles, 
  Radio, 
  HelpCircle,
  Headphones
} from 'lucide-react';
import { createAudioLevelMeter } from '../utils/audioEffects';

interface LobbyProps {
  initialRoomCode?: string;
  onJoinOrCreateRoom: (config: {
    roomCode: string;
    userName: string;
    avatarColor: string;
    initialMuted: boolean;
    initialVideoOff: boolean;
    mediaStream: MediaStream | null;
  }) => void;
}

const AVATAR_COLORS = [
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

export const Lobby: React.FC<LobbyProps> = ({
  initialRoomCode = '',
  onJoinOrCreateRoom,
}) => {
  const [mode, setMode] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [userName, setUserName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Generate random room code
  const generateRoomCode = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `KARA-${num}`;
  };

  const [generatedCode] = useState(generateRoomCode());

  // Set default guest name if empty
  useEffect(() => {
    const savedName = localStorage.getItem('karaoke_username');
    if (savedName) {
      setUserName(savedName);
    } else {
      const defaultNames = ['Bintang Nada', 'Penyanyi Hepi', 'Vokalis Handal', 'Sahabat Karaoke', 'Sobat Duet'];
      const randomName = defaultNames[Math.floor(Math.random() * defaultNames.length)];
      setUserName(randomName);
    }
  }, []);

  // Request user media for preview and call
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cleanupMeter: (() => void) | null = null;

    async function initMedia() {
      setIsLoadingDevices(true);
      setPermissionError(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false, // Better for karaoke music/singing
            autoGainControl: true,
          },
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
        });

        setLocalStream(stream);

        // Connect to audio meter
        cleanupMeter = createAudioLevelMeter(stream, (level, speaking) => {
          setMicLevel(level);
          setIsSpeaking(speaking);
        });
      } catch (err) {
        console.warn('Could not get audio/video media:', err);
        // Attempt audio-only if video fails
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setLocalStream(stream);
          setIsVideoOff(true);
          cleanupMeter = createAudioLevelMeter(stream, (level, speaking) => {
            setMicLevel(level);
            setIsSpeaking(speaking);
          });
        } catch {
          setPermissionError('Akses mikrofon atau kamera tidak diizinkan atau tidak tersedia. Anda tetap dapat masuk dan menikmati musik karaoke.');
        }
      } finally {
        setIsLoadingDevices(false);
      }
    }

    initMedia();

    return () => {
      if (cleanupMeter) cleanupMeter();
    };
  }, []);

  // Update video element with stream
  useEffect(() => {
    if (videoPreviewRef.current && localStream) {
      videoPreviewRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff]);

  // Toggle local mute state in preview
  const handleToggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((t) => (t.enabled = isMuted));
    }
    setIsMuted(!isMuted);
  };

  // Toggle local video state in preview
  const handleToggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((t) => (t.enabled = isVideoOff));
    }
    setIsVideoOff(!isVideoOff);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = userName.trim() || 'Penyanyi';
    localStorage.setItem('karaoke_username', finalName);

    const targetCode = mode === 'create' ? generatedCode : roomCodeInput.trim().toUpperCase();
    if (!targetCode) return;

    onJoinOrCreateRoom({
      roomCode: targetCode,
      userName: finalName,
      avatarColor: selectedColor,
      initialMuted: isMuted,
      initialVideoOff: isVideoOff,
      mediaStream: localStream,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 px-3 py-1 rounded-full text-pink-400 text-xs font-semibold mb-3">
            <Radio className="w-3 h-3 animate-pulse text-emerald-400" /> Free Call & Sinkronisasi Karaoke Bersama
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Karaoke<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400">Call</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Masuk ke room karaoke dengan kode, lakukan panggilan gratis, dan nyanyikan lagu pilihan dari YouTube bersama teman secara realtime!
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Camera & Mic Pre-check (5 cols) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <div className="w-full relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-4/3 flex items-center justify-center shadow-inner">
              {/* Video Preview */}
              {localStream && !isVideoOff && localStream.getVideoTracks().length > 0 ? (
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-4">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg mb-2"
                    style={{ backgroundColor: selectedColor }}
                  >
                    {userName ? userName.slice(0, 2).toUpperCase() : '🎤'}
                  </div>
                  <span className="text-xs text-slate-500">
                    {isVideoOff ? 'Kamera Dimatikan' : isLoadingDevices ? 'Memuat Kamera...' : 'Kamera Tidak Terdeteksi'}
                  </span>
                </div>
              )}

              {/* Mic Level Indicator on Camera Preview */}
              <div className="absolute bottom-3 left-3 right-3 bg-slate-950/80 backdrop-blur rounded-xl px-3 py-1.5 flex items-center gap-2 border border-slate-800">
                <Mic className={`w-3.5 h-3.5 ${isSpeaking ? 'text-emerald-400' : 'text-slate-400'}`} />
                <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${
                      isMuted ? 'bg-slate-600' : micLevel > 40 ? 'bg-pink-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: isMuted ? '0%' : `${Math.min(100, micLevel * 2)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {isMuted ? 'Muted' : isSpeaking ? 'Suara OK' : 'Tes Mic'}
                </span>
              </div>
            </div>

            {/* Mic and Camera Pre-toggle Buttons */}
            <div className="flex items-center gap-3 mt-3 w-full justify-center">
              <button
                type="button"
                onClick={handleToggleMute}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isMuted ? 'Mic Muted' : 'Mic Nyala'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleVideo}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  isVideoOff
                    ? 'bg-slate-800 text-slate-400 border border-slate-700'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                <span>{isVideoOff ? 'Kamera Mati' : 'Kamera Nyala'}</span>
              </button>
            </div>

            {permissionError && (
              <p className="text-[11px] text-amber-400/90 text-center mt-2 leading-tight">
                ℹ️ {permissionError}
              </p>
            )}
          </div>

          {/* Right Column: Room Mode & Form (7 cols) */}
          <div className="md:col-span-7 flex flex-col justify-between">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-4">
              <button
                type="button"
                onClick={() => setMode('create')}
                className={`py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                  mode === 'create'
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-4 h-4" /> Buat Room Baru
              </button>
              <button
                type="button"
                onClick={() => setMode('join')}
                className={`py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                  mode === 'join'
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" /> Masuk dengan Kode
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Anda / Panggilan Panggung:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan nama Anda..."
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Avatar Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Warna Avatar Panggung:
                </label>
                <div className="flex items-center gap-2">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        selectedColor === color ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Room Code Section */}
              {mode === 'create' ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Kode Room yang akan dibuat:
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xl font-extrabold tracking-widest text-pink-400">
                      {generatedCode}
                    </span>
                    <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">
                      Anda sebagai Pembuat Room (Host)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Teman-teman Anda dapat bergabung dengan memasukkan kode ini atau melalui tautan room!
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Masukkan Kode Room Pembuat:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: KARA-4821"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono tracking-widest text-white uppercase placeholder:text-slate-500 placeholder:normal-case focus:outline-none focus:border-pink-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Minta kode 6 karakter dari teman yang membuat room karaoke.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 hover:from-pink-500 hover:to-rose-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-pink-600/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{mode === 'create' ? 'Mulai & Buka Room Karaoke' : 'Masuk ke Room Karaoke'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Feature Highlights Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Free Voice & Video Call</h4>
              <p className="text-[11px] text-slate-400">Bicara dan nyanyi langsung tanpa batasan waktu.</p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Playlist YouTube Sinkron</h4>
              <p className="text-[11px] text-slate-400">Putar video & musik bersamaan di layar semua peserta.</p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Efek Suara Panggung</h4>
              <p className="text-[11px] text-slate-400">Tepuk tangan, sorakan, dan airhorn untuk keseruan!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
