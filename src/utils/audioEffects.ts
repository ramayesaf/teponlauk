import { SoundEffectType } from '../types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSoundEffect(type: SoundEffectType) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (type) {
      case 'applause': {
        // Synthesize cheering crowd / applause using filtered noise bursts
        const bufferSize = ctx.sampleRate * 2.2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          // Add rhythmic clapping spikes over ambient noise
          const baseNoise = (Math.random() * 2 - 1) * 0.3;
          const clapProb = Math.random() < 0.008 ? (Math.random() * 2 - 1) * 1.5 : 0;
          data[i] = baseNoise + clapProb;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1100, now);
        filter.Q.setValueAtTime(1.5, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.6, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 2.2);
        break;
      }

      case 'cheer': {
        // High pitched resonant cheering burst
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'triangle';

        osc1.frequency.setValueAtTime(440, now);
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3);
        osc1.frequency.exponentialRampToValueAtTime(520, now + 1.2);

        osc2.frequency.setValueAtTime(550, now);
        osc2.frequency.exponentialRampToValueAtTime(1100, now + 0.35);
        osc2.frequency.exponentialRampToValueAtTime(660, now + 1.2);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1600, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.3);
        osc2.stop(now + 1.3);
        break;
      }

      case 'airhorn': {
        // DJ Reggae Airhorn sound
        const freqs = [466.16, 466.16, 554.37, 622.25]; // Bb4, Db5, Eb5
        const blastDurations = [0.12, 0.12, 0.35];

        let offset = 0;
        blastDurations.forEach((dur) => {
          freqs.forEach((f) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, now + offset);

            gain.gain.setValueAtTime(0.18, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + offset);
            osc.stop(now + offset + dur);
          });
          offset += dur + 0.06;
        });
        break;
      }

      case 'chime': {
        // Celestial harp / success chime
        const chimeNotes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        chimeNotes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.08);

          gain.gain.setValueAtTime(0.25, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.9);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.9);
        });
        break;
      }

      case 'drumroll': {
        // Fast snare roll crescendo with cymbal crash
        const rollDuration = 1.2;
        const totalHits = 24;

        for (let i = 0; i < totalHits; i++) {
          const hitTime = now + (i / totalHits) * rollDuration;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(180 + Math.random() * 40, hitTime);

          const intensity = 0.05 + (i / totalHits) * 0.25;
          gain.gain.setValueAtTime(intensity, hitTime);
          gain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.05);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(hitTime);
          osc.stop(hitTime + 0.06);
        }

        // Final Crash
        const crashTime = now + rollDuration + 0.02;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const crashFilter = ctx.createBiquadFilter();
        crashFilter.type = 'highpass';
        crashFilter.frequency.setValueAtTime(4500, crashTime);

        const crashGain = ctx.createGain();
        crashGain.gain.setValueAtTime(0.4, crashTime);
        crashGain.gain.exponentialRampToValueAtTime(0.001, crashTime + 1.5);

        noise.connect(crashFilter);
        crashFilter.connect(crashGain);
        crashGain.connect(ctx.destination);

        noise.start(crashTime);
        noise.stop(crashTime + 1.5);
        break;
      }

      case 'whistle': {
        // Excited party whistle
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.linearRampToValueAtTime(2400, now + 0.15);
        osc.frequency.linearRampToValueAtTime(2100, now + 0.35);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }
    }
  } catch (e) {
    console.warn('Audio effect playback failed:', e);
  }
}

// Microphone audio level monitor (returns cleanup function)
export function createAudioLevelMeter(
  stream: MediaStream,
  onLevelChange: (level: number, isSpeaking: boolean) => void
): () => void {
  try {
    const ctx = getAudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationFrameId: number;

    const checkLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      const normalizedLevel = Math.min(100, Math.round((avg / 128) * 100));
      const isSpeaking = normalizedLevel > 14;

      onLevelChange(normalizedLevel, isSpeaking);
      animationFrameId = requestAnimationFrame(checkLevel);
    };

    animationFrameId = requestAnimationFrame(checkLevel);

    return () => {
      cancelAnimationFrame(animationFrameId);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        // ignore
      }
    };
  } catch (err) {
    console.warn('Could not initialize audio level meter:', err);
    return () => {};
  }
}
