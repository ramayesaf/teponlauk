import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Music2, 
  Lock, 
  Unlock,
  Sparkles,
  Plus
} from 'lucide-react';
import { KaraokeState, Song, SoundEffectEvent } from '../types';

interface KaraokePlayerProps {
  karaokeState: KaraokeState;
  isHost: boolean;
  userId: string;
  musicVolume: number;
  recentReactions: Array<{ id: string; emoji: string; x: number }>;
  activeSoundEffect: SoundEffectEvent | null;
  onPlay: (position: number) => void;
  onPause: (position: number) => void;
  onSeek: (position: number) => void;
  onNextSong: () => void;
  onToggleHostOnly: (hostOnly: boolean) => void;
  onOpenSongModal: () => void;
}

// Global typing for YouTube IFrame API
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string | HTMLElement,
        config: {
          videoId?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  cueVideoById: (videoId: string, startSeconds?: number) => void;
  destroy: () => void;
}

export const KaraokePlayer: React.FC<KaraokePlayerProps> = ({
  karaokeState,
  isHost,
  musicVolume,
  recentReactions,
  activeSoundEffect,
  onPlay,
  onPause,
  onSeek,
  onNextSong,
  onToggleHostOnly,
  onOpenSongModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isUserDraggingSlider, setIsUserDraggingSlider] = useState(false);
  const [isMutedLocal, setIsMutedLocal] = useState(false);

  const currentSong = karaokeState.currentSong;
  const isPlaying = karaokeState.isPlaying;
  const canControl = !karaokeState.hostOnlyControls || isHost;

  // Calculate projected sync time based on server timestamp
  const calculateProjectedTime = useCallback(() => {
    if (!karaokeState.isPlaying) return karaokeState.playbackPosition;
    const elapsedSeconds = (Date.now() - karaokeState.lastSyncTimestamp) / 1000;
    return Math.max(0, karaokeState.playbackPosition + elapsedSeconds);
  }, [karaokeState.isPlaying, karaokeState.playbackPosition, karaokeState.lastSyncTimestamp]);

  // Load YouTube IFrame API script
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize or re-create YouTube Player when currentSong changes
  useEffect(() => {
    let checkInterval: NodeJS.Timeout | null = null;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        return false;
      }

      if (!currentSong) {
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch {
            // ignore
          }
          playerRef.current = null;
        }
        setIsPlayerReady(false);
        return true;
      }

      // If player already exists, load the new video
      if (playerRef.current) {
        const startPos = calculateProjectedTime();
        try {
          playerRef.current.loadVideoById(currentSong.videoId, startPos);
          if (karaokeState.isPlaying) {
            playerRef.current.playVideo();
          } else {
            playerRef.current.pauseVideo();
          }
        } catch (e) {
          console.warn('Error loading new video into existing player:', e);
        }
        return true;
      }

      // Create new player
      const startPos = calculateProjectedTime();
      try {
        playerRef.current = new window.YT.Player('youtube-player-element', {
          videoId: currentSong.videoId,
          playerVars: {
            autoplay: karaokeState.isPlaying ? 1 : 0,
            controls: 0, // Custom synchronized controls
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            start: Math.floor(startPos),
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              setIsPlayerReady(true);
              event.target.setVolume(musicVolume);
              if (karaokeState.isPlaying) {
                event.target.playVideo();
              } else {
                event.target.pauseVideo();
              }
            },
            onStateChange: (event) => {
              // Video ended -> trigger next song
              if (event.data === window.YT.PlayerState.ENDED) {
                onNextSong();
              }
            },
          },
        });
      } catch (err) {
        console.warn('Failed to create YouTube player:', err);
      }
      return true;
    };

    if (!initPlayer()) {
      checkInterval = setInterval(() => {
        if (initPlayer() && checkInterval) {
          clearInterval(checkInterval);
        }
      }, 250);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [currentSong?.videoId]);

  // Adjust volume
  useEffect(() => {
    if (playerRef.current && isPlayerReady) {
      try {
        playerRef.current.setVolume(isMutedLocal ? 0 : musicVolume);
      } catch {
        // ignore
      }
    }
  }, [musicVolume, isMutedLocal, isPlayerReady]);

  // Synchronize play/pause state from room broadcast
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady) return;

    try {
      const projected = calculateProjectedTime();
      const current = playerRef.current.getCurrentTime();
      const drift = Math.abs(current - projected);

      // Resync position if drift exceeds 1.5 seconds
      if (drift > 1.5) {
        playerRef.current.seekTo(projected, true);
      }

      if (karaokeState.isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch {
      // ignore
    }
  }, [karaokeState.isPlaying, karaokeState.playbackPosition, karaokeState.lastSyncTimestamp, isPlayerReady]);

  // Periodic time update ticker for UI progress bar
  useEffect(() => {
    const timer = setInterval(() => {
      if (playerRef.current && isPlayerReady) {
        try {
          const cur = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || 0;
          if (!isUserDraggingSlider) {
            setCurrentTime(cur);
          }
          setDuration(dur);
        } catch {
          // ignore
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [isPlayerReady, isUserDraggingSlider]);

  // Handle Play Click
  const handlePlayToggle = () => {
    if (!canControl) return;
    const nowPos = playerRef.current ? playerRef.current.getCurrentTime() : currentTime;
    if (isPlaying) {
      onPause(nowPos);
    } else {
      onPlay(nowPos);
    }
  };

  // Handle Seek Slider Change
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = Number(e.target.value);
    setCurrentTime(target);
  };

  const handleSeekCommit = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setIsUserDraggingSlider(false);
    if (!canControl) return;
    const target = Number((e.target as HTMLInputElement).value);
    if (playerRef.current) {
      playerRef.current.seekTo(target, true);
    }
    onSeek(target);
  };

  const handleReplay = () => {
    if (!canControl) return;
    if (playerRef.current) {
      playerRef.current.seekTo(0, true);
    }
    onSeek(0);
    if (!isPlaying) onPlay(0);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Format time (e.g. 195s -> "03:15")
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex flex-col ${
        isFullscreen ? 'h-screen' : 'aspect-video max-h-[560px]'
      }`}
    >
      {/* Floating Animated Reaction Sprinkles */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {recentReactions.map((r) => (
          <div
            key={r.id}
            className="absolute text-4xl animate-bounce"
            style={{
              left: `${r.x}%`,
              bottom: '15%',
              animationDuration: '2s',
              transition: 'all 2s ease-out',
            }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Active Sound Effect Banner Overlay */}
      {activeSoundEffect && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-pulse">
          <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 text-white text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 border border-white/20">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>
              {activeSoundEffect.senderName} memainkan efek {activeSoundEffect.type.toUpperCase()}!
            </span>
          </div>
        </div>
      )}

      {/* Video Display Area */}
      <div className="relative flex-1 w-full h-full bg-slate-950 flex items-center justify-center">
        {currentSong ? (
          <div className="relative w-full h-full">
            <div id="youtube-player-element" className="w-full h-full" />
            {/* Click to play/pause blocker so user doesn't trigger un-synced internal player events */}
            <div
              onClick={handlePlayToggle}
              className="absolute inset-0 cursor-pointer z-10"
              title={canControl ? (isPlaying ? 'Klik untuk Jeda' : 'Klik untuk Putar') : 'Kontrol dikunci host'}
            />
          </div>
        ) : (
          /* Empty Stage Placeholder */
          <div className="text-center p-6 max-w-md mx-auto z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center mx-auto mb-4 text-pink-400">
              <Music2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Panggung Karaoke Siap!</h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Belum ada lagu yang diputar di room ini. Pilih lagu dari katalog populer atau tempelkan link YouTube musik & lirik karaoke favoritmu!
            </p>
            <button
              onClick={onOpenSongModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-pink-600/25 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Pilih Lagu Karaoke Sekarang</span>
            </button>
          </div>
        )}
      </div>

      {/* Synchronized Control Bar */}
      {currentSong && (
        <div className="relative z-20 bg-slate-900/95 backdrop-blur border-t border-slate-800/80 px-4 py-2.5 text-white">
          {/* Progress & Scrub Slider */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              disabled={!canControl}
              onMouseDown={() => setIsUserDraggingSlider(true)}
              onTouchStart={() => setIsUserDraggingSlider(true)}
              onChange={handleSeekChange}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              className="flex-1 h-1.5 bg-slate-700 rounded-lg accent-pink-500 cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="text-[11px] font-mono text-slate-400 w-10">
              {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* Song Meta info */}
            <div className="flex items-center gap-3 min-w-0 max-w-[40%]">
              <img
                src={currentSong.thumbnail}
                alt={currentSong.title}
                className="w-10 h-10 rounded-lg object-cover border border-slate-700 hidden sm:block shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate" title={currentSong.title}>
                  {currentSong.title}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  Dipilih oleh <span className="text-pink-400 font-medium">{currentSong.addedByName}</span>
                </p>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleReplay}
                disabled={!canControl}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                title="Putar Ulang dari Awal"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handlePlayToggle}
                disabled={!canControl}
                className="w-10 h-10 rounded-full bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center shadow-lg shadow-pink-600/30 disabled:opacity-40 transition-all hover:scale-105"
                title={isPlaying ? 'Jeda' : 'Putar'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <button
                onClick={onNextSong}
                disabled={!canControl}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                title="Lagu Berikutnya"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Secondary Controls (Lock, Volume, Fullscreen) */}
            <div className="flex items-center gap-2">
              {/* Host Lock Toggle */}
              {isHost && (
                <button
                  onClick={() => onToggleHostOnly(!karaokeState.hostOnlyControls)}
                  className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                    karaokeState.hostOnlyControls
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={
                    karaokeState.hostOnlyControls
                      ? 'Hanya Host yang dapat mengontrol (Klik untuk buka untuk semua)'
                      : 'Semua teman dapat mengontrol lagu (Klik untuk kunci ke host)'
                  }
                >
                  {karaokeState.hostOnlyControls ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4" />}
                </button>
              )}

              {/* Local Video Mute */}
              <button
                onClick={() => setIsMutedLocal(!isMutedLocal)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden sm:block"
                title={isMutedLocal ? 'Unmute Musik' : 'Mute Musik'}
              >
                {isMutedLocal ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh Karaoke'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
