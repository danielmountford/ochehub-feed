import { useState } from 'react';
import type { FeedItem, PlayableItem, VideoItem } from '../data/types';
import { isPlayable } from '../data/types';
import { episodesOfShow, type Focus, type FollowType, followLabel, prefsStore, resolveAttachment } from '../lib/feed';
import { createStore, useStore } from '../lib/store';
import { player } from '../player/controller';
import { cx } from '../ui/bits';

/* ----------------------------------------------------------------- toast */

export const toastStore = createStore<{ id: number; text: string } | null>(null);
let toastTimer = 0;

export function toast(text: string) {
  window.clearTimeout(toastTimer);
  toastStore.set({ id: Date.now(), text });
  toastTimer = window.setTimeout(() => toastStore.set(null), 2600);
}

/* ----------------------------------------------------------------- focus */

/** "Show me only this player / competition / source" in For you. */
export const focusStore = createStore<Focus | null>(null);

export function emitFocus(focus: Focus | null) {
  focusStore.set(focus);
  if (focus) {
    window.dispatchEvent(new CustomEvent('feed:focus'));
  }
}

/* --------------------------------------------------------------- follows */

const followKey: Record<FollowType, 'players' | 'competitions' | 'sources'> = {
  player: 'players',
  competition: 'competitions',
  source: 'sources',
};

export function isFollowing(type: FollowType, id: string) {
  return prefsStore.get()[followKey[type]].includes(id);
}

export function toggleFollow(type: FollowType, id: string) {
  const key = followKey[type];
  prefsStore.set((prefs) => ({
    ...prefs,
    [key]: prefs[key].includes(id) ? prefs[key].filter((entry) => entry !== id) : [...prefs[key], id],
  }));
}

export function FollowButton({ type, id, compact }: { type: FollowType; id: string; compact?: boolean }) {
  const following = useStore(prefsStore, (prefs) => prefs[followKey[type]].includes(id));
  const [bump, setBump] = useState(false);
  return (
    <button
      aria-pressed={following}
      className={cx('follow-btn', following && 'is-following', compact && 'is-compact', bump && 'is-bumping')}
      onAnimationEnd={() => setBump(false)}
      onClick={(event) => {
        event.stopPropagation();
        setBump(true);
        toggleFollow(type, id);
        toast(following ? `Unfollowed ${followLabel(type, id)}` : `Following ${followLabel(type, id)}`);
      }}
      type="button"
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}

/* ----------------------------------------------------------------- share */

export async function shareItem(item: FeedItem) {
  const data = { title: item.title, url: item.url };
  try {
    if (navigator.share) {
      await navigator.share(data);
      return;
    }
    await navigator.clipboard.writeText(item.url);
    toast('Link copied');
  } catch {
    // Share sheet dismissed, or clipboard blocked.
  }
}

/* ------------------------------------------------------------------ open */

/**
 * Opens anything from the feed. Videos and Shorts play in the swipeable card
 * with the surrounding list as their queue; podcasts queue the show's
 * episodes; news leaves for the publisher; social posts open what they link to.
 */
export function openItem(item: FeedItem, context: FeedItem[] = []) {
  if (item.kind === 'video' || item.kind === 'short') {
    const queue = context.filter((entry): entry is VideoItem => entry.kind === item.kind);
    const list = queue.some((entry) => entry.id === item.id) ? queue : [item];
    player.open(list as PlayableItem[], list.findIndex((entry) => entry.id === item.id));
    return;
  }
  if (item.kind === 'podcast') {
    const episodes = episodesOfShow(item.sourceId);
    player.open(episodes, Math.max(0, episodes.findIndex((entry) => entry.id === item.id)));
    return;
  }
  if (item.kind === 'social') {
    const attached = resolveAttachment(item);
    if (attached && (isPlayable(attached) || attached.kind === 'news')) {
      openItem(attached, [attached]);
    }
    return;
  }
  window.open(item.url, '_blank', 'noopener');
}
