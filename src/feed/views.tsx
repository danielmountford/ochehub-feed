import { useMemo, useState } from 'react';
import { sourceById, sources } from '../data/catalogue';
import type { NewsItem, PodcastItem, SocialItem, SourceKind, VideoItem } from '../data/types';
import { composeForYou, type Focus, followLabel, itemsOfKind, libraryStore, type Prefs } from '../lib/feed';
import { useStore } from '../lib/store';
import { Artwork, cx, Reveal } from '../ui/bits';
import { CrossIcon } from '../ui/icons';
import { emitFocus, FollowButton } from './actions';
import { EpisodeRow, EpisodeTile, Headline, PostCard, ShortTile, VideoCard } from './cards';
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

/* --------------------------------------------------------------- for you */

export function ForYouView({ prefs, focus, goTo, onTune }: { prefs: Prefs; focus: Focus | null; goTo: (tab: TabId) => void; onTune: () => void }) {
  const modules = useMemo(() => composeForYou(prefs, focus), [prefs, focus]);

  return (
    <div className="tab-body" key={focus ? `${focus.type}-${focus.id}` : 'all'}>
      {focus ? (
        <div className="focus">
          <button onClick={() => emitFocus(null)} type="button">
            {followLabel(focus.type, focus.id)}
            <CrossIcon size={16} />
          </button>
        </div>
      ) : null}
      {modules.length ? (
        modules.map((module) => <ModuleView goTo={(tab) => goTo(tab as TabId)} key={module.id} module={module} />)
      ) : (
        <Empty
          action={focus ? { label: 'Clear', run: () => emitFocus(null) } : { label: 'Tune', run: onTune }}
          title={focus ? 'Nothing on this yet' : 'Nothing matches'}
        />
      )}
      {modules.length ? <p className="endcap">You’re all caught up</p> : null}
    </div>
  );
}

function Empty({ title, action }: { title: string; action?: { label: string; run: () => void } }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {action ? (
        <button className="pill-btn" onClick={action.run} type="button">
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------- source filter */

/** Plain words, not chips: the chosen source is simply the bright one. */
function SourceFilter({ kind, value, onChange }: { kind: SourceKind; value: string | null; onChange: (id: string | null) => void }) {
  const options = sources.filter((source) => source.kind === kind);
  return (
    <Rail className="rail-filter">
      <button aria-pressed={value === null} className={cx('filter', value === null && 'is-on')} onClick={() => onChange(null)} type="button">
        All
      </button>
      {options.map((source) => (
        <button
          aria-pressed={value === source.id}
          className={cx('filter', value === source.id && 'is-on')}
          key={source.id}
          onClick={() => onChange(value === source.id ? null : source.id)}
          type="button"
        >
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
            <Reveal className="tab-lead">
              <VideoCard item={items[0]} size="lg" />
            </Reveal>
            <div className="video-list">
              {items.slice(1).map((item, index) => (
                <Reveal delay={Math.min(index, 4) * 40} key={item.id}>
                  <VideoCard item={item} size="row" />
                </Reveal>
              ))}
            </div>
          </>
        ) : (
          <Empty title="Nothing here yet" />
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
      <div className="shorts-grid">
        {items.map((item, index) => (
          <Reveal delay={(index % 3) * 50} key={item.id}>
            <ShortTile item={item} />
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
    const all = itemsOfKind<PodcastItem>('podcast', prefs);
    return Object.entries(progress)
      .filter(([, value]) => value.duration > 0 && value.position > 5 && value.position < value.duration - 30)
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .map(([id]) => all.find((entry) => entry.id === id))
      .filter((entry): entry is PodcastItem => Boolean(entry));
  }, [prefs, progress]);

  return (
    <div className="tab-body">
      {resume.length && !sourceId ? (
        <section className="module">
          <SectionHead title="Continue" />
          <Rail className="rail-episodes">
            {resume.map((item) => (
              <EpisodeTile item={item} key={item.id} />
            ))}
          </Rail>
        </section>
      ) : null}

      <section className="module">
        <SectionHead title="Shows" />
        <Rail className="rail-shows">
          {shows.map((show) => {
            const selected = sourceId === show.id;
            return (
              <div className={cx('show', selected && 'is-selected', sourceId && !selected && 'is-dim')} key={show.id}>
                <button
                  aria-label={`Show only ${show.name}`}
                  aria-pressed={selected}
                  className="show-art"
                  onClick={() => setSourceId(selected ? null : show.id)}
                  type="button"
                >
                  <Artwork sourceId={show.id} />
                </button>
                <strong>{show.short}</strong>
                <FollowButton id={show.id} type="source" />
              </div>
            );
          })}
        </Rail>
      </section>

      <section className="module" key={sourceId ?? 'all'}>
        <SectionHead title={sourceId ? (sourceById.get(sourceId)?.short ?? 'Episodes') : 'Latest'} />
        <div className="episode-list">
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
          <div className="headlines tab-lead">
            <Reveal>
              <Headline item={items[0]} lead />
            </Reveal>
            <Reveal className="headline-list" delay={60}>
              {items.slice(1).map((item) => (
                <Headline item={item} key={item.id} />
              ))}
            </Reveal>
          </div>
        ) : null}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- social */

export function SocialView({ prefs }: { prefs: Prefs }) {
  const items = useMemo(() => itemsOfKind<SocialItem>('social', prefs), [prefs]);
  return (
    <div className="tab-body">
      <p className="tab-note">Sample posts. Social sources aren’t connected yet.</p>
      <div className="post-list">
        {items.map((item, index) => (
          <Reveal delay={Math.min(index, 4) * 40} key={item.id}>
            <PostCard item={item} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
