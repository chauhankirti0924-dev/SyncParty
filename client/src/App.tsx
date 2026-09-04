import React, { useState, useEffect } from 'react';
import { socket, connectSocket, disconnectSocket } from './services/socket';
import { RoomDTO, PlaybackStateDTO, UserRole, UserDTO, ChatMessageDTO, ReactionDTO } from './types';
import { LandingPage } from './components/LandingPage';
import { YouTubePlayer } from './components/YouTubePlayer';
import { RoomControls } from './components/RoomControls';
import { ParticipantList } from './components/ParticipantList';
import { ChatPanel } from './components/ChatPanel';
import { EmojiOverlay } from './components/EmojiOverlay';
import { Tv, Users, MessageSquare, LogOut, ShieldAlert } from 'lucide-react';

export const App: React.FC = () => {
  const [currentRoom, setCurrentRoom] = useState<RoomDTO | null>(null);
  const [username, setUsername] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessageDTO[]>([]);
  const [latestReaction, setLatestReaction] = useState<ReactionDTO | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [urlRoomCode, setUrlRoomCode] = useState<string>('');

  // Extract ?room=XXXXXX parameter from window location
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setUrlRoomCode(roomParam.toUpperCase());
    }
  }, []);

  useEffect(() => {
    connectSocket();

    // Event: room_snapshot (received after join)
    socket.on('room_snapshot', ({ room, chatHistory }: { room: RoomDTO; chatHistory: ChatMessageDTO[] }) => {
      setCurrentRoom(room);
      setChatHistory(chatHistory);
      setErrorMessage(null);
    });

    // Event: sync_state
    socket.on('sync_state', (state: PlaybackStateDTO) => {
      setCurrentRoom((prev) => (prev ? { ...prev, playbackState: state } : null));
    });

    // Event: user_joined
    socket.on('user_joined', ({ participants }: { participants: UserDTO[] }) => {
      setCurrentRoom((prev) => (prev ? { ...prev, participants } : null));
    });

    // Event: user_left
    socket.on('user_left', ({ participants }: { participants: UserDTO[] }) => {
      setCurrentRoom((prev) => (prev ? { ...prev, participants } : null));
    });

    // Event: role_assigned
    socket.on('role_assigned', ({ participants }: { participants: UserDTO[] }) => {
      setCurrentRoom((prev) => (prev ? { ...prev, participants } : null));
    });

    // Event: participant_removed
    socket.on('participant_removed', ({ targetUserId, participants }: { targetUserId: string; participants: UserDTO[] }) => {
      if (socket.id === targetUserId) {
        setCurrentRoom(null);
        alert('You were removed from the room by the host.');
      } else {
        setCurrentRoom((prev) => (prev ? { ...prev, participants } : null));
      }
    });

    // Event: host_transferred
    socket.on('host_transferred', ({ participants }: { participants: UserDTO[] }) => {
      setCurrentRoom((prev) => (prev ? { ...prev, participants } : null));
    });

    // Event: chat_message
    socket.on('chat_message', (msg: ChatMessageDTO) => {
      setChatHistory((prev) => [...prev, msg]);
    });

    // Event: reaction_event
    socket.on('reaction_event', (reaction: ReactionDTO) => {
      setLatestReaction(reaction);
    });

    // Event: error_message
    socket.on('error_message', ({ message }: { message: string }) => {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    return () => {
      socket.off('room_snapshot');
      socket.off('sync_state');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('role_assigned');
      socket.off('participant_removed');
      socket.off('host_transferred');
      socket.off('chat_message');
      socket.off('reaction_event');
      socket.off('error_message');
      disconnectSocket();
    };
  }, []);

  const getPersistentUserId = (): string => {
    let uid = localStorage.getItem('watch_party_user_id');
    if (!uid) {
      uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('watch_party_user_id', uid);
    }
    return uid;
  };

  const handleCreateRoom = async (name: string) => {
    try {
      setUsername(name);
      const res = await fetch('/api/rooms', { method: 'POST' });
      const data = await res.json();
      const code = data.roomId;
      const uid = getPersistentUserId();
      socket.emit('join_room', { roomId: code, username: name, userId: uid });
      window.history.pushState({}, '', `?room=${code}`);
    } catch (err) {
      console.error('Failed to create room:', err);
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const uid = getPersistentUserId();
      socket.emit('join_room', { roomId: code, username: name, userId: uid });
      window.history.pushState({}, '', `?room=${code}`);
    }
  };

  const handleJoinRoom = (code: string, name: string) => {
    setUsername(name);
    const uid = getPersistentUserId();
    socket.emit('join_room', { roomId: code, username: name, userId: uid });
    window.history.pushState({}, '', `?room=${code}`);
  };

  const handleLeaveRoom = () => {
    if (currentRoom) {
      socket.emit('leave_room', { roomId: currentRoom.roomId });
    }
    setCurrentRoom(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  const handlePlay = (currentTime?: number) => {
    socket.emit('play', { currentTime });
  };

  const handlePause = (currentTime?: number) => {
    socket.emit('pause', { currentTime });
  };

  const handleSeek = (time: number) => {
    socket.emit('seek', { time });
  };

  const handleChangeVideo = (videoId: string) => {
    socket.emit('change_video', { videoId });
  };

  const handleAssignRole = (targetUserId: string, role: UserRole) => {
    socket.emit('assign_role', { targetUserId, role });
  };

  const handleRemoveParticipant = (targetUserId: string) => {
    socket.emit('remove_participant', { targetUserId });
  };

  const handleTransferHost = (targetUserId: string) => {
    socket.emit('transfer_host', { targetUserId });
  };

  const handleSendMessage = (text: string) => {
    socket.emit('send_message', { text });
  };

  const handleSendReaction = (emoji: string) => {
    socket.emit('send_reaction', { emoji });
  };

  if (!currentRoom) {
    return (
      <LandingPage
        onJoinRoom={handleJoinRoom}
        onCreateRoom={handleCreateRoom}
        initialRoomId={urlRoomCode}
      />
    );
  }

  const persistentId = localStorage.getItem('watch_party_user_id') || socket.id || '';
  const currentUser = currentRoom.participants.find((p) => p.userId === persistentId || p.userId === socket.id);
  const currentUserRole = currentUser ? currentUser.role : UserRole.PARTICIPANT;

  return (
    <div className="app-container">
      {/* Toast Notification Banner */}
      {errorMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'var(--accent-danger)',
            color: 'white',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 1000,
            boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)'
          }}
        >
          <ShieldAlert size={20} /> {errorMessage}
        </div>
      )}

      {/* Header */}
      <header className="glass-panel app-header">
        <div className="brand-title">
          <Tv size={24} color="#10b981" /> SyncParty
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Logged in as <strong style={{ color: 'var(--text-main)' }}>{username}</strong>
          </span>
          <button className="btn-secondary" onClick={handleLeaveRoom} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
            <LogOut size={15} /> Leave Party
          </button>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div className="main-content">
        {/* Left Column: Player & Controls */}
        <div className="player-section">
          <div style={{ position: 'relative' }}>
            <YouTubePlayer
              playbackState={currentRoom.playbackState}
              userRole={currentUserRole}
              onPlay={(time) => handlePlay(time)}
              onPause={(time) => handlePause(time)}
              onSeek={(time) => handleSeek(time)}
            />
            <EmojiOverlay latestReaction={latestReaction} />
          </div>

          <RoomControls
            roomId={currentRoom.roomId}
            playbackState={currentRoom.playbackState}
            userRole={currentUserRole}
            onPlay={() => handlePlay()}
            onPause={() => handlePause()}
            onChangeVideo={handleChangeVideo}
            onResync={() => handleSeek(currentRoom.playbackState.currentTime)}
          />
        </div>

        {/* Right Column: Chat & Participant Sidebar */}
        <div className="sidebar-section">
          <div className="tabs-header">
            <button
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={16} /> Chat
            </button>
            <button
              className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
              onClick={() => setActiveTab('participants')}
            >
              <Users size={16} /> Members ({currentRoom.participants.length})
            </button>
          </div>

          {activeTab === 'chat' ? (
            <ChatPanel
              chatHistory={chatHistory}
              onSendMessage={handleSendMessage}
              onSendReaction={handleSendReaction}
            />
          ) : (
            <ParticipantList
              participants={currentRoom.participants}
              currentUserId={persistentId}
              currentUserRole={currentUserRole}
              onAssignRole={handleAssignRole}
              onRemoveParticipant={handleRemoveParticipant}
              onTransferHost={handleTransferHost}
            />
          )}
        </div>
      </div>
    </div>
  );
};
