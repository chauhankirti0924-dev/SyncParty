import React from 'react';
import { UserDTO, UserRole } from '../types';
import { Shield, Crown, User, UserX, ArrowRightLeft } from 'lucide-react';

interface ParticipantListProps {
  participants: UserDTO[];
  currentUserId: string;
  currentUserRole: UserRole;
  onAssignRole: (targetUserId: string, role: UserRole) => void;
  onRemoveParticipant: (targetUserId: string) => void;
  onTransferHost: (targetUserId: string) => void;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentUserId,
  currentUserRole,
  onAssignRole,
  onRemoveParticipant,
  onTransferHost
}) => {
  const isHost = currentUserRole === UserRole.HOST;

  const renderBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.HOST:
        return <span className="badge badge-host"><Crown size={12} /> Host</span>;
      case UserRole.MODERATOR:
        return <span className="badge badge-moderator"><Shield size={12} /> Mod</span>;
      default:
        return <span className="badge badge-participant"><User size={12} /> Watcher</span>;
    }
  };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          Participants <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{participants.length}</span>
        </h3>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {participants.map((p) => {
          const isSelf = p.userId === currentUserId;

          return (
            <div
              key={p.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: isSelf ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0,0,0,0.2)',
                border: isSelf ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isSelf ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}
                >
                  {p.username.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.username} {isSelf && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(You)</span>}
                  </span>
                  <div>{renderBadge(p.role)}</div>
                </div>
              </div>

              {/* Host Actions for other participants */}
              {isHost && !isSelf && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* Role Selector */}
                  <select
                    value={p.role}
                    onChange={(e) => onAssignRole(p.userId, e.target.value as UserRole)}
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid var(--border-glass)',
                      color: 'white',
                      fontSize: '0.75rem',
                      padding: '4px 6px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value={UserRole.MODERATOR}>Make Mod</option>
                    <option value={UserRole.PARTICIPANT}>Make Watcher</option>
                  </select>

                  {/* Transfer Host */}
                  <button
                    onClick={() => onTransferHost(p.userId)}
                    title="Transfer Host"
                    style={{ background: 'transparent', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: '4px' }}
                  >
                    <ArrowRightLeft size={15} />
                  </button>

                  {/* Kick Button */}
                  <button
                    onClick={() => onRemoveParticipant(p.userId)}
                    title="Kick User"
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                  >
                    <UserX size={15} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
