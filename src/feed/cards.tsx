import { createContext, useContext } from 'react';
import { sourceById } from '../data/catalogue';
import type { FeedItem, NewsItem, PodcastItem, SocialItem, VideoItem } from '../data/types';
import { kindSingular, libraryStore, prefsStore, reasonFor, resolveAttachment } from '../lib/feed';
import { durationLabel, timeShort } from '../lib/format';
import { useStore } from '../lib/store';
import { currentItem, playerStore } from '../player/controller';
import { Artwork, cx, SourceAvatar, splitHeadline, Thumb } from '../ui/bits';
import { PlayIcon } from '../ui/icons';
import { openItem } from './actions';

/**
 * Cards for the second style. The rule throughout: no boxes. A card is its
 * picture (or, for news, its headline), a title and at most one quiet line.
 * What kind of thing it is reads from its shape: 16:9 is a video, 9:16 a
 * Short, a square a podcast, bare type a headline.
 */

/** The lists a tapped video or Short should continue through when swiped. */
export const QueueContext = createContext<{ videos: VideoItem[]; shorts: VideoItem[] }>({ videos: [], shorts: [] });

function useOpen(item: FeedItem) {
  const queues = useContext(QueueContext);
  return () => openItem(item, item.kind === 'short' ? queues.shorts : queues.videos);
}

/** Status of the player if this item is the one in it, otherwise null. */
function useNowPlaying(id: string) {
  return useStore(playerStore, (state) => (state.mode !== 'closed' && currentItem(state)?.id === id ? state.status : null));
}

/**
 * The one personalisation cue on a card: "Following Luke Littler" under items
 * that are placed where they are because of a player or competition the viewer
 * follows. Everything else stays untagged, and so does the whole feed when
 * follows are switched off in Tune.
 */
export function FollowTag({ item }: { item: FeedItem }) {
  const prefs = useStore(prefsStore);
  const reason = reasonFor(item, prefs);
  if (!reason || reason.type === 'source' || prefs.strength === 'everything') {
    return null;
  }
  return <span className="follow-tag">Following {reason.label}</span>;
}

function Playing({ status }: { status: string | null }) {
  if (!status) {
    return null;
  }
  return (
    <span aria-label={status === 'playing' ? 'Playing' : 'Paused'} className={cx('eq', status === 'playing' && 'is-playing')} role="img">
      <i />
      <i />
      <i />
    </span>
  );
}

function Meta({ item, extra }: { item: FeedItem; extra?: string }) {
  const source = sourceById.get(item.sourceId);
  const status = useNowPlaying(item.id);
  return (
    <span className="meta">
      <Playing status={status} />
      <span>
        {source?.short}
        {extra ? ` · ${extra}` : ''}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------- spotlight */

/** A card in the slider at the top of For you. */
export function SpotlightCard({
  item,
  position,
  total,
  eager,
}: {
  item: VideoItem | PodcastItem;
  position: number;
  total: number;
  eager?: boolean;
}) {
  const open = useOpen(item);
  const source = sourceById.get(item.sourceId);
  const isPodcast = item.kind === 'podcast';
  const headline = isPodcast ? item.title : item.headline;
  const context = isPodcast ? durationLabel(item.durationSeconds) : item.context;

  return (
    <article className={cx('spot', `spot-${item.kind}`)}>
      <button aria-label={`${isPodcast ? 'Listen' : 'Watch'}: ${item.title}`} className="spot-hit" onClick={open} type="button" />
      <div className="spot-media">
        {isPodcast ? (
          <>
            <Artwork className="spot-art-wash" sourceId={item.sourceId} />
            <Artwork className="spot-art" eager={eager} sourceId={item.sourceId} />
          </>
        ) : (
          <Thumb eager={eager} item={item} quality="high" />
        )}
      </div>
      <div className="spot-shade" />

      <span className="spot-count">
        {String(position + 1).padStart(2, '0')}
        <i>/{String(total).padStart(2, '0')}</i>
      </span>

      <div className="spot-body">
        <h2 className={cx('spot-title', headline.length > 60 && 'is-long')}>{headline}</h2>
        {context ? <p className="spot-context">{context}</p> : null}
        <FollowTag item={item} />
        <div className="spot-foot">
          <SourceAvatar size={30} sourceId={item.sourceId} />
          <span className="spot-source">{source?.name}</span>
          <span aria-hidden="true" className="spot-play">
            <PlayIcon size={26} />
            {isPodcast ? 'Listen' : 'Watch'}
          </span>
        </div>
      </div>
    </article>
  );
}

/* ---------------------------------------------------------------- shorts */

export function ShortTile({ item }: { item: VideoItem }) {
  const open = useOpen(item);
  return (
    <button className="short-tile" onClick={open} type="button">
      <Thumb item={item} />
      <span className="short-tile-text">
        <span className="short-tile-title">{item.headline}</span>
        <FollowTag item={item} />
      </span>
    </button>
  );
}

/* ---------------------------------------------------------------- videos */

export function VideoCard({ item, size = 'md' }: { item: VideoItem; size?: 'lg' | 'md' | 'row' }) {
  const open = useOpen(item);
  return (
    <article className={cx('video', `is-${size}`)}>
      <button aria-label={`Watch: ${item.title}`} className="card-hit" onClick={open} type="button" />
      <div className="video-media">
        <Thumb item={item} quality={size === 'lg' ? 'high' : 'low'} />
        <PlayIcon className="video-glyph" size={size === 'lg' ? 22 : 16} />
      </div>
      <div className="video-text">
        <h3>{item.headline}</h3>
        <Meta item={item} />
        <FollowTag item={item} />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ news */

/** A headline is only type: title and one line saying who and when. */
export function Headline({ item, lead }: { item: NewsItem; lead?: boolean }) {
  const { headline } = splitHeadline(item.title);
  return (
    <a className={cx('headline', lead && 'is-lead')} href={item.url} rel="noreferrer" target="_blank">
      <h3>{headline}</h3>
      <Meta extra={item.publishedAt ? timeShort(item.publishedAt) : undefined} item={item} />
      <FollowTag item={item} />
    </a>
  );
}

/* -------------------------------------------------------------- podcasts */

function useListenLabel(item: PodcastItem) {
  const saved = useStore(libraryStore, (library) => library.progress[item.id]);
  const ratio = saved?.duration ? Math.min(1, saved.position / saved.duration) : 0;
  const started = ratio > 0.02 && ratio < 0.97;
  return {
    ratio: started ? ratio : 0,
    label: started && saved ? `${durationLabel(saved.duration - saved.position)} left` : durationLabel(item.durationSeconds),
  };
}

export function EpisodeTile({ item }: { item: PodcastItem }) {
  const { ratio, label } = useListenLabel(item);
  return (
    <button className="episode-tile" onClick={() => openItem(item)} type="button">
      <span className="episode-art">
        <Artwork sourceId={item.sourceId} />
        {ratio ? (
          <span className="episode-progress">
            <i style={{ transform: `scaleX(${ratio})` }} />
          </span>
        ) : null}
      </span>
      <strong>{item.title}</strong>
      <Meta extra={label} item={item} />
      <FollowTag item={item} />
    </button>
  );
}

export function EpisodeRow({ item }: { item: PodcastItem }) {
  const { ratio, label } = useListenLabel(item);
  return (
    <button className="episode-row" onClick={() => openItem(item)} type="button">
      <span className="episode-art">
        <Artwork sourceId={item.sourceId} />
        {ratio ? (
          <span className="episode-progress">
            <i style={{ transform: `scaleX(${ratio})` }} />
          </span>
        ) : null}
      </span>
      <span className="episode-row-text">
        <strong>{item.title}</strong>
        <Meta extra={label} item={item} />
        <FollowTag item={item} />
      </span>
    </button>
  );
}

/* ---------------------------------------------------------------- social */

export function PostCard({ item }: { item: SocialItem }) {
  const source = sourceById.get(item.sourceId);
  const attached = resolveAttachment(item);
  const queues = useContext(QueueContext);
  const hasMedia = attached && (attached.kind === 'video' || attached.kind === 'short' || attached.kind === 'podcast');

  function openAttached() {
    if (attached) {
      openItem(attached, attached.kind === 'short' ? queues.shorts : attached.kind === 'video' ? queues.videos : []);
    }
  }

  return (
    <article className="post">
      {attached ? (
        <button aria-label={`Open: ${attached.title}`} className="card-hit" onClick={openAttached} type="button" />
      ) : null}
      <header>
        <SourceAvatar size={26} sourceId={item.sourceId} />
        <strong>{source?.short}</strong>
        <span>
          {item.platform} · {timeShort(item.sortAt)}
        </span>
      </header>
      <p>{item.text}</p>
      {hasMedia ? (
        <span className={cx('post-media', `is-${attached.kind}`)}>
          {attached.kind === 'podcast' ? <Artwork sourceId={attached.sourceId} /> : <Thumb item={attached as VideoItem} />}
        </span>
      ) : null}
      <FollowTag item={item} />
    </article>
  );
}

/* ----------------------------------------------------------- generic row */

/** Compact row used by search results and the saved list. */
export function CompactRow({ item, onOpen }: { item: FeedItem; onOpen?: () => void }) {
  const source = sourceById.get(item.sourceId);
  const queues = useContext(QueueContext);
  const title =
    item.kind === 'video' || item.kind === 'short'
      ? item.headline
      : item.kind === 'social'
        ? item.text
        : item.kind === 'news'
          ? splitHeadline(item.title).headline
          : item.title;
  const hasPicture = item.kind === 'video' || item.kind === 'short' || item.kind === 'podcast';
  return (
    <button
      className="compact-row"
      onClick={() => {
        onOpen?.();
        openItem(item, item.kind === 'short' ? queues.shorts : queues.videos);
      }}
      type="button"
    >
      <span className="compact-text">
        <strong>{title}</strong>
        <span>
          {kindSingular[item.kind]} · {source?.short}
        </span>
      </span>
      {hasPicture ? (
        <span className={cx('compact-media', `is-${item.kind}`)}>
          {item.kind === 'podcast' ? <Artwork sourceId={item.sourceId} /> : <Thumb item={item as VideoItem} />}
        </span>
      ) : null}
    </button>
  );
}

