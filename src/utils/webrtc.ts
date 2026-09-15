export interface WebRTCSignalingCallbacks {
  sendOffer: (toUserId: string, offer: RTCSessionDescriptionInit) => void;
  sendAnswer: (toUserId: string, answer: RTCSessionDescriptionInit) => void;
  sendIceCandidate: (toUserId: string, candidate: RTCIceCandidateInit) => void;
  onRemoteStreamAdded: (peerId: string, stream: MediaStream) => void;
  onRemoteStreamRemoved: (peerId: string) => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class WebRTCManager {
  private peers = new Map<string, RTCPeerConnection>();
  private localStream: MediaStream | null = null;
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  private callbacks: WebRTCSignalingCallbacks;

  constructor(callbacks: WebRTCSignalingCallbacks) {
    this.callbacks = callbacks;
  }

  setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;

    // Update existing peer connections with new tracks
    this.peers.forEach((peer) => {
      const senders = peer.getSenders();
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            peer.addTrack(track, this.localStream!);
          }
        });
      }
    });
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const existing = this.peers.get(peerId);
    if (existing) {
      existing.close();
      this.peers.delete(peerId);
    }

    const peer = new RTCPeerConnection(RTC_CONFIG);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peer.addTrack(track, this.localStream!);
      });
    }

    // ICE Candidate handler
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        this.callbacks.sendIceCandidate(peerId, event.candidate.toJSON());
      }
    };

    // Remote track handler
    peer.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.callbacks.onRemoteStreamAdded(peerId, event.streams[0]);
      }
    };

    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'failed' || peer.iceConnectionState === 'closed') {
        this.callbacks.onRemoteStreamRemoved(peerId);
      }
    };

    this.peers.set(peerId, peer);
    return peer;
  }

  // Called when we want to call a peer (e.g. newly joined user)
  async initiateCall(peerId: string) {
    try {
      const peer = this.createPeerConnection(peerId);
      const offer = await peer.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await peer.setLocalDescription(offer);
      this.callbacks.sendOffer(peerId, offer);
    } catch (err) {
      console.warn(`Failed to initiate call to ${peerId}:`, err);
    }
  }

  // Handle received offer
  async handleOffer(fromUserId: string, offer: RTCSessionDescriptionInit) {
    try {
      const peer = this.createPeerConnection(fromUserId);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));

      // Process any buffered ice candidates
      const buffered = this.pendingCandidates.get(fromUserId) || [];
      for (const cand of buffered) {
        await peer.addIceCandidate(new RTCIceCandidate(cand));
      }
      this.pendingCandidates.delete(fromUserId);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      this.callbacks.sendAnswer(fromUserId, answer);
    } catch (err) {
      console.warn(`Failed to handle offer from ${fromUserId}:`, err);
    }
  }

  // Handle received answer
  async handleAnswer(fromUserId: string, answer: RTCSessionDescriptionInit) {
    try {
      const peer = this.peers.get(fromUserId);
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));

        // Process any buffered ice candidates
        const buffered = this.pendingCandidates.get(fromUserId) || [];
        for (const cand of buffered) {
          await peer.addIceCandidate(new RTCIceCandidate(cand));
        }
        this.pendingCandidates.delete(fromUserId);
      }
    } catch (err) {
      console.warn(`Failed to handle answer from ${fromUserId}:`, err);
    }
  }

  // Handle received ICE Candidate
  async handleIceCandidate(fromUserId: string, candidate: RTCIceCandidateInit) {
    try {
      const peer = this.peers.get(fromUserId);
      if (peer && peer.remoteDescription) {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Buffer candidate until remote description is ready
        if (!this.pendingCandidates.has(fromUserId)) {
          this.pendingCandidates.set(fromUserId, []);
        }
        this.pendingCandidates.get(fromUserId)!.push(candidate);
      }
    } catch (err) {
      console.warn(`Failed to add ICE candidate from ${fromUserId}:`, err);
    }
  }

  closePeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.close();
      this.peers.delete(peerId);
      this.callbacks.onRemoteStreamRemoved(peerId);
    }
    this.pendingCandidates.delete(peerId);
  }

  closeAll() {
    this.peers.forEach((peer, peerId) => {
      peer.close();
      this.callbacks.onRemoteStreamRemoved(peerId);
    });
    this.peers.clear();
    this.pendingCandidates.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
  }
}
