export interface Song {
  id: string; // unique queue item id
  videoId: string;
  title: string;
  artist?: string;
  channelTitle?: string;
  thumbnail: string;
  duration?: number; // duration in seconds
  addedBy: string; // userId
  addedByName: string;
  addedAt: number;
}

export interface Participant {
  id: string;
  name: string;
  avatarColor: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isSinging: boolean;
  joinedAt: number;
}

export interface KaraokeState {
  currentSong: Song | null;
  isPlaying: boolean;
  playbackPosition: number; // in seconds
  lastSyncTimestamp: number; // server timestamp
  playlist: Song[];
  hostOnlyControls: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  avatarColor?: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system' | 'reaction';
}

export interface RoomData {
  roomCode: string;
  hostId: string;
  createdAt: number;
  participants: Record<string, Participant>;
  karaoke: KaraokeState;
  chat: ChatMessage[];
}

export type SoundEffectType = 'applause' | 'cheer' | 'airhorn' | 'chime' | 'drumroll' | 'whistle';

export interface SoundEffectEvent {
  type: SoundEffectType;
  senderId: string;
  senderName: string;
  timestamp: number;
}

export interface PeerStreamMap {
  [peerId: string]: {
    stream: MediaStream;
    isMuted?: boolean;
    isVideoOff?: boolean;
    name?: string;
  };
}
