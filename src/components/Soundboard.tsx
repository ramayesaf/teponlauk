import React from 'react';
import { Volume2, Sparkles } from 'lucide-react';
import { SoundEffectType } from '../types';

interface SoundboardProps {
  onTriggerSound: (type: SoundEffectType) => void;
  onSendReactionEmoji: (emoji: string) => void;
}

export const Soundboard: React.FC<SoundboardProps> = ({
  onTriggerSound,
  onSendReactionEmoji,
}) => {
  const soundButtons: Array<{ type: SoundEffectType; label: string; icon: string }> = [
    { type: 'applause', label: 'Tepuk Tangan', icon: '👏' },
    { type: 'cheer', label: 'Sorakan Ramai', icon: '🎉' },
    { type: 'airhorn', label: 'DJ Airhorn', icon: '🎺' },
    { type: 'drumroll', label: 'Drumroll', icon: '🥁' },
    { type: 'chime', label: 'Nada Emas', icon: '✨' },
    { type: 'whistle', label: 'Peluit Pesta', icon: '🥳' },
  ];

  const reactionEmojis = ['🎤', '🔥', '❤️', '🌟', '🎶', '👏', '😂', '💯'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Efek Suara Panggung & Reaksi
          </h3>
        </div>
        <span className="text-[10px] text-slate-500 flex items-center gap-1">
          <Volume2 className="w-3 h-3" /> Terdengar ke Semua Room
        </span>
      </div>

      {/* Sound Effect Triggers */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
        {soundButtons.map((btn) => (
          <button
            key={btn.type}
            onClick={() => onTriggerSound(btn.type)}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-pink-500/50 hover:bg-pink-950/20 active:scale-95 transition-all text-center group"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">
              {btn.icon}
            </span>
            <span className="text-[10px] font-semibold text-slate-300 group-hover:text-pink-300">
              {btn.label}
            </span>
          </button>
        ))}
      </div>

      {/* Live Reaction Emojis Ribbon */}
      <div className="flex items-center justify-between bg-slate-950/50 rounded-xl px-3 py-1.5 border border-slate-800/80">
        <span className="text-[11px] text-slate-400 font-medium">Kirim Reaksi:</span>
        <div className="flex items-center gap-1 sm:gap-2">
          {reactionEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReactionEmoji(emoji)}
              className="text-lg hover:scale-125 active:scale-90 transition-transform p-1 rounded hover:bg-slate-800"
              title={`Kirim ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
