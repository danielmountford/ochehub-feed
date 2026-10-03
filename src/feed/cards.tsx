import { type CSSProperties, createContext, useContext } from 'react';
import { playerById, sourceById } from '../data/catalogue';
import type { FeedItem, NewsItem, PodcastItem, SocialItem, VideoItem } from '../data/types';
import { libraryStore, type Prefs, prefsStore, reasonFor, resolveAttachment } from '../lib/feed';
import { clockTime, durationLabel, shortDate, timeAgo } from '../lib/format';
import { useStore } from '../lib/store';
import { currentItem, player, playerStore } from '../player/controller';
import { Artwork, cx, KindGlyph, KindTag, PlayerDisc, SaveButton, SourceAvatar, splitHeadline, Thumb } from '../ui/bits';
import { ExternalIcon, PauseIcon, PlayIcon } from '../ui/icons';
import { openItem } from './actions';

/** The lists a tapped video or Short should continue through when swiped. */
export const QueueContext = createContext<{ videos: VideoItem[]; shorts: VideoItem[] }>({ videos: [], shorts: [] });

function useOpen(item: FeedItem) {
  const queues = useContext(QueueContext);
  return () => openItem(item, item.kind === 'short' ? queues.shorts : queues.videos);
}

/** True while this item is the one in the player. */
function useNowPlaying(id: string) {
  return useStore(playerStore, (state) => (state.mode !== 'closed' && currentItem(state)?.id === id ? state.status : null));
}

function ReasonChip({ item, prefs }: { item: FeedItem; prefs: Prefs }) {
  const reason = reasonFor(item, prefs);
  // The source is already named on every card, so only people and competitions earn a chip.
  if (!reason || reason.type === 'source' || prefs.strength === 'everything') {
    return null;
  }
  return (
    <span className="reason-chip">
      {reason.type === 'player' ? <PlayerDisc playerId={reason.id} size={18} /> : <i aria-hidden="true" />}
      {reason.type === 'player' ? playerById.get(reason.id)?.last : reason.label}
    </span>
  );
}

function NowPlayingBadge({ status }: { status: string }) {
  return (
    <span className="now-badge">
      <span className={cx('eq', status === 'playing' && 'is-playing')}>
        <i />
        <i />
        <i />
      </span>
      {status === 'playing' ? 'Playing' : 'Paused'}
    </span>
  );
}

/* ------------------------------------------------------------- spotlight */

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
  const prefs = useStore(prefsStore);
  const open = useOpen(item);
  const source = sourceById.get(item.sourceId);
  const isPodcast = item.kind === 'podcast';
  const headline = isPodcast ? item.title : item.headline;
  const context = isPodcast ? `${source?.short} · ${durationLabel(item.durationSeconds)}` : item.context;

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

      <div className="spot-top">
        <span className="spot-count">
          {String(position + 1).padStart(2, '0')}
          <i>/{String(total).padStart(2, '0')}</i>
        </span>
        <SaveButton className="glass-btn" item={item} />
      </div>

      <div className="spot-body">
        <div className="spot-tags">
          <KindTag kind={item.kind} />
          <ReasonChip item={item} prefs={prefs} />
        </div>
        <h2 className={cx('spot-title', headline.length > 60 && 'is-long')}>{headline}</h2>
        {context ? <p className="spot-context">{context}</p> : null}
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

export function ShortTile({ item, index = 0 }: { item: VideoItem; index?: number }) {
  const open = useOpen(item);
  const source = sourceById.get(item.sourceId);
  return (
    <button className="short-tile" onClick={open} style={{ '--i': index } as CSSProperties} type="button">
      <Thumb item={item} />
      <span className="short-tile-shade" />
      <span className="short-tile-source">
        <SourceAvatar size={22} sourceId={item.sourceId} />
        {source?.short}
      </span>
      <span className="short-tile-play">
        <PlayIcon size={18} />
      </span>
      <span className="short-tile-title">{item.headline}</span>
    </button>
  );
}

/* ---------------------------------------------------------------- videos */

function VideoMeta({ item }: { item: VideoItem }) {
  const source = sourceById.get(item.sourceId);
  return (
    <span className="meta">
      <SourceAvatar size={22} sourceId={item.sourceId} />
      <span>{source?.name}</span>
    </span>
  );
}

export function VideoLead({ item }: { item: VideoItem }) {
  const prefs = useStore(prefsStore);
  const open = useOpen(item);
  const status = useNowPlaying(item.id);
  return (
    <article className="video-lead">
      <button aria-label={`Watch: ${item.title}`} className="card-hit" onClick={open} type="button" />
      <div className="video-lead-media">
        <Thumb item={item} quality="high" />
        <span className="play-badge">
          <PlayIcon size={24} />
        </span>
        {status ? <NowPlayingBadge status={status} /> : null}
      </div>
      <div className="video-lead-body">
        <div className="tag-line">
          <KindTag kind="video" />
          <ReasonChip item={item} prefs={prefs} />
        </div>
        <h3>{item.headline}</h3>
        {item.context ? <p>{item.context}</p> : null}
        <div className="card-foot">
          <VideoMeta item={item} />
          <SaveButton item={item} />
        </div>
      </div>
    </article>
  );
}

export function VideoTile({ item }: { item: VideoItem }) {
  const open = useOpen(item);
  const status = useNowPlaying(item.id);
  return (
    <article className="video-tile">
      <button aria-label={`Watch: ${item.title}`} className="card-hit" onClick={open} type="button" />
      <div className="video-tile-media">
        <Thumb item={item} />
        <span className="play-badge is-small">
          <PlayIcon size={16} />
        </span>
        {status ? <NowPlayingBadge status={status} /> : null}
      </div>
      <h3>{item.headline}</h3>
      <VideoMeta item={item} />
    </article>
  );
}

export function VideoRow({ item }: { item: VideoItem }) {
  const prefs = useStore(prefsStore);
  const open = useOpen(item);
  const status = useNowPlaying(item.id);
  return (
    <article className="video-row">
      <button aria-label={`Watch: ${item.title}`} className="card-hit" onClick={open} type="button" />
      <div className="video-row-media">
        <Thumb item={item} />
        <span className="play-badge is-small">
          <PlayIcon size={16} />
        </span>
        {status ? <NowPlayingBadge status={status} /> : null}
      </div>
      <div className="video-row-body">
        <h3>{item.headline}</h3>
        {item.context ? <p>{item.context}</p> : null}
        <div className="card-foot">
          <VideoMeta item={item} />
          <ReasonChip item={item} prefs={prefs} />
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ news */

function NewsPlayers({ item }: { item: NewsItem }) {
  if (!item.players.length) {
    return null;
  }
  return (
    <span className="disc-stack">
      {item.players.slice(0, 3).map((id) => (
        <PlayerDisc key={id} playerId={id} size={22} />
      ))}
    </span>
  );
}

/** The lead story: a cream "front page" that breaks the dark feed like a sheet of newsprint. */
export function FrontPage({ item }: { item: NewsItem }) {
  const source = sourceById.get(item.sourceId);
  const { kicker, headline } = splitHeadline(item.title);
  return (
    <a className="front" href={item.url} rel="noreferrer" target="_blank">
      <div className="front-top">
        <span className="front-source">{source?.name}</span>
        <span className="front-rule" />
        <span className="front-time">{item.publishedAt ? clockTime(item.publishedAt) : 'Latest'}</span>
        <SaveButton item={item} />
      </div>
      {kicker ? <p className="front-kicker">{kicker}</p> : null}
      <h3 className={cx(headline.length > 110 && 'is-long')}>{headline}</h3>
      <div className="front-foot">
        <NewsPlayers item={item} />
        <span className="front-age">{timeAgo(item.publishedAt)}</span>
        <span className="front-read">
          Read at {source?.short}
          <ExternalIcon size={16} />
        </span>
      </div>
    </a>
  );
}

export function WireRow({ item }: { item: NewsItem }) {
  const source = sourceById.get(item.sourceId);
  const { kicker, headline } = splitHeadline(item.title);
  return (
    <a className="wire-row" href={item.url} rel="noreferrer" target="_blank">
      <span className="wire-time">{item.publishedAt ? clockTime(item.publishedAt) : '·'}</span>
      <span className="wire-body">
        {kicker ? <span className="wire-kicker">{kicker}</span> : null}
        <span className="wire-title">{headline}</span>
        <span className="wire-meta">
          {source?.name}
          {item.publishedAt ? ` · ${timeAgo(item.publishedAt)}` : ''}
          <NewsPlayers item={item} />
        </span>
      </span>
      <ExternalIcon className="wire-out" size={16} />
    </a>
  );
}

/* -------------------------------------------------------------- podcasts */

function EpisodePlay({ item, size = 'md' }: { item: PodcastItem; size?: 'md' | 'lg' }) {
  const status = useNowPlaying(item.id);
  const saved = useStore(libraryStore, (library) => library.progress[item.id]);
  const ratio = saved?.duration ? Math.min(1, saved.position / saved.duration) : 0;
  const left = saved?.duration ? Math.max(0, saved.duration - saved.position) : item.durationSeconds;
  const playing = status === 'playing';
  return (
    <button
      aria-label={playing ? `Pause ${item.title}` : `Play ${item.title}`}
      className={cx('ep-play', `is-${size}`, status && 'is-current')}
      onClick={(event) => {
        event.stopPropagation();
        if (status) {
          player.toggle();
        } else {
          openItem(item);
        }
      }}
      style={{ '--ratio': ratio } as CSSProperties}
      type="button"
    >
      <span className="ep-play-ring">{playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}</span>
      <span>{ratio > 0.02 && ratio < 0.97 ? `${durationLabel(left)} left` : durationLabel(item.durationSeconds)}</span>
    </button>
  );
}

export function EpisodeCard({ item }: { item: PodcastItem }) {
  const source = sourceById.get(item.sourceId);
  return (
    <article className="ep-card" style={{ '--tint': source?.color } as CSSProperties}>
      <button aria-label={`Open ${item.title}`} className="card-hit" onClick={() => openItem(item)} type="button" />
      <div className="ep-card-head">
        <Artwork className="ep-card-art" sourceId={item.sourceId} />
        <div>
          <span className="ep-show">{source?.short}</span>
          <span className="ep-date">{shortDate(item.publishedAt)}</span>
        </div>
        <SaveButton item={item} />
      </div>
      <h3>{item.title}</h3>
      <div className="ep-card-foot">
        <EpisodePlay item={item} />
        <span aria-hidden="true" className="wave">
          {Array.from({ length: 14 }, (_, bar) => (
            <i key={bar} style={{ '--h': 0.25 + ((bar * 37 + item.title.length * 13) % 75) / 100 } as CSSProperties} />
          ))}
        </span>
      </div>
    </article>
  );
}

export function EpisodeRow({ item }: { item: PodcastItem }) {
  const source = sourceById.get(item.sourceId);
  const status = useNowPlaying(item.id);
  return (
    <article className={cx('ep-row', status && 'is-current')}>
      <button aria-label={`Open ${item.title}`} className="card-hit" onClick={() => openItem(item)} type="button" />
      <Artwork className="ep-row-art" sourceId={item.sourceId} />
      <div className="ep-row-body">
        <span className="ep-show">
          {source?.short} · {shortDate(item.publishedAt)}
        </span>
        <h3>{item.title}</h3>
        <EpisodePlay item={item} />
      </div>
      <SaveButton item={item} />
    </article>
  );
}

/* ---------------------------------------------------------------- social */

export function PostCard({ item, wide }: { item: SocialItem; wide?: boolean }) {
  const source = sourceById.get(item.sourceId);
  const attached = resolveAttachment(item);
  const queues = useContext(QueueContext);

  function openAttached() {
    if (!attached) {
      return;
    }
    openItem(attached, attached.kind === 'short' ? queues.shorts : attached.kind === 'video' ? queues.videos : []);
  }

  return (
    <article className={cx('post', wide && 'is-wide')}>
      <header className="post-head">
        <SourceAvatar size={38} sourceId={item.sourceId} />
        <div>
          <strong>{source?.name}</strong>
          <span>
            {item.handle} · {timeAgo(item.sortAt)}
          </span>
        </div>
        <span className="post-platform">{item.platform}</span>
      </header>
      <p className="post-text">{item.text}</p>
      {attached ? (
        <button className={cx('post-attach', `is-${attached.kind}`)} onClick={openAttached} type="button">
          {attached.kind === 'video' || attached.kind === 'short' ? (
            <span className="post-attach-media">
              <Thumb item={attached} />
              <span className="play-badge is-small">
                <PlayIcon size={16} />
              </span>
            </span>
          ) : attached.kind === 'podcast' ? (
            <Artwork className="post-attach-art" sourceId={attached.sourceId} />
          ) : (
            <span className="post-attach-glyph">
              <KindGlyph kind="news" size={20} />
            </span>
          )}
          <span className="post-attach-text">
            <KindTag kind={attached.kind} />
            <strong>{attached.kind === 'video' || attached.kind === 'short' ? attached.headline : attached.title}</strong>
          </span>
        </button>
      ) : null}
    </article>
  );
}

/* ----------------------------------------------------------- generic row */

/** Compact row used by search results and the saved list. */
export function CompactRow({ item, onOpen }: { item: FeedItem; onOpen?: () => void }) {
  const source = sourceById.get(item.sourceId);
  const queues = useContext(QueueContext);
  const title = item.kind === 'video' || item.kind === 'short' ? item.headline : item.kind === 'social' ? item.text : item.title;
  return (
    <button
      className="compact-row"
      onClick={() => {
        onOpen?.();
        openItem(item, item.kind === 'short' ? queues.shorts : queues.videos);
      }}
      type="button"
    >
      <span className={cx('compact-media', `is-${item.kind}`)}>
        {item.kind === 'video' || item.kind === 'short' ? (
          <Thumb item={item} />
        ) : item.kind === 'podcast' ? (
          <Artwork sourceId={item.sourceId} />
        ) : (
          <KindGlyph kind={item.kind} size={20} />
        )}
      </span>
      <span className="compact-text">
        <KindTag kind={item.kind} />
        <strong>{title}</strong>
        <span>{source?.name}</span>
      </span>
    </button>
  );
}
