import { PlaybackStateDTO } from '../types/events';

export class PlaybackState {
  private videoId: string;
  private currentTime: number;
  private isPlaying: boolean;
  private lastUpdated: number;
  private playbackRate: number;

  constructor(videoId: string = 'dQw4w9WgXcQ', currentTime: number = 0, isPlaying: boolean = false, playbackRate: number = 1) {
    this.videoId = videoId;
    this.currentTime = currentTime;
    this.isPlaying = isPlaying;
    this.lastUpdated = Date.now();
    this.playbackRate = playbackRate;
  }

  public updateState(videoId?: string, currentTime?: number, isPlaying?: boolean, playbackRate?: number): void {
    if (videoId !== undefined) {
      this.videoId = videoId;
      this.currentTime = 0;
      this.isPlaying = false;
    }

    if (currentTime !== undefined) {
      this.currentTime = Math.max(0, currentTime);
    }

    if (isPlaying !== undefined) {
      this.isPlaying = isPlaying;
    }

    if (playbackRate !== undefined) {
      this.playbackRate = playbackRate;
    }

    this.lastUpdated = Date.now();
  }

  /**
   * Returns calculated current time based on elapsed milliseconds if currently playing.
   */
  public getCalculatedCurrentTime(): number {
    if (!this.isPlaying) {
      return this.currentTime;
    }
    const elapsedSeconds = ((Date.now() - this.lastUpdated) / 1000) * this.playbackRate;
    return this.currentTime + elapsedSeconds;
  }

  public getVideoId(): string {
    return this.videoId;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public toDTO(): PlaybackStateDTO {
    return {
      videoId: this.videoId,
      currentTime: this.getCalculatedCurrentTime(),
      isPlaying: this.isPlaying,
      lastUpdated: this.lastUpdated,
      playbackRate: this.playbackRate
    };
  }
}
