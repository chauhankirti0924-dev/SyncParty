import React, { useState, useRef, useEffect } from 'react';
import { ChatMessageDTO } from '../types';
import { Send, Smile } from 'lucide-react';

interface ChatPanelProps {
  chatHistory: ChatMessageDTO[];
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
}

const EMOJI_LIST = ['🔥', '❤️', '👏', '😂', '😮', '🎉', '🍿', '💯'];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  chatHistory,
  onSendMessage,
  onSendReaction
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'hidden' }}>
      {/* Quick Reaction Bar */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-glass)', overflowX: 'auto' }}>
        {EMOJI_LIST.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-glass)',
              borderRadius: '20px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '1.1rem',
              transition: 'transform 0.1s ease'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.85)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
        {chatHistory.map((msg) => {
          if (msg.isSystem) {
            return (
              <div
                key={msg.id}
                style={{
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: 'var(--accent-primary)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}
              >
                {msg.text}
              </div>
            );
          }

          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{msg.username}</span>
                <span style={{ color: 'var(--text-dim)' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  lineHeight: '1.4',
                  wordBreak: 'break-word'
                }}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <input
          type="text"
          className="input-field"
          placeholder="Send a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-primary" style={{ padding: '10px 14px' }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
