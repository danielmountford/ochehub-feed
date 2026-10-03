import { type CSSProperties, useMemo, useState } from 'react';
import { sourceById, sources } from '../data/catalogue';
import type { NewsItem, PodcastItem, SocialItem, SourceKind, VideoItem } from '../data/types';
import {
  composeForYou,
  countFor,
  episodesOfShow,
  type Focus,
  followLabel,
  itemsOfKind,
  libraryStore,
  type Prefs,
} from '../lib/feed';
import { durationLabel } from '../lib/format';
import { useStore } from '../lib/store';
import { Artwork, cx, PlayerDisc, Reveal, SourceAvatar } from '../ui/bits';
import { CrossIcon, PlayIcon, TuneIcon } from '../ui/icons';
import { emitFocus, FollowButton, openItem } from './actions';
import { EpisodeRow, FrontPage, PostCard, ShortTile, VideoLead, VideoRow, WireRow } from './cards';
import { ModuleView, Rail, SectionHead } from './modules';

export type TabId = 'for-you' | 'videos' | 'shorts' | 'podcasts' | 'news' | 'social';

export const tabs: { id: TabId; label: string }[] = [
  { id: 'for-you', label: 'For you' },
  { id: 'videos', label: 'Videos' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'podcasts', label: 'Podcasts' },
  { id: 'news', label: 'News' },
  { id: 'social', label: 'Social' },
];

/* ------------------------------------------------------------------ lens */

/**
 * The strip that says what the feed is tuned to, and the way in to change it.
 * Follows come straight from the OcheHub account.
 */
export function Lens({ prefs, focus, onTune }: { prefs: Prefs; focus: Focus | null; onTune: () => void }) {
  if (focus) {
    const count = countFor(focus.type, focus.id);
    return (
      <div className="lens is-focus">
        <span className="lens-avatars">
          {focus.type === 'player' ? (
            <PlayerDisc playerId={focus.id} size={34} />
          ) : focus.type === 'source' ? (
            <SourceAvatar size={34} sourceId={focus.id} />
          ) : (
            <span className="lens-comp">★</span>
          )}
        </span>
        <span className="lens-text">
          <small>Focused on</small>
          <strong>{followLabel(focus.type, focus.id)}</strong>
        </span>
        <span className="lens-count">{count} items</span>
        <button aria-label="Clear focus" className="lens-clear" onClick={() => emitFocus(null)} type="button">
          <CrossIcon size={18} />
        </button>
      </div>
    );
  }

  const names = [
    ...prefs.players.map((id) => followLabel('player', id).split(' ').slice(1).join(' ')),
    ...prefs.competitions.map((id) => followLabel('competition', id)),
    ...prefs.sources.map((id) => followLabel('source', id)),
  ];
  const everything = prefs.strength === 'everything';
  const shown = names.slice(0, 2);

  return (
    <button className="lens" onClick={onTune} type="button">
      <span className="lens-avatars">
        {prefs.players.slice(0, 3).map((id) => (
          <PlayerDisc key={id} playerId={id} size={30} />
        ))}
        {!prefs.players.length ? <span className="lens-comp">+</span> : null}
      </span>
      <span className="lens-text">
        <small>{everything ? 'Showing everything' : prefs.strength === 'only' ? 'Only showing' : 'Tuned to'}</small>
        <strong>
          {shown.length ? shown.join(', ') : 'Pick who to follow'}
          {names.length > shown.length ? <i> +{names.length - shown.length}</i> : null}
        </strong>
      </span>
      <span className="lens-cta">
        <TuneIcon size={15} />
        Tune
      </span>
    </button>
  );
}

/* --------------------------------------------------------------- for you */

export function ForYouView({ prefs, focus, goTo, onTune }: { prefs: Prefs; focus: Focus | null; goTo: (tab: TabId) => void; onTune: () => void }) {
  const modules = useMemo(() => composeForYou(prefs, focus), [prefs, focus]);

  return (
    <>
      <Lens focus={focus} onTune={onTune} prefs={prefs} />
      {modules.length ? (
        modules.map((module) => <ModuleView goTo={(tab) => goTo(tab as TabId)} key={module.id} module={module} />)
      ) : (
        <EmptyState
          action={focus ? { label: 'Clear focus', run: () => emitFocus(null) } : { label: 'Tune your feed', run: onTune }}
          body={
            focus
              ? 'Nothing in the current snapshot mentions this follow yet.'
              : 'Your follows and content types leave nothing to show. Loosen them and the feed fills back up.'
          }
          title="Nothing here yet"
        />
      )}
      {modules.length ? <EndCap /> : null}
    </>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: { label: string; run: () => void } }) {
  return (
    <div className="empty">
      <span aria-hidden="true" className="empty-mark" />
      <h2>{title}</h2>
      <p>{body}</p>
      {action ? (
        <button className="pill-btn" onClick={action.run} type="button">
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

function EndCap() {
  return (
    <footer className="endcap">
      <span aria-hidden="true" className="oche-line" />
      <p>You’re all caught up</p>
      <span>Snapshot from 2 Oct 2026 · 11 approved sources</span>
    </footer>
  );
}

/* --------------------------------------------------------- source filter */

function SourceFilter({ kind, value, onChange }: { kind: SourceKind; value: string | null; onChange: (id: string | null) => void }) {
  const options = sources.filter((source) => source.kind === kind);
  return (
    <Rail className="rail-filter">
      <button aria-pressed={value === null} className={cx('filter-chip', value === null && 'is-on')} onClick={() => onChange(null)} type="button">
        All
      </button>
      {options.map((source) => (
        <button
          aria-pressed={value === source.id}
          className={cx('filter-chip', value === source.id && 'is-on')}
          key={source.id}
          onClick={() => onChange(value === source.id ? null : source.id)}
          type="button"
        >
          <SourceAvatar size={22} sourceId={source.id} />
          {source.short}
        </button>
      ))}
    </Rail>
  );
}

/* ---------------------------------------------------------------- videos */

export function VideosView({ prefs }: { prefs: Prefs }) {
  const [sourceId, setSourceId] = useState<string | null>(null);
  const items = useMemo(() => itemsOfKind<VideoItem>('video', prefs, sourceId), [prefs, sourceId]);
  return (
    <>
      <SourceFilter kind="videoChannel" onChange={setSourceId} value={sourceId} />
      <div className="tab-body" key={sourceId ?? 'all'}>
        {items.length ? (
          <>
            <Reveal className="module">
              <VideoLead item={items[0]} />
            </Reveal>
            <div className="video-list module">
              {items.slice(1).map((item, index) => (
                <Reveal delay={Math.min(index, 4) * 40} key={item.id}>
                  <VideoRow item={item} />
                </Reveal>
              ))}
            </div>
          </>
        ) : (
          <EmptyState body="No videos from this channel in the current snapshot." title="Nothing to watch here" />
        )}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- shorts */

export function ShortsView({ prefs }: { prefs: Prefs }) {
  const items = useMemo(() => itemsOfKind<VideoItem>('short', prefs), [prefs]);
  return (
    <div className="tab-body">
      <p className="tab-intro">Tap one and swipe sideways to keep going.</p>
      <div className="shorts-grid">
        {items.map((item, index) => (
          <Reveal delay={(index % 3) * 50} key={item.id}>
            <ShortTile index={index} item={item} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- podcasts */

export function PodcastsView({ prefs }: { prefs: Prefs }) {
  const [sourceId, setSourceId] = useState<string | null>(null);
  const items = useMemo(() => itemsOfKind<PodcastItem>('podcast', prefs, sourceId), [prefs, sourceId]);
  const progress = useStore(libraryStore, (library) => library.progress);
  const shows = sources.filter((source) => source.kind === 'podcastShow');

  const resume = useMemo(() => {
    return Object.entries(progress)
      .filter(([, value]) => value.duration > 0 && value.position > 5 && value.position < value.duration - 30)
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .map(([id, value]) => ({ item: itemsOfKind<PodcastItem>('podcast', prefs).find((entry) => entry.id === id), value }))
      .filter((entry): entry is { item: PodcastItem; value: (typeof progress)[string] } => Boolean(entry.item));
  }, [prefs, progress]);

  return (
    <div className="tab-body">
      {resume.length && !sourceId ? (
        <section className="module">
          <SectionHead title="Continue listening" />
          <Rail className="rail-resume">
            {resume.map(({ item, value }) => {
              const source = sourceById.get(item.sourceId);
              const ratio = value.position / value.duration;
              return (
                <button className="resume" key={item.id} onClick={() => openItem(item)} type="button">
                  <Artwork className="resume-art" sourceId={item.sourceId} />
                  <span className="resume-text">
                    <span className="ep-show">{source?.short}</span>
                    <strong>{item.title}</strong>
                    <span className="resume-left">{durationLabel(value.duration - value.position)} left</span>
                    <span className="mini-progress">
                      <i style={{ transform: `scaleX(${ratio})` }} />
                    </span>
                  </span>
                  <span className="resume-play">
                    <PlayIcon size={20} />
                  </span>
                </button>
              );
            })}
          </Rail>
        </section>
      ) : null}

      <section className="module">
        <SectionHead title="Shows" />
        <Rail className="rail-shows">
          {shows.map((show) => {
            const latest = episodesOfShow(show.id)[0];
            const selected = sourceId === show.id;
            return (
              <article className={cx('show', selected && 'is-selected')} key={show.id} style={{ '--tint': show.color } as CSSProperties}>
                <button
                  aria-label={`Show only ${show.name}`}
                  aria-pressed={selected}
                  className="card-hit"
                  onClick={() => setSourceId(selected ? null : show.id)}
                  type="button"
                />
                <Artwork className="show-art" sourceId={show.id} />
                <strong>{show.short}</strong>
                <span>{episodesOfShow(show.id).length} episodes</span>
                <div className="show-actions">
                  <FollowButton compact id={show.id} type="source" />
                  {latest ? (
                    <button aria-label={`Play latest from ${show.short}`} className="show-play" onClick={() => openItem(latest)} type="button">
                      <PlayIcon size={18} />
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </Rail>
      </section>

      <section className="module" key={sourceId ?? 'all'}>
        <SectionHead
          moreLabel="Show all"
          onMore={sourceId ? () => setSourceId(null) : undefined}
          title={sourceId ? (sourceById.get(sourceId)?.short ?? 'Episodes') : 'Latest episodes'}
        />
        <div className="ep-list">
          {items.map((item, index) => (
            <Reveal delay={Math.min(index, 4) * 40} key={item.id}>
              <EpisodeRow item={item} />
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ news */

export function NewsView({ prefs }: { prefs: Prefs }) {
  const [sourceId, setSourceId] = useState<string | null>(null);
  const items = useMemo(() => itemsOfKind<NewsItem>('news', prefs, sourceId), [prefs, sourceId]);
  return (
    <>
      <SourceFilter kind="newsPublisher" onChange={setSourceId} value={sourceId} />
      <div className="tab-body" key={sourceId ?? 'all'}>
        {items.length ? (
          <div className="headlines module">
            <Reveal>
              <FrontPage item={items[0]} />
            </Reveal>
            <Reveal className="wire" delay={60}>
              {items.slice(1).map((item) => (
                <WireRow item={item} key={item.id} />
              ))}
            </Reveal>
          </div>
        ) : null}
        <p className="tab-footnote">Headlines open at the publisher. Excerpts and images stay off until each source’s terms allow them.</p>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- social */

export function SocialView({ prefs }: { prefs: Prefs }) {
  const items = useMemo(() => itemsOfKind<SocialItem>('social', prefs), [prefs]);
  return (
    <div className="tab-body">
      <p className="tab-intro">
        <b>Sample posts.</b> Social sources aren’t in the approved catalogue yet, so each of these is written around a real item from
        that source to show how posts will sit in the feed.
      </p>
      <div className="post-list">
        {items.map((item, index) => (
          <Reveal delay={Math.min(index, 4) * 40} key={item.id}>
            <PostCard item={item} wide />
          </Reveal>
        ))}
      </div>
    </div>
  );
}

