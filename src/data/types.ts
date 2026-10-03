/**
 * Feed content model for the prototype. Shapes follow the OcheHub Feed DTOs
 * (`@ochehub/types` feed.ts) closely enough to swap this snapshot for the BFF,
 * with two additions the redesign needs: `short` and `social` items.
 */

export type ItemKind = 'video' | 'short' | 'podcast' | 'news' | 'social';

export type SourceKind = 'videoChannel' | 'podcastShow' | 'newsPublisher';

export interface Source {
  id: string;
  kind: SourceKind;
  name: string;
  /** Short label for tight spaces (chips, monograms). */
  short: string;
  monogram: string;
  /** Monogram disc colour, taken from the OcheHub primitive palette. */
  color: string;
  url: string;
  /** Podcast artwork or channel image when the source publishes one. */
  image?: string;
  blurb?: string;
}

export interface Player {
  id: string;
  first: string;
  last: string;
  nickname?: string;
  /** `primary_brand_hue` from the OcheHub top-500 player file. */
  hue: number;
}

export interface Competition {
  id: string;
  name: string;
  short: string;
}

interface ItemBase {
  id: string;
  kind: ItemKind;
  sourceId: string;
  /** Verbatim source title. */
  title: string;
  /** Real publish time when the source gives one. Shown on cards. */
  publishedAt?: string;
  /** Ordering only. Never shown: used where a real publish time is unknown. */
  sortAt: string;
  players: string[];
  competitions: string[];
  url: string;
}

export interface VideoItem extends ItemBase {
  kind: 'video' | 'short';
  youtubeId: string;
  /** Display split of the source title: punchy headline + context line. */
  headline: string;
  context?: string;
}

export interface PodcastItem extends ItemBase {
  kind: 'podcast';
  audioUrl: string;
  durationSeconds: number;
  description?: string;
}

export interface NewsItem extends ItemBase {
  kind: 'news';
}

export interface SocialItem extends ItemBase {
  kind: 'social';
  platform: 'X' | 'Instagram' | 'TikTok';
  handle: string;
  text: string;
  /** Feed item this post points at, if any. */
  attachId?: string;
  /** Sample content: social sources are not in the approved catalogue yet. */
  sample: true;
}

export type FeedItem = VideoItem | PodcastItem | NewsItem | SocialItem;
export type PlayableItem = VideoItem | PodcastItem;

export function isPlayable(item: FeedItem): item is PlayableItem {
  return item.kind === 'video' || item.kind === 'short' || item.kind === 'podcast';
}
