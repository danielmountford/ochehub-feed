import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import type { PodcastItem, VideoItem } from '../data/types';
import type { FeedModule } from '../lib/feed';
import { prefersReducedMotion } from '../lib/motion';
import { useStore } from '../lib/store';
import { playerStore } from '../player/controller';
import { cx, Reveal } from '../ui/bits';
import { ArrowRightIcon } from '../ui/icons';
import { EpisodeRow, EpisodeTile, Headline, PostCard, ShortTile, SpotlightCard, VideoCard } from './cards';

/* --------------------------------------------------------- section label */

/** A section is introduced by one word, and an arrow if there is more. */
export function SectionHead({ title, onMore, note }: { title: string; onMore?: () => void; note?: string }) {
  return (
    <header className="sec">
      <h2>{title}</h2>
      {note ? <span className="sec-note">{note}</span> : null}
      {onMore ? (
        <button aria-label={`All ${title.toLowerCase()}`} className="sec-more" onClick={onMore} type="button">
          <ArrowRightIcon size={20} />
        </button>
      ) : null}
    </header>
  );
}

/* ------------------------------------------------------------- spotlight */

const SPOT_INTERVAL = 6500;

/**
 * The slider at the top of For you. Native scroll-snap does the swiping (so it
 * feels like the platform); on top of that the picture drifts at a different
 * speed to its card, and a timer walks through the cards until you touch it.
 */
export function Spotlight({ items }: { items: (VideoItem | PodcastItem)[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const playerBusy = useStore(playerStore, (state) => state.mode === 'full');
  const auto = !paused && inView && !playerBusy && items.length > 1 && !prefersReducedMotion();

  // Parallax and the active card, both read off the scroll position.
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
        data-hscroll
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onPointerDown={() => setPaused(true)}
        ref={trackRef}
      >
        {items.map((item, index) => (
          <SpotlightCard eager={index < 2} item={item} key={item.id} position={index} total={items.length} />
        ))}
      </div>
      {items.length > 1 ? (
        <div className="spot-pips" role="tablist">
          {items.map((item, index) => (
            <button
              aria-label={`Show item ${index + 1} of ${items.length}`}
              aria-selected={index === active}
              className={cx('spot-pip', index === active && 'is-active', auto && 'is-running')}
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
      ) : null}
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
            {module.items.map((item) => (
              <ShortTile item={item} key={item.id} />
            ))}
          </Rail>
        </Reveal>
      );

    case 'headlines':
      return (
        <Reveal as="section" className="module">
          <SectionHead onMore={() => goTo('news')} title="Headlines" />
          <div className="headlines">
            <Headline item={module.lead} lead />
            <div className="headline-list">
              {module.rest.map((item) => (
                <Headline item={item} key={item.id} />
              ))}
            </div>
          </div>
        </Reveal>
      );

    case 'watch':
      return (
        <Reveal as="section" className="module">
          <SectionHead onMore={() => goTo('videos')} title="Watch" />
          <div className="watch">
            <VideoCard item={module.lead} size="lg" />
            {module.rest.length ? (
              <div className="watch-pair">
                {module.rest.map((item) => (
                  <VideoCard item={item} key={item.id} />
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
              <EpisodeTile item={item} key={item.id} />
            ))}
          </Rail>
        </Reveal>
      );

    case 'social':
      return (
        <Reveal as="section" className="module">
          <SectionHead note="Sample posts" onMore={() => goTo('social')} title="Social" />
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
          <SectionHead onMore={() => goTo('videos')} title="More to watch" />
          <div className="video-list">
            {module.items.map((item, index) => (
              <Reveal delay={Math.min(index, 3) * 40} key={item.id}>
                <VideoCard item={item} size="row" />
              </Reveal>
            ))}
          </div>
        </section>
      );

    case 'news-list':
      return (
        <Reveal as="section" className="module">
          <SectionHead onMore={() => goTo('news')} title="More headlines" />
          <div className="headline-list">
            {module.items.map((item) => (
              <Headline item={item} key={item.id} />
            ))}
          </div>
        </Reveal>
      );

    case 'episode-list':
      return (
        <Reveal as="section" className="module">
          <SectionHead onMore={() => goTo('podcasts')} title="More to hear" />
          <div className="episode-list">
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
