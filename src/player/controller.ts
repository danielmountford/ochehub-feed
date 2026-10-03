import { sourceById } from '../data/catalogue';
import type { PlayableItem, PodcastItem, VideoItem } from '../data/types';
import { libraryStore, saveProgress } from '../lib/feed';
import { createStore } from '../lib/store';
import { AudioEngine, type MediaEngine, type MediaStatus, YouTubeEngine } from './engines';

export type PlayerMode = 'closed' | 'full' | 'mini';
export type PlayerKind = 'video' | 'short' | 'podcast';

export interface PlayerState {
  mode: PlayerMode;
  kind: PlayerKind;
  queue: PlayableItem[];
  index: number;
  /** +1 next, -1 previous: drives the direction of content transitions. */
  direction: 1 | -1;
  status: MediaStatus;
  message?: string;
  /** Poster covers the media until the first frame plays. */
  posterVisible: boolean;
  muted: boolean;
  forcedMute: boolean;
  needsTap: boolean;
  rate: number;
  /** Bumped on every open() so the host re-runs its entrance even if the mode is unchanged. */
  nonce: number;
}

export const playerStore = createStore<PlayerState>({
  mode: 'closed',
  kind: 'video',
  queue: [],
  index: 0,
  direction: 1,
  status: 'idle',
  posterVisible: true,
  muted: false,
  forcedMute: false,
  needsTap: false,
  rate: 1,
  nonce: 0,
});

/** Position and duration change four times a second, so they live apart from the rest. */
export const timeStore = createStore({ position: 0, duration: 0 });

export const RATES = [1, 1.25, 1.5, 2];

interface Host {
  /** Animate one card left or right, then commit. Returns false if it could not. */
  page(direction: 1 | -1): boolean;
}

let host: Host | null = null;
let mount: HTMLElement | null = null;
let youtube: YouTubeEngine | null = null;
let audio: AudioEngine | null = null;
let engine: MediaEngine | null = null;
let lastProgressSave = 0;

function patch(partial: Partial<PlayerState>) {
  playerStore.set((state) => ({ ...state, ...partial }));
}

const events = {
  status(status: MediaStatus, message?: string) {
    const state = playerStore.get();
    patch({
      status,
      message,
      posterVisible: status === 'playing' ? false : state.posterVisible,
    });
    if (status === 'paused' || status === 'ended') {
      persistProgress(true);
    }
  },
  time(position: number, duration: number) {
    timeStore.set({ position, duration });
    persistProgress(false);
  },
  muted(muted: boolean, forced: boolean) {
    patch({ muted, forcedMute: forced });
  },
  needsTap(needsTap: boolean) {
    patch({ needsTap });
  },
};

function persistProgress(force: boolean) {
  const state = playerStore.get();
  const item = state.queue[state.index];
  if (!item || item.kind !== 'podcast') {
    return;
  }
  const { position, duration } = timeStore.get();
  const now = Date.now();
  if (position > 5 && (force || now - lastProgressSave > 5000)) {
    lastProgressSave = now;
    saveProgress(item.id, position, duration || item.durationSeconds);
  }
}

function kindOf(item: PlayableItem): PlayerKind {
  return item.kind;
}

function loadCurrent() {
  const state = playerStore.get();
  const item = state.queue[state.index];
  if (!item) {
    return;
  }
  timeStore.set({ position: 0, duration: item.kind === 'podcast' ? item.durationSeconds : 0 });
  if (item.kind === 'podcast') {
    youtube?.stop();
    audio ??= new AudioEngine(events);
    engine = audio;
    const saved = libraryStore.get().progress[item.id];
    const finished = saved && saved.duration > 0 && saved.position > saved.duration - 30;
    const source = sourceById.get(item.sourceId);
    audio.setRate(state.rate);
    audio.load((item as PodcastItem).audioUrl, {
      startAt: saved && !finished ? saved.position : 0,
      title: item.title,
      artist: source?.name,
      artwork: source?.image,
    });
    return;
  }
  audio?.stop();
  if (!mount) {
    return;
  }
  youtube ??= new YouTubeEngine(mount, events);
  engine = youtube;
  youtube.load((item as VideoItem).youtubeId, { loop: item.kind === 'short' });
}

export const player = {
  /** The stage element the YouTube iframe lives in. Set once by the host. */
  attach(element: HTMLElement | null, nextHost: Host | null) {
    mount = element;
    host = nextHost;
  },

  /** Open a queue at an index. Must be called from a tap so autoplay is allowed. */
  open(queue: PlayableItem[], index: number) {
    const item = queue[index];
    if (!item) {
      return;
    }
    const current = playerStore.get();
    const same = current.mode !== 'closed' && current.queue[current.index]?.id === item.id;
    if (same) {
      patch({ mode: 'full', queue, index, nonce: current.nonce + 1 });
      return;
    }
    patch({
      nonce: current.nonce + 1,
      mode: 'full',
      kind: kindOf(item),
      queue,
      index,
      direction: 1,
      status: 'loading',
      message: undefined,
      posterVisible: true,
      needsTap: false,
      rate: item.kind === 'podcast' ? current.rate : 1,
    });
    loadCurrent();
  },

  /** Commit a new index (after the pager has animated, or straight away for podcasts). */
  setIndex(index: number, direction: 1 | -1) {
    const state = playerStore.get();
    if (index < 0 || index >= state.queue.length || index === state.index) {
      return;
    }
    persistProgress(true);
    patch({ index, direction, status: 'loading', message: undefined, posterVisible: true, needsTap: false });
    loadCurrent();
  },

  /** Step through the queue. Videos and Shorts animate the pager; podcasts swap in place. */
  step(direction: 1 | -1) {
    const state = playerStore.get();
    const target = state.index + direction;
    if (target < 0 || target >= state.queue.length) {
      return;
    }
    if (state.mode === 'full' && state.kind !== 'podcast' && host?.page(direction)) {
      return;
    }
    player.setIndex(target, direction);
  },

  jumpTo(index: number) {
    const state = playerStore.get();
    if (index === state.index) {
      return;
    }
    if (Math.abs(index - state.index) === 1) {
      player.step(index > state.index ? 1 : -1);
      return;
    }
    player.setIndex(index, index > state.index ? 1 : -1);
  },

  minimise() {
    if (playerStore.get().mode === 'full') {
      patch({ mode: 'mini' });
    }
  },

  expand() {
    if (playerStore.get().mode === 'mini') {
      patch({ mode: 'full' });
    }
  },

  /** Called by the host once the dismiss animation has finished. */
  close() {
    persistProgress(true);
    youtube?.stop();
    audio?.stop();
    engine = null;
    patch({ mode: 'closed', status: 'idle', queue: [], index: 0, posterVisible: true, needsTap: false });
  },

  toggle() {
    const { status } = playerStore.get();
    if (status === 'playing' || status === 'loading') {
      engine?.pause();
    } else if (status === 'ended') {
      engine?.seek(0);
      engine?.play();
    } else if (status === 'error') {
      player.retry();
    } else {
      engine?.play();
    }
  },

  play() {
    engine?.play();
  },

  pause() {
    engine?.pause();
  },

  retry() {
    patch({ status: 'loading', message: undefined, posterVisible: true });
    if (engine === youtube) {
      youtube?.stop();
    }
    loadCurrent();
  },

  seek(seconds: number) {
    const { duration } = timeStore.get();
    engine?.seek(Math.max(0, duration ? Math.min(duration - 0.5, seconds) : seconds));
  },

  seekBy(delta: number) {
    player.seek(timeStore.get().position + delta);
  },

  setMuted(muted: boolean) {
    engine?.setMuted(muted);
    if (!muted) {
      engine?.play();
    }
  },

  cycleRate() {
    const state = playerStore.get();
    const next = RATES[(RATES.indexOf(state.rate) + 1) % RATES.length];
    engine?.setRate(next);
    patch({ rate: next });
  },
};

export function currentItem(state: PlayerState): PlayableItem | undefined {
  return state.queue[state.index];
}
