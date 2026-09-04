import React, { useState, useEffect } from 'react';
import { Tv, Users, Shield, Zap, Sparkles, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onJoinRoom: (roomId: string, username: string) => void;
  onCreateRoom: (username: string) => void;
  initialRoomId?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onJoinRoom,
  onCreateRoom,
  initialRoomId = ''
}) => {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState(initialRoomId);

  useEffect(() => {
    if (initialRoomId) {
      setRoomCode(initialRoomId);
    }
  }, [initialRoomId]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return alert('Please enter your display name');
    onCreateRoom(username.trim());
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return alert('Please enter your display name');
    if (!roomCode.trim()) return alert('Please enter a Room Code');
    onJoinRoom(roomCode.trim().toUpperCase(), username.trim());
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '540px',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
          boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.8)'
        }}
      >
        {/* Header Branding */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '12px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              marginBottom: '16px'
            }}
          >
            <Tv size={36} color="#10b981" />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px' }}>
            SyncParty
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Watch YouTube videos in real-time synchronization with friends & communities.
          </p>
        </div>

        {/* Form Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>
              YOUR DISPLAY NAME
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Kirti"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', fontSize: '1rem', padding: '12px 16px' }}
              maxLength={20}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={handleCreate}
              className="btn-primary"
              style={{ justifyContent: 'center', padding: '14px', fontSize: '0.95rem' }}
            >
              <Sparkles size={18} /> Create New Room
            </button>

            <button
              onClick={() => {
                const code = prompt('Enter 6-character Room Code:');
                if (code && username.trim()) {
                  onJoinRoom(code.trim().toUpperCase(), username.trim());
                } else if (!username.trim()) {
                  alert('Please enter your display name first');
                }
              }}
              className="btn-secondary"
              style={{ justifyContent: 'center', padding: '14px', fontSize: '0.95rem' }}
            >
              <Users size={18} /> Join via Code
            </button>
          </div>

          {/* Join via Code Direct Input Form */}
          <form onSubmit={handleJoin} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Room Code (e.g. XXXXXX)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}
              maxLength={10}
            />
            <button type="submit" className="btn-secondary" style={{ padding: '12px 16px' }}>
              Join <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* Feature Highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Zap size={20} color="#10b981" style={{ marginBottom: '4px' }} />
            <div>WebSocket Sync</div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Shield size={20} color="#8b5cf6" style={{ marginBottom: '4px' }} />
            <div>RBAC Role Control</div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Users size={20} color="#f59e0b" style={{ marginBottom: '4px' }} />
            <div>MongoDB & Scale</div>
          </div>
        </div>
      </div>
    </div>
  );
};
