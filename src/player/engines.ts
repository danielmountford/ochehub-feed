/**
 * Media engines. The player talks to one small interface; behind it sit the
 * official YouTube iframe (videos and Shorts) and an HTML audio element
 * (podcasts). Exactly one of them is live at a time.
 */

export type MediaStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export interface MediaEvents {
  status(status: MediaStatus, message?: string): void;
  time(position: number, duration: number): void;
  /** `forced` means the browser refused sound, so we started muted. */
  muted(muted: boolean, forced: boolean): void;
  /** Playback needs a direct tap on the video (strict autoplay policies). */
  needsTap(needs: boolean): void;
}

export interface MediaEngine {
  load(source: string, options: { startAt?: number; loop?: boolean; title?: string; artist?: string; artwork?: string }): void;
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  setMuted(muted: boolean): void;
  setRate(rate: number): void;
  stop(): void;
}

/* ---------------------------------------------------------------- YouTube */

interface YTPlayer {
  loadVideoById(options: { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setVolume(volume: number): void;
  setPlaybackRate(rate: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    element: HTMLElement | string,
    options: {
      events: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (!apiPromise) {
    apiPromise = new Promise<YTNamespace>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        apiPromise = null;
        reject(new Error('YouTube did not respond'));
      }, 12_000);
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        window.clearTimeout(timeout);
        if (window.YT) {
          resolve(window.YT);
        }
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        apiPromise = null;
        reject(new Error('YouTube could not be reached'));
      };
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

function embedUrl(videoId: string, startAt = 0) {
  const params = new URLSearchParams({
    enablejsapi: '1',
    autoplay: '1',
    playsinline: '1',
    controls: '0',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    fs: '0',
    disablekb: '1',
    origin: window.location.origin,
  });
  if (startAt > 0) {
    params.set('start', String(Math.floor(startAt)));
  }
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

const YT_ERRORS: Record<number, string> = {
  2: 'This video link is not valid.',
  5: 'This video can’t be played in the browser.',
  100: 'This video is no longer available.',
  101: 'The publisher doesn’t allow this video to play here.',
  150: 'The publisher doesn’t allow this video to play here.',
};

/**
 * One persistent YouTube iframe, re-used for every video and Short so that
 * swiping to the next item is `loadVideoById` on an already-unlocked player
 * (which keeps sound) rather than a cold iframe each time.
 */
export class YouTubeEngine implements MediaEngine {
  private iframe: HTMLIFrameElement | null = null;
  private player: YTPlayer | null = null;
  private ready = false;
  private loop = false;
  private wantMuted = false;
  private poll = 0;
  private watchdog = 0;
  private generation = 0;
  private lastState = -2;

  constructor(
    private mount: HTMLElement,
    private events: MediaEvents,
  ) {}

  load(videoId: string, options: { startAt?: number; loop?: boolean }) {
    this.loop = Boolean(options.loop);
    this.generation += 1;
    this.lastState = -2;
    this.events.status('loading');
    this.events.time(0, 0);
    this.events.needsTap(false);
    if (this.player && this.ready) {
      this.player.loadVideoById({ videoId, startSeconds: options.startAt ?? 0 });
      this.armWatchdog();
      return;
    }
    if (!this.iframe) {
      const iframe = document.createElement('iframe');
      iframe.src = embedUrl(videoId, options.startAt);
      iframe.title = 'Video player';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.setAttribute('playsinline', '');
      iframe.setAttribute('frameborder', '0');
      this.mount.appendChild(iframe);
      this.iframe = iframe;
      this.attachApi();
    } else {
      // The API has not connected yet: fall back to a plain navigation.
      this.iframe.src = embedUrl(videoId, options.startAt);
    }
    this.armWatchdog();
  }

  private attachApi() {
    const generation = this.generation;
    loadYouTubeApi()
      .then((YT) => {
        if (!this.iframe) {
          return;
        }
        this.player = new YT.Player(this.iframe, {
          events: {
            onReady: () => {
              this.ready = true;
              if (this.wantMuted) {
                this.player?.mute();
              }
              // The embed may already be playing by the time the API connects.
              this.onState(this.player?.getPlayerState() ?? -1);
              this.startPolling();
            },
            onStateChange: (event) => this.onState(event.data),
            onError: (event) => {
              this.clearWatchdog();
              this.events.status('error', YT_ERRORS[event.data] ?? 'This video can’t be played right now.');
            },
          },
        });
      })
      .catch((error: Error) => {
        if (generation === this.generation) {
          this.clearWatchdog();
          this.events.status('error', `${error.message}. Check your connection and try again.`);
        }
      });
  }

  private onState(state: number) {
    // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    if (state === this.lastState) {
      return;
    }
    this.lastState = state;
    if (state === 1) {
      this.clearWatchdog();
      this.events.needsTap(false);
      this.events.status('playing');
      this.startPolling();
    } else if (state === 2) {
      this.events.status('paused');
    } else if (state === 3) {
      this.events.status('loading');
    } else if (state === 0) {
      if (this.loop) {
        this.player?.seekTo(0, true);
        this.player?.playVideo();
      } else {
        this.events.status('ended');
      }
    }
  }

  /**
   * Autoplay ladder. Sound first; if the browser will not start it, retry
   * muted (always allowed); if even that stalls, ask for a tap on the video.
   */
  private armWatchdog(delay = 3500) {
    this.clearWatchdog();
    const generation = this.generation;
    this.watchdog = window.setTimeout(() => {
      if (generation !== this.generation) {
        return;
      }
      if (!this.player || !this.ready) {
        // Still connecting: check again shortly.
        this.armWatchdog(1500);
        return;
      }
      const state = this.player.getPlayerState();
      if (state === 1 || state === 3) {
        return;
      }
      this.player.mute();
      this.player.playVideo();
      this.events.muted(true, true);
      this.watchdog = window.setTimeout(() => {
        if (generation !== this.generation || !this.player) {
          return;
        }
        const next = this.player.getPlayerState();
        if (next !== 1 && next !== 3) {
          this.events.status('paused');
          this.events.needsTap(true);
        }
      }, 2500);
    }, delay);
  }

  private clearWatchdog() {
    window.clearTimeout(this.watchdog);
  }

  private startPolling() {
    window.clearInterval(this.poll);
    this.poll = window.setInterval(() => {
      if (!this.player || !this.ready) {
        return;
      }
      const duration = this.player.getDuration() || 0;
      const position = this.player.getCurrentTime() || 0;
      this.events.time(position, duration);
      // Events can be missed while the iframe is busy; polling is the backstop.
      this.onState(this.player.getPlayerState());
    }, 250);
  }

  play() {
    this.player?.playVideo();
  }

  pause() {
    this.player?.pauseVideo();
  }

  seek(seconds: number) {
    this.player?.seekTo(seconds, true);
    this.events.time(seconds, this.player?.getDuration() || 0);
  }

  setMuted(muted: boolean) {
    this.wantMuted = muted;
    if (this.player && this.ready) {
      if (muted) {
        this.player.mute();
      } else {
        this.player.unMute();
        this.player.setVolume(100);
      }
    }
    this.events.muted(muted, false);
  }

  setRate(rate: number) {
    this.player?.setPlaybackRate(rate);
  }

  stop() {
    this.generation += 1;
    this.clearWatchdog();
    window.clearInterval(this.poll);
    try {
      this.player?.destroy();
    } catch {
      // Already gone.
    }
    this.iframe?.remove();
    this.mount.replaceChildren();
    this.player = null;
    this.iframe = null;
    this.ready = false;
    this.events.status('idle');
  }
}

/* ------------------------------------------------------------------ Audio */

export class AudioEngine implements MediaEngine {
  private audio = new Audio();
  private rate = 1;

  constructor(private events: MediaEvents) {
    const audio = this.audio;
    audio.preload = 'metadata';
    audio.addEventListener('playing', () => this.events.status('playing'));
    audio.addEventListener('pause', () => {
      if (!audio.ended) {
        this.events.status('paused');
      }
    });
    audio.addEventListener('waiting', () => this.events.status('loading'));
    audio.addEventListener('ended', () => this.events.status('ended'));
    audio.addEventListener('error', () => {
      if (audio.getAttribute('src')) {
        this.events.status('error', 'This episode can’t be played right now.');
      }
    });
    const report = () => this.events.time(audio.currentTime || 0, Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.addEventListener('timeupdate', report);
    audio.addEventListener('durationchange', report);
  }

  load(url: string, options: { startAt?: number; title?: string; artist?: string; artwork?: string }) {
    const audio = this.audio;
    this.events.status('loading');
    this.events.time(options.startAt ?? 0, 0);
    audio.src = url;
    audio.playbackRate = this.rate;
    const startAt = options.startAt ?? 0;
    if (startAt > 0) {
      const seekOnce = () => {
        audio.currentTime = startAt;
        audio.removeEventListener('loadedmetadata', seekOnce);
      };
      audio.addEventListener('loadedmetadata', seekOnce);
    }
    this.play();
    if ('mediaSession' in navigator && options.title) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: options.title,
          artist: options.artist,
          artwork: options.artwork ? [{ src: options.artwork }] : [],
        });
      } catch {
        // Media Session is optional.
      }
    }
  }

  play() {
    this.audio.play().catch(() => {
      // Autoplay refused or the source failed; the UI shows the play button.
      if (this.audio.paused) {
        this.events.status('paused');
      }
    });
  }

  pause() {
    this.audio.pause();
  }

  seek(seconds: number) {
    this.audio.currentTime = seconds;
    this.events.time(seconds, Number.isFinite(this.audio.duration) ? this.audio.duration : 0);
  }

  setMuted(muted: boolean) {
    this.audio.muted = muted;
    this.events.muted(muted, false);
  }

  setRate(rate: number) {
    this.rate = rate;
    this.audio.playbackRate = rate;
  }

  stop() {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.events.status('idle');
  }
}
