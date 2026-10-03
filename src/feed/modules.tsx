import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import type { PodcastItem, VideoItem } from '../data/types';
import type { FeedModule } from '../lib/feed';
import { prefersReducedMotion } from '../lib/motion';
import { useStore } from '../lib/store';
import { playerStore } from '../player/controller';
import { cx, Reveal } from '../ui/bits';
import { ArrowRightIcon } from '../ui/icons';
import {
  EpisodeCard,
  EpisodeRow,
  FrontPage,
  PostCard,
  ShortTile,
  SpotlightCard,
  VideoLead,
  VideoRow,
  VideoTile,
  WireRow,
} from './cards';

/* --------------------------------------------------------- section head */

/** Section title with the "oche line": the throw-line motif that runs through the feed. */
export function SectionHead({ title, onMore, moreLabel, note }: { title: string; onMore?: () => void; moreLabel?: string; note?: string }) {
  return (
    <header className="sec-head">
      <h2>{title}</h2>
      <span aria-hidden="true" className="oche-line" />
      {note ? <span className="sec-note">{note}</span> : null}
      {onMore ? (
        <button className="sec-more" onClick={onMore} type="button">
          {moreLabel ?? 'All'}
          <ArrowRightIcon size={16} />
        </button>
      ) : null}
    </header>
  );
}

/* ------------------------------------------------------------- spotlight */

const SPOT_INTERVAL = 6500;

/**
 * Lead carousel. Native scroll-snap does the swiping (so it feels like the
 * platform); on top of that the artwork drifts at a different speed to the
 * card, and a story-style timer walks through the cards until you touch it.
 */
export function Spotlight({ items }: { items: (VideoItem | PodcastItem)[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const playerBusy = useStore(playerStore, (state) => state.mode === 'full');
  const auto = !paused && inView && !playerBusy && items.length > 1 && !prefersReducedMotion();

  // Parallax + active card from scroll position.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const centre = track.scrollLeft + track.clientWidth / 2;
      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      Array.from(track.children).forEach((child, index) => {
        const card = child as HTMLElement;
        const cardCentre = card.offsetLeft + card.offsetWidth / 2;
        const delta = (cardCentre - centre) / card.offsetWidth;
        card.style.setProperty('--drift', delta.toFixed(4));
        if (Math.abs(delta) < nearestDistance) {
          nearestDistance = Math.abs(delta);
          nearest = index;
        }
      });
      setActive(nearest);
    };
    const onScroll = () => {
      if (!frame) {
        frame = requestAnimationFrame(update);
      }
    };
    update();
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [items.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.5 });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  function goTo(index: number) {
    const track = trackRef.current;
    const card = track?.children[index] as HTMLElement | undefined;
    if (!track || !card) {
      return;
    }
    track.scrollTo({ left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' });
  }

  useEffect(() => {
    if (!auto) {
      return;
    }
    const timer = window.setTimeout(() => goTo((active + 1) % items.length), SPOT_INTERVAL);
    return () => window.clearTimeout(timer);
    // goTo only reads refs, so it is safe to leave out.
  }, [auto, active, items.length]);

  return (
    <section aria-label="Top of your feed" className="spotlight">
      <div
        className="spot-track"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onPointerDown={() => setPaused(true)}
        ref={trackRef}
      >
        {items.map((item, index) => (
          <SpotlightCard eager={index < 2} item={item} key={item.id} position={index} total={items.length} />
        ))}
      </div>
      <div className="spot-pips" role="tablist">
        {items.map((item, index) => (
          <button
            aria-label={`Show item ${index + 1}`}
            aria-selected={index === active}
            className={cx('spot-pip', index === active && 'is-active', index < active && 'is-done', auto && 'is-running')}
            key={item.id}
            onClick={() => {
              setPaused(true);
              goTo(index);
            }}
            role="tab"
            style={{ '--interval': `${SPOT_INTERVAL}ms` } as CSSProperties}
            type="button"
          >
            <i />
          </button>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ rail */

/** Horizontal scroller that bleeds to the screen edge. */
export function Rail({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('rail', className)} data-hscroll>
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- modules */

export function ModuleView({ module, goTo }: { module: FeedModule; goTo: (tab: string) => void }) {
  switch (module.type) {
    case 'spotlight':
      return <Spotlight items={module.items} />;

    case 'shorts':
      return (
        <Reveal as="section" className="module">
          <SectionHead onMore={() => goTo('shorts')} title="Shorts" />
          <Rail className="rail-shorts">
            {module.items.map((item, index) => (
              <ShortTile index={index} item={item} key={item.id} />
            ))}
          </Rail>
        </Reveal>
      );

    case 'headlines':
      return (
        <Reveal as="section" className="module">
          <SectionHead onMore={() => goTo('news')} title="Headlines" />
          <div className="headlines">
            <FrontPage item={module.lead} />
            {module.rest.length ? (
              <div className="wire">
                {module.rest.map((item) => (
                  <WireRow item={item} key={item.id} />
                ))}
              </div>
            ) : null}
          </div>
        </Reveal>
      );

    case 'watch':
      return (
        <Reveal as="section" className="module">
          <SectionHead onMore={() => goTo('videos')} title={module.title} />
          <div className="watch">
            <VideoLead item={module.lead} />
            {module.rest.length ? (
              <div className="watch-pair">
                {module.rest.map((item) => (
                  <VideoTile item={item} key={item.id} />
                ))}
              </div>
            ) : null}
          </div>
        </Reveal>
      );

    case 'listen':
      return (
        <Reveal as="section" className="module">
          <SectionHead onMore={() => goTo('podcasts')} title="Listen" />
          <Rail className="rail-episodes">
            {module.items.map((item) => (
              <EpisodeCard item={item} key={item.id} />
            ))}
          </Rail>
        </Reveal>
      );

    case 'social':
      return (
        <Reveal as="section" className="module">
          <SectionHead note="Sample posts" onMore={() => goTo('social')} title="Socials" />
          <Rail className="rail-posts">
            {module.items.map((item) => (
              <PostCard item={item} key={item.id} />
            ))}
          </Rail>
        </Reveal>
      );

    case 'video-list':
      return (
        <section className="module">
          <SectionHead onMore={() => goTo('videos')} title={module.title} />
          <div className="video-list">
            {module.items.map((item, index) => (
              <Reveal delay={Math.min(index, 3) * 40} key={item.id}>
                <VideoRow item={item} />
              </Reveal>
            ))}
          </div>
        </section>
      );

    case 'news-list':
      return (
        <Reveal as="section" className="module">
          <SectionHead onMore={() => goTo('news')} title={module.title} />
          <div className="wire">
            {module.items.map((item) => (
              <WireRow item={item} key={item.id} />
            ))}
          </div>
        </Reveal>
      );

    case 'episode-list':
      return (
        <Reveal as="section" className="module">
          <SectionHead onMore={() => goTo('podcasts')} title={module.title} />
          <div className="ep-list">
            {module.items.map((item) => (
              <EpisodeRow item={item} key={item.id} />
            ))}
          </div>
        </Reveal>
      );

    default:
      return null;
  }
}
