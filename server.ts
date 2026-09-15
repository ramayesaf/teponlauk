import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

interface Song {
  id: string;
  videoId: string;
  title: string;
  artist?: string;
  channelTitle?: string;
  thumbnail: string;
  duration?: number;
  addedBy: string;
  addedByName: string;
  addedAt: number;
}

interface Participant {
  id: string;
  name: string;
  avatarColor: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isSinging: boolean;
  joinedAt: number;
}

interface KaraokeState {
  currentSong: Song | null;
  isPlaying: boolean;
  playbackPosition: number;
  lastSyncTimestamp: number;
  playlist: Song[];
  hostOnlyControls: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  avatarColor?: string;
  text: string;
  timestamp: number;
  type: "chat" | "system" | "reaction";
}

interface Room {
  roomCode: string;
  hostId: string;
  createdAt: number;
  participants: Map<string, Participant>;
  karaoke: KaraokeState;
  chat: ChatMessage[];
}

const app = express();
const PORT = 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// In-memory room store
const rooms = new Map<string, Room>();
// Map ws connection to user and room
const socketMeta = new Map<WebSocket, { userId: string; roomCode: string }>();

// Helper to format room for client
function serializeRoom(room: Room) {
  const participantsObj: Record<string, Participant> = {};
  room.participants.forEach((p, id) => {
    participantsObj[id] = p;
  });

  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    createdAt: room.createdAt,
    participants: participantsObj,
    karaoke: room.karaoke,
    chat: room.chat.slice(-50), // last 50 messages
  };
}

// Broadcast to all participants in a room
function broadcastToRoom(roomCode: string, message: object, excludeWs?: WebSocket) {
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      const meta = socketMeta.get(client);
      if (meta && meta.roomCode.toUpperCase() === roomCode.toUpperCase()) {
        client.send(payload);
      }
    }
  });
}

// Send to a specific user by userId
function sendToUser(roomCode: string, targetUserId: string, message: object) {
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const meta = socketMeta.get(client);
      if (meta && meta.roomCode.toUpperCase() === roomCode.toUpperCase() && meta.userId === targetUserId) {
        client.send(payload);
      }
    }
  });
}

// API: Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", activeRooms: rooms.size });
});

// API: Check if room exists
app.get("/api/rooms/check/:code", (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ exists: false, message: "Room tidak ditemukan" });
  }
  return res.json({
    exists: true,
    roomCode: room.roomCode,
    participantCount: room.participants.size,
    currentSong: room.karaoke.currentSong,
  });
});

// API: YouTube video metadata helper (extract video ID and metadata)
app.get("/api/youtube/info", async (req, res) => {
  const input = String(req.query.query || "").trim();
  if (!input) {
    return res.status(400).json({ error: "Query atau URL YouTube dibutuhkan" });
  }

  // Extract YouTube ID from input
  let videoId = "";
  const match = input.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match) {
    videoId = match[1];
  } else if (/^[\w-]{11}$/.test(input)) {
    videoId = input;
  }

  if (videoId) {
    try {
      // Use YouTube oEmbed to fetch title and author without needing a personal API key
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl);
      if (response.ok) {
        const data = (await response.json()) as { title?: string; author_name?: string };
        return res.json({
          videoId,
          title: data.title || "YouTube Video",
          channelTitle: data.author_name || "YouTube Creator",
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        });
      }
    } catch {
      // Fallback
    }

    return res.json({
      videoId,
      title: `YouTube Karaoke Video (${videoId})`,
      channelTitle: "YouTube",
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    });
  }

  return res.status(400).json({ error: "Tidak dapat mendeteksi ID YouTube yang valid." });
});

// WebSocket Server Logic
wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const { type, payload } = msg;

      switch (type) {
        case "room:join": {
          const { roomCode: rawCode, userId, userName, avatarColor } = payload;
          const roomCode = rawCode.toUpperCase().trim();

          let room = rooms.get(roomCode);
          const isFirstUser = !room || room.participants.size === 0;

          if (!room) {
            room = {
              roomCode,
              hostId: userId,
              createdAt: Date.now(),
              participants: new Map(),
              karaoke: {
                currentSong: null,
                isPlaying: false,
                playbackPosition: 0,
                lastSyncTimestamp: Date.now(),
                playlist: [],
                hostOnlyControls: false,
              },
              chat: [],
            };
            rooms.set(roomCode, room);
          }

          const participant: Participant = {
            id: userId,
            name: userName || "Penyanyi",
            avatarColor: avatarColor || "#ec4899",
            isHost: isFirstUser || room.hostId === userId,
            isMuted: false,
            isVideoOff: true,
            isSinging: false,
            joinedAt: Date.now(),
          };

          if (isFirstUser) {
            room.hostId = userId;
          }

          room.participants.set(userId, participant);
          socketMeta.set(ws, { userId, roomCode });

          // Add system message
          const joinMsg: ChatMessage = {
            id: `sys-${Date.now()}-${Math.random()}`,
            userId: "system",
            userName: "Sistem",
            text: `${participant.name} bergabung ke room! 🎤`,
            timestamp: Date.now(),
            type: "system",
          };
          room.chat.push(joinMsg);

          // Send current state to newly joined user
          ws.send(
            JSON.stringify({
              type: "room:state",
              payload: serializeRoom(room),
            })
          );

          // Inform all other participants in the room
          broadcastToRoom(
            roomCode,
            {
              type: "participant:joined",
              payload: {
                participant,
                systemMessage: joinMsg,
              },
            },
            ws
          );
          break;
        }

        case "participant:update": {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room) return;

          const p = room.participants.get(meta.userId);
          if (p) {
            if (payload.isMuted !== undefined) p.isMuted = payload.isMuted;
            if (payload.isVideoOff !== undefined) p.isVideoOff = payload.isVideoOff;
            if (payload.isSinging !== undefined) p.isSinging = payload.isSinging;
            if (payload.name !== undefined) p.name = payload.name;

            broadcastToRoom(meta.roomCode, {
              type: "participant:updated",
              payload: { participant: p },
            });
          }
          break;
        }

        case "karaoke:add_song": {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room) return;

          const song: Song = {
            id: `song-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            videoId: payload.videoId,
            title: payload.title || "Lagu Karaoke",
            artist: payload.artist || "",
            channelTitle: payload.channelTitle || "",
            thumbnail: payload.thumbnail || `https://img.youtube.com/vi/${payload.videoId}/hqdefault.jpg`,
            duration: payload.duration || 0,
            addedBy: meta.userId,
            addedByName: payload.addedByName || "Teman",
            addedAt: Date.now(),
          };

          // If no song is currently playing or selected, set it immediately
          if (!room.karaoke.currentSong) {
            room.karaoke.currentSong = song;
            room.karaoke.isPlaying = true;
            room.karaoke.playbackPosition = 0;
            room.karaoke.lastSyncTimestamp = Date.now();
          } else {
            room.karaoke.playlist.push(song);
          }

          // System notification in chat
          const chatMsg: ChatMessage = {
            id: `song-add-${Date.now()}`,
            userId: "system",
            userName: "Karaoke",
            text: `🎵 ${song.addedByName} menambahkan "${song.title}" ke antrean playlist!`,
            timestamp: Date.now(),
            type: "system",
          };
          room.chat.push(chatMsg);

          broadcastToRoom(meta.roomCode, {
            type: "karaoke:state_updated",
            payload: {
              karaoke: room.karaoke,
              systemMessage: chatMsg,
            },
          });
          break;
        }

        case "karaoke:remove_song": {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room) return;

          const songId = payload.songId;
          room.karaoke.playlist = room.karaoke.playlist.filter((s) => s.id !== songId);

          broadcastToRoom(meta.roomCode, {
            type: "karaoke:state_updated",
            payload: { karaoke: room.karaoke },
          });
          break;
        }

        case "karaoke:play": {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room) return;

          room.karaoke.isPlaying = true;
          if (typeof payload.position === "number") {
            room.karaoke.playbackPosition = payload.position;
          }
          room.karaoke.lastSyncTimestamp = Date.now();

          broadcastToRoom(meta.roomCode, {
            type: "karaoke:sync",
            payload: {
              isPlaying: true,
              playbackPosition: room.karaoke.playbackPosition,
              timestamp: room.karaoke.lastSyncTimestamp,
              senderId: meta.userId,
            },
          });
          break;
        }

        case "karaoke:pause": {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room) return;

          room.karaoke.isPlaying = false;
          if (typeof payload.position === "number") {
            room.karaoke.playbackPosition = payload.position;
          }
          room.karaoke.lastSyncTimestamp = Date.now();

          broadcastToRoom(meta.roomCode, {
            type: "karaoke:sync",
            payload: {
              isPlaying: false,
              playbackPosition: room.karaoke.playbackPosition,
              timestamp: room.karaoke.lastSyncTimestamp,
              senderId: meta.userId,
            },
          });
          break;
        }

        case "karaoke:seek": {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room) return;

          room.karaoke.playbackPosition = payload.position;
          room.karaoke.lastSyncTimestamp = Date.now();

          broadcastToRoom(meta.roomCode, {
            type: "karaoke:sync",
            payload: {
              isPlaying: room.karaoke.isPlaying,
              playbackPosition: room.karaoke.playbackPosition,
              timestamp: room.karaoke.lastSyncTimestamp,
              senderId: meta.userId,
            },
          });
          break;
        }

        case "karaoke:next": {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room) return;

          if (room.karaoke.playlist.length > 0) {
            const nextSong = room.karaoke.playlist.shift()!;
            room.karaoke.currentSong = nextSong;
            room.karaoke.isPlaying = true;
            room.karaoke.playbackPosition = 0;
            room.karaoke.lastSyncTimestamp = Date.now();
          } else {
            room.karaoke.currentSong = null;
            room.karaoke.isPlaying = false;
            room.karaoke.playbackPosition = 0;
            room.karaoke.lastSyncTimestamp = Date.now();
          }

          broadcastToRoom(meta.roomCode, {
            type: "karaoke:state_updated",
            payload: { karaoke: room.karaoke },
          });
          break;
        }

        case "karaoke:reorder": {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room) return;

          if (Array.isArray(payload.playlist)) {
            room.karaoke.playlist = payload.playlist;
            broadcastToRoom(meta.roomCode, {
              type: "karaoke:state_updated",
              payload: { karaoke: room.karaoke },
            });
          }
          break;
        }

        case "karaoke:toggle_host_only": {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.userId) return;

          room.karaoke.hostOnlyControls = !!payload.hostOnly;
          broadcastToRoom(meta.roomCode, {
            type: "karaoke:state_updated",
            payload: { karaoke: room.karaoke },
          });
          break;
        }

        case "chat:send": {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room) return;

          const sender = room.participants.get(meta.userId);
          const newMsg: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            userId: meta.userId,
            userName: sender ? sender.name : "Teman",
            avatarColor: sender ? sender.avatarColor : "#ec4899",
            text: payload.text,
            timestamp: Date.now(),
            type: payload.type || "chat",
          };

          room.chat.push(newMsg);
          if (room.chat.length > 80) room.chat.shift();

          broadcastToRoom(meta.roomCode, {
            type: "chat:message",
            payload: { message: newMsg },
          });
          break;
        }

        case "sound_effect:trigger": {
          const meta = socketMeta.get(ws);
          if (!meta) return;

          broadcastToRoom(meta.roomCode, {
            type: "sound_effect:play",
            payload: {
              soundType: payload.soundType,
              senderId: meta.userId,
              senderName: payload.senderName || "Teman",
              timestamp: Date.now(),
            },
          });
          break;
        }

        // WebRTC Signaling
        case "webrtc:offer": {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const { toUserId, offer } = payload;
          sendToUser(meta.roomCode, toUserId, {
            type: "webrtc:offer",
            payload: {
              fromUserId: meta.userId,
              offer,
            },
          });
          break;
        }

        case "webrtc:answer": {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const { toUserId, answer } = payload;
          sendToUser(meta.roomCode, toUserId, {
            type: "webrtc:answer",
            payload: {
              fromUserId: meta.userId,
              answer,
            },
          });
          break;
        }

        case "webrtc:ice_candidate": {
          const meta = socketMeta.get(ws);
          if (!meta) return;
          const { toUserId, candidate } = payload;
          sendToUser(meta.roomCode, toUserId, {
            type: "webrtc:ice_candidate",
            payload: {
              fromUserId: meta.userId,
              candidate,
            },
          });
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error("WebSocket message processing error:", err);
    }
  });

  ws.on("close", () => {
    const meta = socketMeta.get(ws);
    if (meta) {
      socketMeta.delete(ws);
      const room = rooms.get(meta.roomCode);
      if (room) {
        const leavingParticipant = room.participants.get(meta.userId);
        room.participants.delete(meta.userId);

        if (room.participants.size === 0) {
          // If room empty, clean up after 15 minutes
          setTimeout(() => {
            if (room.participants.size === 0) {
              rooms.delete(meta.roomCode);
            }
          }, 15 * 60 * 1000);
        } else {
          // Reassign host if host left
          if (room.hostId === meta.userId) {
            const nextHost = room.participants.keys().next().value;
            if (nextHost) {
              room.hostId = nextHost;
              const p = room.participants.get(nextHost);
              if (p) p.isHost = true;
            }
          }

          const leaveMsg: ChatMessage = {
            id: `leave-${Date.now()}`,
            userId: "system",
            userName: "Sistem",
            text: `${leavingParticipant?.name || "Seseorang"} meninggalkan room.`,
            timestamp: Date.now(),
            type: "system",
          };
          room.chat.push(leaveMsg);

          broadcastToRoom(meta.roomCode, {
            type: "participant:left",
            payload: {
              userId: meta.userId,
              newHostId: room.hostId,
              systemMessage: leaveMsg,
            },
          });
        }
      }
    }
  });
});

// Vite middleware / production serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Karaoke Room & Free Call server running on http://localhost:${PORT}`);
  });
}

start();
