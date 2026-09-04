import { UserRole } from '../types/events';

export class PermissionGuard {
  /**
   * Check if role is allowed to control video playback (play, pause, seek).
   */
  public static canControlPlayback(role: UserRole): boolean {
    return role === UserRole.HOST || role === UserRole.MODERATOR;
  }

  /**
   * Check if role is allowed to change the current YouTube video.
   */
  public static canChangeVideo(role: UserRole): boolean {
    return role === UserRole.HOST || role === UserRole.MODERATOR;
  }

  /**
   * Check if role is allowed to assign/change user roles.
   * Only Host can assign roles.
   */
  public static canAssignRole(role: UserRole): boolean {
    return role === UserRole.HOST;
  }

  /**
   * Check if role is allowed to remove/kick participants.
   * Only Host can kick users.
   */
  public static canKickUser(role: UserRole): boolean {
    return role === UserRole.HOST;
  }

  /**
   * Check if role is allowed to transfer ownership to another participant.
   * Only Host can transfer host.
   */
  public static canTransferHost(role: UserRole): boolean {
    return role === UserRole.HOST;
  }
}
