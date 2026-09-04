import React, { useState } from 'react';
import { PlaybackStateDTO, UserRole } from '../types';
import { Play, Pause, RefreshCw, Share2, Youtube, Lock, Check } from 'lucide-react';

interface RoomControlsProps {
  roomId: string;
  playbackState: PlaybackStateDTO;
  userRole: UserRole;
  onPlay: () => void;
  onPause: () => void;
  onChangeVideo: (videoId: string) => void;
  onResync: () => void;
}

export const RoomControls: React.FC<RoomControlsProps> = ({
  roomId,
  playbackState,
  userRole,
  onPlay,
  onPause,
  onChangeVideo,
  onResync
}) => {
  const [videoInput, setVideoInput] = useState('');
  const [copied, setCopied] = useState(false);

  const canControl = userRole === UserRole.HOST || userRole === UserRole.MODERATOR;

  const extractYouTubeId = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : url;
  };

  const handleVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInput.trim()) return;
    const videoId = extractYouTubeId(videoInput.trim());
    onChangeVideo(videoId);
    setVideoInput('');
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Left: Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {canControl ? (
            <button
              className="btn-primary"
              onClick={playbackState.isPlaying ? onPause : onPlay}
              style={{ minWidth: '120px', justifyContent: 'center' }}
            >
              {playbackState.isPlaying ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Play</>}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
              <Lock size={14} /> Control locked (Watch Only)
            </div>
          )}

          <button className="btn-secondary" onClick={onResync} title="Force Resync Time with Server">
            <RefreshCw size={16} /> Sync
          </button>
        </div>

        {/* Right: Room Code & Share Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', fontSize: '0.9rem', fontWeight: 700 }}>
            CODE: <span style={{ color: 'var(--accent-primary)', letterSpacing: '1px' }}>{roomId}</span>
          </div>

          <button className="btn-secondary" onClick={handleCopyLink} style={{ padding: '8px 14px' }}>
            {copied ? <><Check size={16} color="#10b981" /> Copied!</> : <><Share2 size={16} /> Share Link</>}
          </button>
        </div>
      </div>

      {/* Change Video Form for Host / Moderator */}
      {canControl && (
        <form onSubmit={handleVideoSubmit} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Youtube size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ef4444' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Paste YouTube Video URL or Video ID..."
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              style={{ width: '100%', paddingLeft: '38px' }}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '10px 16px' }}>
            Load Video
          </button>
        </form>
      )}
    </div>
  );
};
