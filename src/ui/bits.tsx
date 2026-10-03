import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { playerById, sourceById } from '../data/catalogue';
import type { FeedItem, ItemKind, VideoItem } from '../data/types';
import { kindSingular, libraryStore, toggleSaved } from '../lib/feed';
import { initials } from '../lib/format';
import { useStore } from '../lib/store';
import { BookmarkIcon, NewsGlyph, PodcastGlyph, ShortGlyph, SocialGlyph, VideoGlyph } from './icons';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------ thumbnails */

/** YouTube thumbnail URLs, best first. A missing size comes back as a 120px placeholder. */
function thumbCandidates(item: VideoItem, quality: 'high' | 'low') {
  const base = `https://i.ytimg.com/vi/${item.youtubeId}`;
  if (item.kind === 'short') {
    return [`${base}/oar2.jpg`, `${base}/hqdefault.jpg`];
  }
  return quality === 'high'
    ? [`${base}/maxresdefault.jpg`, `${base}/hq720.jpg`, `${base}/hqdefault.jpg`]
    : [`${base}/hq720.jpg`, `${base}/hqdefault.jpg`];
}

/**
 * Video artwork. Until the image arrives (or if it never does) the tile shows
 * a tinted panel with the source monogram, so the layout never looks broken.
 */
export function Thumb({
  item,
  quality = 'low',
  eager,
  className,
}: {
  item: VideoItem;
  quality?: 'high' | 'low';
  eager?: boolean;
  className?: string;
}) {
  const candidates = thumbCandidates(item, quality);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const source = sourceById.get(item.sourceId);

  useEffect(() => {
    setAttempt(0);
    setLoaded(false);
  }, [item.youtubeId]);

  function settle(image: HTMLImageElement) {
    if (image.naturalWidth <= 120 && attempt < candidates.length - 1) {
      setAttempt(attempt + 1);
      return;
    }
    setLoaded(true);
  }

  useEffect(() => {
    const image = ref.current;
    if (image?.complete && image.naturalWidth > 0) {
      settle(image);
    }
  });

  return (
    <span className={cx('thumb', loaded && 'is-loaded', className)} style={{ '--tint': source?.color } as CSSProperties}>
      <span aria-hidden="true" className="thumb-fallback">
        {source?.monogram}
      </span>
      <img
        alt=""
        decoding="async"
        draggable={false}
        loading={eager ? 'eager' : 'lazy'}
        onError={() => (attempt < candidates.length - 1 ? setAttempt(attempt + 1) : undefined)}
        onLoad={(event) => settle(event.currentTarget)}
        ref={ref}
        src={candidates[attempt]}
      />
    </span>
  );
}

/** Podcast artwork with a monogram fallback. */
export function Artwork({ sourceId, className, eager }: { sourceId: string; className?: string; eager?: boolean }) {
  const source = sourceById.get(sourceId);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  return (
    <span className={cx('artwork', loaded && 'is-loaded', className)} style={{ '--tint': source?.color } as CSSProperties}>
      <span aria-hidden="true" className="artwork-fallback">
        <b>{source?.monogram}</b>
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      {source?.image && !failed ? (
        <img
          alt=""
          decoding="async"
          draggable={false}
          loading={eager ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
          ref={ref}
          src={source.image}
        />
      ) : null}
    </span>
  );
}

/* --------------------------------------------------------------- avatars */

export function SourceAvatar({ sourceId, size = 28 }: { sourceId: string; size?: number }) {
  const source = sourceById.get(sourceId);
  return (
    <span
      aria-hidden="true"
      className="src-avatar"
      style={{ '--tint': source?.color, '--size': `${size}px` } as CSSProperties}
    >
      {source?.kind === 'podcastShow' && source.image ? <Artwork sourceId={sourceId} /> : source?.monogram}
    </span>
  );
}

export function PlayerDisc({ playerId, size = 28 }: { playerId: string; size?: number }) {
  const player = playerById.get(playerId);
  if (!player) {
    return null;
  }
  return (
    <span aria-hidden="true" className="player-disc" style={{ '--hue': player.hue, '--size': `${size}px` } as CSSProperties}>
      {initials(player.first, player.last)}
    </span>
  );
}

/* ------------------------------------------------------------------ tags */

const kindGlyphs: Record<ItemKind, (props: { size?: number }) => ReactNode> = {
  video: VideoGlyph,
  short: ShortGlyph,
  podcast: PodcastGlyph,
  news: NewsGlyph,
  social: SocialGlyph,
};

export function KindGlyph({ kind, size = 14 }: { kind: ItemKind; size?: number }) {
  const Glyph = kindGlyphs[kind];
  return <Glyph size={size} />;
}

export function KindTag({ kind, className }: { kind: ItemKind; className?: string }) {
  return (
    <span className={cx('kind-tag', `kind-${kind}`, className)}>
      <KindGlyph kind={kind} size={13} />
      {kindSingular[kind]}
    </span>
  );
}

/* ---------------------------------------------------------------- saving */

export function SaveButton({ item, className, label }: { item: FeedItem; className?: string; label?: boolean }) {
  const saved = useStore(libraryStore, (library) => library.saved.includes(item.id));
  const [pop, setPop] = useState(false);
  return (
    <button
      aria-label={saved ? 'Remove from saved' : 'Save for later'}
      aria-pressed={saved}
      className={cx('save-btn', saved && 'is-saved', pop && 'is-popping', className)}
      onAnimationEnd={() => setPop(false)}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        if (!saved) {
          setPop(true);
        }
        toggleSaved(item.id);
      }}
      type="button"
    >
      <BookmarkIcon filled={saved} size={20} />
      {label ? <span>{saved ? 'Saved' : 'Save'}</span> : null}
    </button>
  );
}

/* ---------------------------------------------------------------- reveal */

/**
 * Fades and lifts its children in the first time they scroll into view.
 * `delay` staggers siblings. Honours reduced motion through CSS.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.05 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const Component = Tag as 'div';
  return (
    <Component
      className={cx('reveal', shown && 'is-shown', className)}
      ref={ref as never}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Component>
  );
}

/** Splits "Kicker | Headline" news titles. */
export function splitHeadline(title: string) {
  const index = title.indexOf(' | ');
  if (index > 0 && index < 60) {
    return { kicker: title.slice(0, index), headline: title.slice(index + 3) };
  }
  return { kicker: undefined, headline: title };
}
