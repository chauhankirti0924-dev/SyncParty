import React, {
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  PlaybackStateDTO,
  UserRole,
} from "../types";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  playbackState: PlaybackStateDTO;
  userRole: UserRole;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onSeek: (time: number) => void;
}

/*
 * YouTube IFrame API
 *
 * Keep one shared Promise for the entire application.
 *
 * This prevents multiple React components / React StrictMode
 * from fighting over window.onYouTubeIframeAPIReady.
 */
let youtubeApiPromise: Promise<void> | null = null;

const loadYouTubeAPI = (): Promise<void> => {
  // API is already available.
  if (window.YT?.Player) {
    return Promise.resolve();
  }

  // API is currently loading.
  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise<void>((resolve, reject) => {
    const scriptId = "youtube-iframe-api";

    const existingScript = document.getElementById(
      scriptId
    );

    /*
     * YouTube calls this global function when the API
     * has finished loading.
     */
    const previousCallback =
      window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };

    /*
     * Another part of the application may already have
     * inserted the YouTube API script.
     */
    if (existingScript) {
      return;
    }

    const script = document.createElement("script");

    script.id = scriptId;
    script.src =
      "https://www.youtube.com/iframe_api";
    script.async = true;

    script.onerror = () => {
      youtubeApiPromise = null;

      reject(
        new Error(
          "Failed to load YouTube IFrame API."
        )
      );
    };

    document.head.appendChild(script);
  });

  return youtubeApiPromise;
};

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  playbackState,
  userRole,
  onPlay,
  onPause,
  onSeek,
}) => {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const playerRef = useRef<any>(null);

  /*
   * Prevent callbacks from running after React has
   * unmounted the component.
   */
  const isMountedRef = useRef(false);

  /*
   * Prevent player-generated PLAYING / PAUSED events
   * from being interpreted as commands coming from
   * the server.
   *
   * This becomes important when we implement synchronization.
   */
  const isApplyingRemoteStateRef =
    useRef(false);

  /*
   * Keep the latest callbacks available to YouTube's
   * event handlers without recreating the player.
   */
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onSeekRef = useRef(onSeek);

  useEffect(() => {
    onPlayRef.current = onPlay;
  }, [onPlay]);

  useEffect(() => {
    onPauseRef.current = onPause;
  }, [onPause]);

  useEffect(() => {
    onSeekRef.current = onSeek;
  }, [onSeek]);

  /*
   * Keep the latest currentTime available to the
   * player's onReady handler without needing it in
   * createPlayer's dependency array. currentTime updates
   * on nearly every sync tick, so depending on it directly
   * would recreate the player constantly.
   */
  const currentTimeRef = useRef(
    playbackState.currentTime
  );

  useEffect(() => {
    currentTimeRef.current =
      playbackState.currentTime;
  }, [playbackState.currentTime]);

  const canControl =
    userRole === UserRole.HOST ||
    userRole === UserRole.MODERATOR;

  /*
   * Create the YouTube player.
   */
  const createPlayer = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    if (!containerRef.current) {
      return;
    }

    if (playerRef.current) {
      return;
    }

    try {
      await loadYouTubeAPI();

      if (!isMountedRef.current) {
        return;
      }

      if (!containerRef.current) {
        return;
      }

      if (playerRef.current) {
        return;
      }

      console.log(
        "Creating YouTube player..."
      );

      console.log(
        "Video ID:",
        playbackState.videoId
      );

      console.log(
        "Origin:",
        window.location.origin
      );

      const player =
        new window.YT.Player(
          containerRef.current,
          {
            width: "100%",
            height: "100%",

            videoId:
              playbackState.videoId,

            playerVars: {
              /*
               * Do not depend on browser autoplay.
               * The synchronization system will explicitly
               * control playback.
               */
              autoplay: 0,

              controls: canControl ? 1 : 0,

              disablekb: canControl ? 0 : 1,

              playsinline: 1,

              /*
               * Required when using the YouTube IFrame API
               * from localhost / another web origin.
               */
              origin:
                window.location.origin,

              /*
               * Keep YouTube's JavaScript API enabled.
               */
              enablejsapi: 1,
            },

            events: {
              onReady: (
                event: any
              ) => {
                if (
                  !isMountedRef.current
                ) {
                  return;
                }

                console.log(
                  "YouTube player READY"
                );

                const currentPlayer =
                  event.target;

                /*
                 * The player starts at the server's
                 * current position.
                 *
                 * This is only the initial synchronization.
                 * The full synchronization system will be
                 * added separately.
                 */
                if (
                  currentTimeRef.current >
                  0
                ) {
                  currentPlayer.seekTo(
                    currentTimeRef.current,
                    true
                  );
                }
              },

              onStateChange: (
                event: any
              ) => {
                if (
                  !isMountedRef.current
                ) {
                  return;
                }

                const currentPlayer =
                  event.target;

                let currentTime = 0;

                if (
                  typeof currentPlayer.getCurrentTime ===
                  "function"
                ) {
                  currentTime =
                    currentPlayer.getCurrentTime();
                }

                console.log(
                  "YouTube state:",
                  event.data,
                  "time:",
                  currentTime
                );

                /*
                 * Ignore player events caused by a remote
                 * synchronization command.
                 *
                 * Otherwise:
                 *
                 * Server -> Client
                 * Client -> Server
                 * Server -> Client
                 * Client -> Server
                 *
                 * could create an event loop.
                 */
                if (
                  isApplyingRemoteStateRef.current
                ) {
                  return;
                }

                /*
                 * Host / moderator actions are sent
                 * back to the server.
                 */
                if (
                  event.data ===
                  window.YT.PlayerState.PLAYING
                ) {
                  if (canControl) {
                    onPlayRef.current(
                      currentTime
                    );
                  }

                  return;
                }

                if (
                  event.data ===
                  window.YT.PlayerState.PAUSED
                ) {
                  if (canControl) {
                    onPauseRef.current(
                      currentTime
                    );
                  }

                  return;
                }
              },

              onError: (
                event: any
              ) => {
                console.error(
                  "================================="
                );

                console.error(
                  "YouTube Player Error:",
                  event.data
                );

                console.error(
                  "Video ID:",
                  playbackState.videoId
                );

                console.error(
                  "Origin:",
                  window.location.origin
                );

                console.error(
                  "================================="
                );
              },

              onAutoplayBlocked: () => {
                /*
                 * This is not treated as a fatal error.
                 *
                 * SyncParty should not depend on browser
                 * autoplay permissions.
                 */
                console.warn(
                  "YouTube autoplay was blocked by the browser."
                );
              },
            },
          }
        );

      playerRef.current = player;
    } catch (error) {
      console.error(
        "Failed to create YouTube player:",
        error
      );
    }
  }, [
    playbackState.videoId,
    canControl,
  ]);

  /*
   * Mount / unmount lifecycle.
   */
  useEffect(() => {
    isMountedRef.current = true;

    createPlayer();

    return () => {
      isMountedRef.current = false;

      if (
        playerRef.current &&
        typeof playerRef.current.destroy ===
          "function"
      ) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.warn(
            "Failed to destroy YouTube player:",
            error
          );
        }
      }

      playerRef.current = null;
    };
  }, [createPlayer]);

  /*
   * Handle video changes.
   *
   * We don't recreate the entire player.
   * We tell the existing YouTube player to load
   * the new video.
   */
  useEffect(() => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    if (
      typeof player.loadVideoById !==
      "function"
    ) {
      return;
    }

    /*
     * Only load the video when the player is ready.
     * YouTube exposes getPlayerState() once initialized.
     */
    try {
      player.loadVideoById({
        videoId:
          playbackState.videoId,

        startSeconds:
          playbackState.currentTime > 0
            ? playbackState.currentTime
            : 0,
      });
    } catch (error) {
      console.error(
        "Failed to load YouTube video:",
        error
      );
    }
  }, [playbackState.videoId]);

  /*
   * Keep the player's position aligned with the
   * server state.
   *
   * For now this only handles an explicit position
   * update. The final drift-correction algorithm
   * belongs in the synchronization layer.
   */
  useEffect(() => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    if (
      typeof player.getCurrentTime !==
        "function" ||
      typeof player.seekTo !==
        "function"
    ) {
      return;
    }

    const targetTime =
      playbackState.currentTime;

    const currentTime =
      player.getCurrentTime();

    /*
     * Don't continuously seek for tiny differences.
     *
     * YouTube playback naturally fluctuates by small
     * amounts, so only correct meaningful differences.
     */
    const difference =
      Math.abs(
        currentTime - targetTime
      );

    if (difference < 1.5) {
      return;
    }

    /*
     * Mark this seek as a remote/server action so
     * the resulting player event doesn't get sent
     * back as a new host action.
     */
    isApplyingRemoteStateRef.current =
      true;

    try {
      player.seekTo(
        targetTime,
        true
      );

      onSeekRef.current(
        targetTime
      );
    } finally {
      /*
       * YouTube's event is asynchronous, so releasing
       * the flag immediately would allow the event to
       * be treated as a local action.
       *
       * Keep it active briefly.
       */
      window.setTimeout(() => {
        isApplyingRemoteStateRef.current =
          false;
      }, 100);
    }
  }, [
    playbackState.currentTime,
  ]);

  return (
    <div className="video-wrapper">
      <div
        ref={containerRef}
        className="iframe-container"
      />

      {!canControl && (
        <div
          className="lockout-overlay"
          title="Playback controls restricted to Host & Moderator"
        />
      )}
    </div>
  );
};

export { YouTubePlayer };

export default YouTubePlayer;