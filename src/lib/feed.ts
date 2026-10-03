import { accountFollows, competitionById, playerById, sourceById } from '../data/catalogue';
import { allItems, itemById } from '../data/content';
import type { FeedItem, ItemKind, NewsItem, PodcastItem, SocialItem, VideoItem } from '../data/types';
import { createPersistedStore } from './store';

export type Strength = 'everything' | 'boost' | 'only';

export interface Prefs {
  /** Follows shared with the OcheHub account. */
  players: string[];
  competitions: string[];
  /** Feed follows: channels, shows and publishers. */
  sources: string[];
  /** Content types included in For you. */
  kinds: ItemKind[];
  /** How hard follows steer For you. */
  strength: Strength;
}

export const ALL_KINDS: ItemKind[] = ['video', 'short', 'podcast', 'news', 'social'];

export const kindLabels: Record<ItemKind, string> = {
  video: 'Videos',
  short: 'Shorts',
  podcast: 'Podcasts',
  news: 'News',
  social: 'Social',
};

export const kindSingular: Record<ItemKind, string> = {
  video: 'Video',
  short: 'Short',
  podcast: 'Podcast',
  news: 'News',
  social: 'Social',
};

export const defaultPrefs: Prefs = {
  players: accountFollows.players,
  competitions: accountFollows.competitions,
  sources: accountFollows.sources,
  kinds: ALL_KINDS,
  strength: 'boost',
};

export const prefsStore = createPersistedStore<Prefs>('ochehub-feed:prefs:v1', defaultPrefs);

export interface Library {
  saved: string[];
  /** Podcast progress in seconds, keyed by item id. */
  progress: Record<string, { position: number; duration: number; updatedAt: number }>;
}

export const libraryStore = createPersistedStore<Library>('ochehub-feed:library:v1', {
  saved: ['v-pl-final'],
  // Seeded so Continue listening has something to show on first run.
  progress: { 'p-ltd-wgp-preview': { position: 1012, duration: 2882, updatedAt: 1 } },
});

export function toggleSaved(id: string) {
  libraryStore.set((library) => ({
    ...library,
    saved: library.saved.includes(id) ? library.saved.filter((entry) => entry !== id) : [id, ...library.saved],
  }));
}

export function saveProgress(id: string, position: number, duration: number) {
  libraryStore.set((library) => ({
    ...library,
    progress: { ...library.progress, [id]: { position, duration, updatedAt: Date.now() } },
  }));
}

export type FollowType = 'player' | 'competition' | 'source';

export interface Reason {
  type: FollowType;
  id: string;
  label: string;
}

export interface Focus {
  type: FollowType;
  id: string;
}

export function followLabel(type: FollowType, id: string) {
  if (type === 'player') {
    const player = playerById.get(id);
    return player ? `${player.first} ${player.last}` : id;
  }
  if (type === 'competition') {
    return competitionById.get(id)?.name ?? id;
  }
  return sourceById.get(id)?.short ?? id;
}

/** Why an item is in the feed: the strongest follow it matches. */
export function reasonFor(item: FeedItem, prefs: Prefs): Reason | undefined {
  const player = item.players.find((id) => prefs.players.includes(id));
  if (player) {
    return { type: 'player', id: player, label: followLabel('player', player) };
  }
  const competition = item.competitions.find((id) => prefs.competitions.includes(id));
  if (competition) {
    return { type: 'competition', id: competition, label: followLabel('competition', competition) };
  }
  if (prefs.sources.includes(item.sourceId)) {
    return { type: 'source', id: item.sourceId, label: followLabel('source', item.sourceId) };
  }
  return undefined;
}

const HOUR = 3_600_000;

/** Recency, nudged forward for followed players, competitions and sources. */
function score(item: FeedItem, prefs: Prefs) {
  let value = Date.parse(item.sortAt);
  if (prefs.strength === 'everything') {
    return value;
  }
  if (item.players.some((id) => prefs.players.includes(id))) {
    value += 96 * HOUR;
  }
  if (item.competitions.some((id) => prefs.competitions.includes(id))) {
    value += 48 * HOUR;
  }
  if (prefs.sources.includes(item.sourceId)) {
    value += 24 * HOUR;
  }
  return value;
}

function matchesFocus(item: FeedItem, focus: Focus) {
  if (focus.type === 'player') {
    return item.players.includes(focus.id);
  }
  if (focus.type === 'competition') {
    return item.competitions.includes(focus.id);
  }
  return item.sourceId === focus.id;
}

export function rank(items: FeedItem[], prefs: Prefs, focus?: Focus | null) {
  let pool = items;
  if (focus) {
    pool = pool.filter((item) => matchesFocus(item, focus));
  } else if (prefs.strength === 'only') {
    pool = pool.filter((item) => reasonFor(item, prefs));
  }
  return [...pool].sort((a, b) => score(b, prefs) - score(a, prefs));
}

export type FeedModule =
  | { type: 'spotlight'; id: string; items: (VideoItem | PodcastItem)[] }
  | { type: 'shorts'; id: string; items: VideoItem[] }
  | { type: 'headlines'; id: string; lead: NewsItem; rest: NewsItem[] }
  | { type: 'watch'; id: string; title: string; lead: VideoItem; rest: VideoItem[] }
  | { type: 'listen'; id: string; items: PodcastItem[] }
  | { type: 'social'; id: string; items: SocialItem[] }
  | { type: 'video-list'; id: string; title: string; items: VideoItem[] }
  | { type: 'news-list'; id: string; title: string; items: NewsItem[] }
  | { type: 'episode-list'; id: string; title: string; items: PodcastItem[] };

/**
 * Builds the For you page as a rhythm of different modules instead of one long
 * list of identical cards. Empty modules drop out, so the page reshapes itself
 * around whatever the viewer has tuned in.
 */
export function composeForYou(prefs: Prefs, focus?: Focus | null): FeedModule[] {
  const enabled = allItems.filter((item) => prefs.kinds.includes(item.kind));
  const ranked = rank(enabled, prefs, focus);
  const of = <T extends FeedItem>(kind: ItemKind) => ranked.filter((item) => item.kind === kind) as T[];

  const videos = of<VideoItem>('video');
  const shortItems = of<VideoItem>('short');
  const episodes = of<PodcastItem>('podcast');
  const articles = of<NewsItem>('news');
  const posts = of<SocialItem>('social');

  const modules: FeedModule[] = [];

  const spotlight: (VideoItem | PodcastItem)[] = videos.slice(0, 4);
  if (episodes.length && spotlight.length >= 2) {
    spotlight.splice(2, 0, episodes[0]);
  } else if (episodes.length && !spotlight.length) {
    spotlight.push(...episodes.slice(0, 3));
  }
  if (spotlight.length) {
    modules.push({ type: 'spotlight', id: 'spotlight', items: spotlight });
  }
  const restVideos = videos.slice(4);
  const restEpisodes = episodes.filter((episode) => !spotlight.includes(episode));

  if (shortItems.length) {
    modules.push({ type: 'shorts', id: 'shorts', items: shortItems });
  }
  // The lead story is the best match; the rest run newest-first so the wire reads like one.
  const byTime = (a: NewsItem, b: NewsItem) => Date.parse(b.sortAt) - Date.parse(a.sortAt);
  const wire = articles.slice(1).sort(byTime);
  if (articles.length) {
    modules.push({ type: 'headlines', id: 'headlines', lead: articles[0], rest: wire.slice(0, 3) });
  }
  if (restVideos.length) {
    modules.push({
      type: 'watch',
      id: 'watch',
      title: 'Worth a watch',
      lead: restVideos[0],
      rest: restVideos.slice(1, 3),
    });
  }
  if (restEpisodes.length) {
    modules.push({ type: 'listen', id: 'listen', items: restEpisodes.slice(0, 7) });
  }
  if (posts.length) {
    modules.push({ type: 'social', id: 'social', items: posts.slice(0, 8) });
  }
  if (restVideos.length > 3) {
    modules.push({ type: 'video-list', id: 'more-video', title: 'More to watch', items: restVideos.slice(3, 11) });
  }
  if (wire.length > 3) {
    modules.push({ type: 'news-list', id: 'more-news', title: 'More headlines', items: wire.slice(3, 9) });
  }
  if (restEpisodes.length > 7) {
    modules.push({ type: 'episode-list', id: 'more-listen', title: 'More to hear', items: restEpisodes.slice(7, 13) });
  }
  return modules;
}

export function itemsOfKind<T extends FeedItem>(kind: ItemKind, prefs: Prefs, sourceId?: string | null): T[] {
  const pool = allItems.filter((item) => item.kind === kind && (!sourceId || item.sourceId === sourceId));
  // Type tabs always show everything of that type; follows only affect order.
  return rank(pool, { ...prefs, strength: prefs.strength === 'only' ? 'boost' : prefs.strength }) as T[];
}

/** How many items For you would show with these settings (live count in the Tune sheet). */
export function countForYou(prefs: Prefs) {
  const enabled = allItems.filter((item) => prefs.kinds.includes(item.kind));
  return rank(enabled, prefs).length;
}

export function countFor(type: FollowType, id: string) {
  return allItems.filter((item) => matchesFocus(item, { type, id })).length;
}

export function search(query: string): FeedItem[] {
  const needle = query.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!needle) {
    return [];
  }
  return allItems
    .filter((item) => {
      const source = sourceById.get(item.sourceId);
      const haystack = [
        item.title,
        source?.name,
        ...item.players.map((id) => followLabel('player', id)),
        ...item.competitions.map((id) => followLabel('competition', id)),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    })
    .sort((a, b) => Date.parse(b.sortAt) - Date.parse(a.sortAt));
}

export function resolveAttachment(post: SocialItem) {
  return post.attachId ? itemById.get(post.attachId) : undefined;
}

/** Episodes of one show, newest first: the podcast player's prev/next queue. */
export function episodesOfShow(sourceId: string) {
  return (allItems.filter((item) => item.kind === 'podcast' && item.sourceId === sourceId) as PodcastItem[]).sort(
    (a, b) => Date.parse(b.sortAt) - Date.parse(a.sortAt),
  );
}
