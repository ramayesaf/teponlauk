import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';

interface RoomChatProps {
  chatMessages: ChatMessage[];
  localUserId: string;
  onSendMessage: (text: string) => void;
}

export const RoomChat: React.FC<RoomChatProps> = ({
  chatMessages,
  localUserId,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const quickCheerChips = ['🎤 Asik bangett!', '🔥 Suaranya pecah!', '👏 Tepuk tangann!', 'Gantian lagu ya!'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-pink-400" />
          <h2 className="text-sm font-bold text-white">Obrolan & Sorak Room</h2>
        </div>
        <span className="text-[11px] text-slate-500">Live Chat</span>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800 min-h-[200px] max-h-[360px]">
        {chatMessages.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <Sparkles className="w-6 h-6 mx-auto text-slate-700 mb-1" />
            <p>Belum ada pesan.</p>
            <p className="text-[11px] text-slate-600">Beri sorakan atau request lagu ke temanmu di sini!</p>
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isLocal = msg.userId === localUserId;
            const isSystem = msg.type === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center my-1.5">
                  <span className="inline-block bg-slate-950/80 text-pink-300 text-[11px] px-3 py-1 rounded-full border border-slate-800/80">
                    {msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col text-xs ${isLocal ? 'items-end' : 'items-start'}`}
              >
                {!isLocal && (
                  <span className="text-[10px] text-slate-400 font-semibold mb-0.5 px-1">
                    {msg.userName}
                  </span>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl max-w-[85%] break-words ${
                    isLocal
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/60'
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="text-[9px] text-slate-500 mt-0.5 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Cheer Chips */}
      <div className="flex gap-1.5 overflow-x-auto py-2 scrollbar-none">
        {quickCheerChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(chip)}
            className="text-[10px] whitespace-nowrap bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg border border-slate-700/50 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t border-slate-800">
        <input
          type="text"
          placeholder="Ketik sorakan atau pesan..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white p-2 rounded-xl transition-all shadow-sm"
          title="Kirim Pesan"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
