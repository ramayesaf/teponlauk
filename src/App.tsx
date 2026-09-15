import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { KaraokePlayer } from './components/KaraokePlayer';
import { CallGrid } from './components/CallGrid';
import { PlaylistQueue } from './components/PlaylistQueue';
import { Soundboard } from './components/Soundboard';
import { RoomChat } from './components/RoomChat';
import { Lobby } from './components/Lobby';
import { RoomData, Song, SoundEffectType, SoundEffectEvent, Participant } from './types';
import { WebRTCManager } from './utils/webrtc';
import { playSoundEffect, createAudioLevelMeter } from './utils/audioEffects';

export default function App() {
  // Check if room code was passed in URL query e.g. ?room=KARA-1234
  const queryRoomCode = new URLSearchParams(window.location.search).get('room') || '';

  // Room & Identity state
  const [inRoom, setInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState(queryRoomCode);
  const [userId] = useState(() => `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  const [userName, setUserName] = useState('Penyanyi');
  const [avatarColor, setAvatarColor] = useState('#ec4899');
  const [isHost, setIsHost] = useState(false);

  // Audio / Video control state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [musicVolume, setMusicVolume] = useState(80);
  const [micVolume, setMicVolume] = useState(100);
  const [isKaraokeReverb, setIsKaraokeReverb] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);

  // Room Data State
  const [roomData, setRoomData] = useState<RoomData>({
    roomCode: '',
    hostId: '',
    createdAt: Date.now(),
    participants: {},
    karaoke: {
      currentSong: null,
      isPlaying: false,
      playbackPosition: 0,
      lastSyncTimestamp: Date.now(),
      playlist: [],
      hostOnlyControls: false,
    },
    chat: [],
  });

  // UI Modals & Effects State
  const [isAddSongModalOpen, setIsAddSongModalOpen] = useState(false);
  const [recentReactions, setRecentReactions] = useState<Array<{ id: string; emoji: string; x: number }>>([]);
  const [activeSoundEffect, setActiveSoundEffect] = useState<SoundEffectEvent | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const audioMeterCleanupRef = useRef<(() => void) | null>(null);

  // Send message helper
  const sendWs = useCallback((type: string, payload: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  // WebRTC initialization
  const initWebRTC = useCallback(() => {
    if (webrtcRef.current) return webrtcRef.current;

    const rtc = new WebRTCManager({
      sendOffer: (toUserId, offer) => {
        sendWs('webrtc:offer', { toUserId, offer });
      },
      sendAnswer: (toUserId, answer) => {
        sendWs('webrtc:answer', { toUserId, answer });
      },
      sendIceCandidate: (toUserId, candidate) => {
        sendWs('webrtc:ice_candidate', { toUserId, candidate });
      },
      onRemoteStreamAdded: (peerId, stream) => {
        setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
      },
      onRemoteStreamRemoved: (peerId) => {
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      },
    });

    webrtcRef.current = rtc;
    return rtc;
  }, [sendWs]);

  // Handle joining or creating room from Lobby
  const handleJoinOrCreate = (config: {
    roomCode: string;
    userName: string;
    avatarColor: string;
    initialMuted: boolean;
    initialVideoOff: boolean;
    mediaStream: MediaStream | null;
  }) => {
    setRoomCode(config.roomCode);
    setUserName(config.userName);
    setAvatarColor(config.avatarColor);
    setIsMuted(config.initialMuted);
    setIsVideoOff(config.initialVideoOff);
    setLocalStream(config.mediaStream);

    // Update URL param with room code
    const newUrl = `${window.location.pathname}?room=${config.roomCode}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    // Initialize WebRTC with media stream
    const rtc = initWebRTC();
    if (config.mediaStream) {
      rtc.setLocalStream(config.mediaStream);

      // Start audio meter
      audioMeterCleanupRef.current = createAudioLevelMeter(config.mediaStream, (level, speaking) => {
        setLocalAudioLevel(level);
        setIsLocalSpeaking(speaking);
      });
    }

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'room:join',
          payload: {
            roomCode: config.roomCode,
            userId,
            userName: config.userName,
            avatarColor: config.avatarColor,
          },
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, payload } = msg;

        switch (type) {
          case 'room:state': {
            setRoomData(payload);
            setIsHost(payload.hostId === userId);
            setInRoom(true);
            break;
          }

          case 'participant:joined': {
            const { participant, systemMessage } = payload;
            setRoomData((prev) => ({
              ...prev,
              participants: {
                ...prev.participants,
                [participant.id]: participant,
              },
              chat: [...prev.chat, systemMessage],
            }));

            // If we are already in the room and a new peer joined, call them!
            if (participant.id !== userId && webrtcRef.current) {
              webrtcRef.current.initiateCall(participant.id);
            }
            break;
          }

          case 'participant:left': {
            const { userId: leftId, newHostId, systemMessage } = payload;
            setRoomData((prev) => {
              const updated = { ...prev.participants };
              delete updated[leftId];
              return {
                ...prev,
                hostId: newHostId,
                participants: updated,
                chat: [...prev.chat, systemMessage],
              };
            });
            setIsHost(newHostId === userId);
            if (webrtcRef.current) {
              webrtcRef.current.closePeer(leftId);
            }
            break;
          }

          case 'participant:updated': {
            const { participant } = payload;
            setRoomData((prev) => ({
              ...prev,
              participants: {
                ...prev.participants,
                [participant.id]: participant,
              },
            }));
            break;
          }

          case 'karaoke:sync': {
            setRoomData((prev) => ({
              ...prev,
              karaoke: {
                ...prev.karaoke,
                isPlaying: payload.isPlaying,
                playbackPosition: payload.playbackPosition,
                lastSyncTimestamp: payload.timestamp,
              },
            }));
            break;
          }

          case 'karaoke:state_updated': {
            setRoomData((prev) => ({
              ...prev,
              karaoke: payload.karaoke,
              chat: payload.systemMessage ? [...prev.chat, payload.systemMessage] : prev.chat,
            }));
            break;
          }

          case 'chat:message': {
            setRoomData((prev) => ({
              ...prev,
              chat: [...prev.chat, payload.message],
            }));
            break;
          }

          case 'sound_effect:play': {
            playSoundEffect(payload.soundType);
            setActiveSoundEffect({
              type: payload.soundType,
              senderId: payload.senderId,
              senderName: payload.senderName,
              timestamp: payload.timestamp,
            });
            setTimeout(() => setActiveSoundEffect(null), 3000);
            break;
          }

          // WebRTC Signaling handlers
          case 'webrtc:offer': {
            if (webrtcRef.current) {
              webrtcRef.current.handleOffer(payload.fromUserId, payload.offer);
            }
            break;
          }

          case 'webrtc:answer': {
            if (webrtcRef.current) {
              webrtcRef.current.handleAnswer(payload.fromUserId, payload.answer);
            }
            break;
          }

          case 'webrtc:ice_candidate': {
            if (webrtcRef.current) {
              webrtcRef.current.handleIceCandidate(payload.fromUserId, payload.candidate);
            }
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('Failed to parse incoming WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      // Cleanup on disconnect
    };
  };

  // Leave room
  const handleLeaveRoom = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (webrtcRef.current) {
      webrtcRef.current.closeAll();
      webrtcRef.current = null;
    }
    if (audioMeterCleanupRef.current) {
      audioMeterCleanupRef.current();
      audioMeterCleanupRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    setRemoteStreams({});
    setInRoom(false);
    // Clear room query param
    window.history.pushState({}, '', window.location.pathname);
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !nextState;
      });
    }
    sendWs('participant:update', { isMuted: nextState });
  };

  // Toggle Video
  const handleToggleVideo = () => {
    const nextState = !isVideoOff;
    setIsVideoOff(nextState);
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !nextState;
      });
    }
    sendWs('participant:update', { isVideoOff: nextState });
  };

  // Toggle Singing Mode
  const handleToggleSinging = (singing: boolean) => {
    sendWs('participant:update', { isSinging: singing });
  };

  // Karaoke Player Actions
  const handlePlay = (position: number) => {
    sendWs('karaoke:play', { position });
  };

  const handlePause = (position: number) => {
    sendWs('karaoke:pause', { position });
  };

  const handleSeek = (position: number) => {
    sendWs('karaoke:seek', { position });
  };

  const handleNextSong = () => {
    sendWs('karaoke:next', {});
  };

  const handleAddSong = (song: Omit<Song, 'id' | 'addedAt'>) => {
    sendWs('karaoke:add_song', song);
  };

  const handleRemoveSong = (songId: string) => {
    sendWs('karaoke:remove_song', { songId });
  };

  const handleReorderPlaylist = (playlist: Song[]) => {
    sendWs('karaoke:reorder', { playlist });
  };

  const handleToggleHostOnly = (hostOnly: boolean) => {
    sendWs('karaoke:toggle_host_only', { hostOnly });
  };

  // Chat message send
  const handleSendMessage = (text: string) => {
    sendWs('chat:send', { text, type: 'chat' });
  };

  // Sound effect trigger
  const handleTriggerSound = (type: SoundEffectType) => {
    playSoundEffect(type);
    sendWs('sound_effect:trigger', { soundType: type, senderName: userName });
  };

  // Live reaction floaters
  const handleSendReactionEmoji = (emoji: string) => {
    // Send as chat reaction
    sendWs('chat:send', { text: emoji, type: 'reaction' });

    // Add local visual floater
    const newReaction = {
      id: `${Date.now()}-${Math.random()}`,
      emoji,
      x: 20 + Math.random() * 60, // random x between 20% and 80%
    };
    setRecentReactions((prev) => [...prev.slice(-15), newReaction]);
    setTimeout(() => {
      setRecentReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2500);
  };

  // Participants array for components
  const participantsList = Object.values(roomData.participants);

  // Render Lobby screen if not in room
  if (!inRoom) {
    return (
      <Lobby
        initialRoomCode={roomCode}
        onJoinOrCreateRoom={handleJoinOrCreate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-pink-500 selection:text-white">
      {/* Room Navigation Bar */}
      <Navbar
        roomCode={roomCode}
        isHost={isHost}
        participantCount={participantsList.length}
        participants={participantsList}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        musicVolume={musicVolume}
        micVolume={micVolume}
        isKaraokeReverb={isKaraokeReverb}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onMusicVolumeChange={setMusicVolume}
        onMicVolumeChange={setMicVolume}
        onToggleReverb={() => setIsKaraokeReverb(!isKaraokeReverb)}
        onLeaveRoom={handleLeaveRoom}
        onOpenSongModal={() => setIsAddSongModalOpen(true)}
      />

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col gap-5">
        {/* Top Section: YouTube Synchronized Karaoke Player */}
        <section className="w-full">
          <KaraokePlayer
            karaokeState={roomData.karaoke}
            isHost={isHost}
            userId={userId}
            musicVolume={musicVolume}
            recentReactions={recentReactions}
            activeSoundEffect={activeSoundEffect}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onNextSong={handleNextSong}
            onToggleHostOnly={handleToggleHostOnly}
            onOpenSongModal={() => setIsAddSongModalOpen(true)}
          />
        </section>

        {/* Free Call Video Feeds Ribbon */}
        <section className="w-full">
          <CallGrid
            participants={participantsList}
            localUserId={userId}
            localStream={localStream}
            remoteStreams={remoteStreams}
            localAudioLevel={localAudioLevel}
            isLocalSpeaking={isLocalSpeaking}
            onToggleSinging={handleToggleSinging}
            pinnedUserId={pinnedUserId}
            onPinUser={setPinnedUserId}
          />
        </section>

        {/* Live Soundboard & Reactions */}
        <section className="w-full">
          <Soundboard
            onTriggerSound={handleTriggerSound}
            onSendReactionEmoji={handleSendReactionEmoji}
          />
        </section>

        {/* Bottom Section: Playlist Queue (Left) and Room Chat (Right) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
          {/* Playlist Queue (7 cols on lg) */}
          <div className="lg:col-span-7 h-[460px]">
            <PlaylistQueue
              karaokeState={roomData.karaoke}
              isHost={isHost}
              localUserId={userId}
              localUserName={userName}
              onAddSong={handleAddSong}
              onRemoveSong={handleRemoveSong}
              onReorderPlaylist={handleReorderPlaylist}
              isAddModalOpen={isAddSongModalOpen}
              onCloseAddModal={() => setIsAddSongModalOpen(false)}
              onOpenAddModal={() => setIsAddSongModalOpen(true)}
            />
          </div>

          {/* Room Chat & Sorakan (5 cols on lg) */}
          <div className="lg:col-span-5 h-[460px]">
            <RoomChat
              chatMessages={roomData.chat}
              localUserId={userId}
              onSendMessage={handleSendMessage}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
