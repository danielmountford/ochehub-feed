import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import type { PodcastItem, VideoItem } from '../data/types';
import { attachDrag } from '../lib/drag';
import { clamp, lerp, MotionValue, progress, rubber, springs } from '../lib/motion';
import { useStore } from '../lib/store';
import { Artwork, cx, Thumb } from '../ui/bits';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '../ui/icons';
import { currentItem, player, playerStore } from './controller';
import { MiniBar } from './MiniBar';
import { PodcastCard } from './PodcastCard';
import { ShortOverlay, ShortSlide } from './ShortSlide';
import { VideoControls } from './VideoControls';
import { VideoSlide } from './VideoSlide';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const GAP = 16;

/** A light tick on devices that support it, when a gesture commits. */
function buzz() {
  try {
    navigator.vibrate?.(8);
  } catch {
    // Not available.
  }
}

/**
 * The player layer. One element (the "stage") holds the media for the whole
 * session; everything else is choreographed around three numbers:
 *
 *   open  0 → 1   the card sliding up from the bottom edge
 *   mini  0 → 1   the full card morphing into the mini player
 *   x     px      the horizontal position of the card pager
 *
 * A finger sets these directly; letting go hands them to a spring with the
 * release velocity, so every gesture can be caught and reversed mid-flight.
 */
export function PlayerHost() {
  const state = useStore(playerStore);
  const item = currentItem(state);
  const { mode, kind, queue, index } = state;

  const rootRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const bgMiniRef = useRef<HTMLDivElement>(null);
  const fullRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLDivElement>(null);

  const motion = useRef({ open: new MotionValue(0), mini: new MotionValue(0), x: new MotionValue(0) }).current;
  const geo = useRef({
    vw: 0,
    vh: 0,
    full: { x: 0, y: 0, w: 1, h: 1 } as Rect,
    bar: { x: 0, y: 0, w: 1, h: 1 } as Rect,
    thumb: { x: 0, y: 0, w: 1, h: 1 } as Rect,
    fullRadius: 0,
    stageRadius: 0,
  }).current;
  const release = useRef(0);
  const paging = useRef(false);
  const previousMode = useRef(mode);
  const drag = useRef<{ kind: 'page' | 'minimise' | 'mini'; from: number } | null>(null);

  /* ------------------------------------------------------------- render */

  const paint = useCallback(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const bg = bgRef.current;
    const full = fullRef.current;
    const mini = miniRef.current;
    const track = trackRef.current;
    if (!root || !stage || !bg || !full || !mini) {
      return;
    }
    const open = motion.open.get();
    const p = clamp(motion.mini.get(), 0, 1);
    const x = motion.x.get();
    const { vw, vh, bar, thumb } = geo;
    const slot = geo.full;

    // How far everything is pushed off the bottom edge while opening/dismissing.
    const away = (1 - open) * lerp(vh, vh - bar.y + 28, p);

    // Card background: full viewport → mini bar.
    const bx = lerp(0, bar.x, p);
    const by = lerp(0, bar.y, p) + away;
    const sx = lerp(1, bar.w / vw, p);
    const sy = lerp(1, bar.h / vh, p);
    const radius = lerp(geo.fullRadius + (1 - open) * 28, 18, p);
    bg.style.transform = `translate3d(${bx}px, ${by}px, 0) scale(${sx}, ${sy})`;
    bg.style.borderRadius = `${radius / sx}px / ${radius / sy}px`;
    if (bgMiniRef.current) {
      bgMiniRef.current.style.opacity = String(progress(p, 0.35, 0.9));
    }

    // Full card content fades and sinks as the morph starts.
    full.style.opacity = String(1 - progress(p, 0, 0.42));
    full.style.transform = `translate3d(0, ${away + p * vh * 0.16}px, 0)`;
    full.style.visibility = p > 0.995 ? 'hidden' : '';
    if (track) {
      track.style.transform = `translate3d(${x}px, 0, 0)`;
    }

    // Stage: the media itself, travelling between its slot and the mini thumbnail.
    const scale = lerp(1, thumb.h / slot.h, p);
    const tx = lerp(slot.x + x, thumb.x, p);
    const ty = lerp(slot.y, thumb.y, p) + away;
    stage.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
    stage.style.borderRadius = `${lerp(geo.stageRadius, 8, p) / scale}px`;

    // Mini bar content rides on the card background's top-left corner.
    mini.style.opacity = String(progress(p, 0.6, 1));
    mini.style.transform = `translate3d(${bx - bar.x}px, ${by - bar.y}px, 0)`;

    if (scrimRef.current) {
      scrimRef.current.style.opacity = String(open * (1 - p));
    }
    root.style.setProperty('--mini', p.toFixed(3));
    // The feed behind recedes slightly while the card is up.
    document.documentElement.style.setProperty('--player-depth', (open * (1 - p)).toFixed(3));
  }, [geo, motion]);

  const measure = useCallback(() => {
    const full = fullRef.current;
    const mini = miniRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!full || !mini || !stage) {
      return;
    }
    // The layer's own box, not the window: a desktop scrollbar gutter makes them differ.
    const root = rootRef.current;
    geo.vw = root?.clientWidth || window.innerWidth;
    geo.vh = root?.clientHeight || window.innerHeight;
    // Read natural layout positions with the animated transforms out of the way.
    full.style.transform = 'none';
    mini.style.transform = 'none';
    if (track) {
      track.style.transform = 'none';
    }
    const slot = full.querySelector<HTMLElement>('[data-slot="current"]');
    const thumbSlot = mini.querySelector<HTMLElement>('[data-mini-thumb]');
    const barRect = mini.getBoundingClientRect();
    geo.bar = { x: barRect.left, y: barRect.top, w: barRect.width, h: barRect.height };
    if (thumbSlot) {
      const rect = thumbSlot.getBoundingClientRect();
      geo.thumb = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
    }
    if (slot) {
      const rect = slot.getBoundingClientRect();
      geo.full = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
      geo.stageRadius = Number.parseFloat(getComputedStyle(slot).borderTopLeftRadius) || 0;
      stage.style.width = `${rect.width}px`;
      stage.style.height = `${rect.height}px`;
    }
    geo.fullRadius = Number.parseFloat(getComputedStyle(full).getPropertyValue('--card-radius')) || 0;
    paint();
  }, [geo, paint]);

  /* ------------------------------------------------------------- paging */

  const page = useCallback(
    (direction: 1 | -1, velocity = 0) => {
      const current = playerStore.get();
      const target = current.index + direction;
      if (paging.current || target < 0 || target >= current.queue.length) {
        return false;
      }
      paging.current = true;
      player.pause();
      buzz();
      motion.x.to(-direction * (geo.vw + GAP), {
        ...springs.pager,
        velocity,
        restDistance: 0.5,
        restSpeed: 8,
        onRest: () => {
          // Swap the cards and recentre in the same frame: no visible jump.
          flushSync(() => player.setIndex(target, direction));
          motion.x.set(0);
          paging.current = false;
        },
      });
      return true;
    },
    [geo, motion],
  );

  /**
   * First time a swipeable card opens, the pager leans towards the next card
   * and settles back: a one-off cue that there is more to the side.
   */
  const peek = useCallback(() => {
    const current = playerStore.get();
    if (current.kind === 'podcast' || current.index >= current.queue.length - 1) {
      return;
    }
    try {
      if (sessionStorage.getItem('ochehub-feed:peeked')) {
        return;
      }
      sessionStorage.setItem('ochehub-feed:peeked', '1');
    } catch {
      // No storage: show the cue anyway.
    }
    window.setTimeout(() => {
      if (playerStore.get().mode !== 'full' || paging.current || drag.current) {
        return;
      }
      motion.x.to(-56, {
        stiffness: 180,
        damping: 22,
        onRest: () => motion.x.to(0, springs.pager),
      });
    }, 900);
  }, [motion]);

  /* -------------------------------------------------------------- wiring */

  useEffect(() => {
    player.attach(mediaRef.current, { page });
    const unsubscribe = [motion.open.onChange(paint), motion.mini.onChange(paint), motion.x.onChange(paint)];
    return () => {
      player.attach(null, null);
      for (const off of unsubscribe) {
        off();
      }
    };
  }, [motion, page, paint]);

  useLayoutEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, [measure]);

  // Layout depends on what is showing (a Short's stage is taller than a video's).
  useLayoutEffect(() => {
    if (mode !== 'closed') {
      measure();
    }
  }, [measure, mode, kind, item?.id]);

  // Mode changes drive the springs. Gestures stash their release velocity first.
  useLayoutEffect(() => {
    const previous = previousMode.current;
    previousMode.current = mode;
    const velocity = release.current;
    release.current = 0;
    if (mode === 'full') {
      if (previous === 'closed') {
        motion.x.set(0);
        motion.mini.set(0);
        motion.open.set(0);
      }
      motion.open.to(1, springs.sheet);
      motion.mini.to(0, { ...springs.sheet, velocity });
      if (previous === 'closed') {
        peek();
      }
    } else if (mode === 'mini') {
      motion.open.to(1, springs.sheet);
      motion.mini.to(1, { ...springs.sheet, velocity });
    }
    document.documentElement.classList.toggle('player-full', mode === 'full');
    document.documentElement.classList.toggle('player-mini', mode === 'mini');
    if (mode === 'full') {
      document.documentElement.style.setProperty('--depth-origin', `${window.scrollY + window.innerHeight / 2}px`);
    }
  }, [mode, motion, peek, state.nonce]);

  const dismiss = useCallback(
    (velocity = 0) => {
      motion.open.to(0, { ...springs.sheet, velocity, onRest: () => player.close() });
    },
    [motion],
  );

  /* ------------------------------------------------------------ gestures */

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    return attachDrag(root, {
      begin(start) {
        return !start.target.closest?.('[data-nodrag]') && playerStore.get().mode !== 'closed';
      },
      claim(axis, direction, start) {
        const current = playerStore.get();
        if (paging.current) {
          return false;
        }
        if (current.mode === 'mini') {
          if (axis !== 'y') {
            return false;
          }
          drag.current = { kind: 'mini', from: motion.mini.get() };
          return true;
        }
        if (axis === 'x') {
          if (current.kind === 'podcast' || current.queue.length < 2 || start.target.closest('[data-hscroll]')) {
            return false;
          }
          drag.current = { kind: 'page', from: 0 };
          return true;
        }
        // Vertical: pull down to minimise, unless a scroller still has content above.
        if (direction < 0) {
          return false;
        }
        const scroller = start.target.closest<HTMLElement>('[data-scroll]');
        if (scroller && scroller.scrollTop > 0) {
          return false;
        }
        drag.current = { kind: 'minimise', from: motion.mini.get() };
        return true;
      },
      move({ dx, dy }) {
        const active = drag.current;
        if (!active) {
          return;
        }
        if (active.kind === 'page') {
          const current = playerStore.get();
          const atStart = current.index === 0 && dx > 0;
          const atEnd = current.index === current.queue.length - 1 && dx < 0;
          motion.x.set(atStart || atEnd ? rubber(dx, geo.vw, 0.35) : dx);
          return;
        }
        const travel = Math.max(120, geo.thumb.y - geo.full.y);
        if (active.kind === 'minimise') {
          const value = active.from + dy / travel;
          motion.mini.set(value < 0 ? 0 : Math.min(1, value));
          return;
        }
        // Mini: up expands under the finger, down slides the bar away.
        if (dy < 0) {
          motion.open.set(1);
          motion.mini.set(clamp(1 + dy / travel, 0, 1));
        } else {
          motion.mini.set(1);
          motion.open.set(clamp(1 - dy / (geo.vh - geo.bar.y + 28), 0, 1));
        }
      },
      end({ dx, dy, vx, vy }) {
        const active = drag.current;
        drag.current = null;
        if (!active) {
          return;
        }
        if (active.kind === 'page') {
          const far = Math.abs(dx) > geo.vw * 0.26;
          const fast = Math.abs(vx) > 520 && Math.abs(dx) > 24;
          const direction = dx < 0 ? 1 : -1;
          if ((far || fast) && Math.sign(vx || dx) === Math.sign(dx) && page(direction, vx)) {
            return;
          }
          motion.x.to(0, { ...springs.pager, velocity: vx });
          return;
        }
        const travel = Math.max(120, geo.thumb.y - geo.full.y);
        if (active.kind === 'minimise') {
          const value = motion.mini.get();
          const shouldMinimise = vy > 650 || (value > 0.32 && vy > -350);
          release.current = vy / travel;
          if (shouldMinimise) {
            buzz();
            player.minimise();
          } else {
            motion.mini.to(0, { ...springs.sheet, velocity: vy / travel });
            release.current = 0;
          }
          return;
        }
        // Mini
        if (dy < 0) {
          const shouldExpand = vy < -500 || motion.mini.get() < 0.72;
          if (shouldExpand) {
            release.current = vy / travel;
            player.expand();
          } else {
            motion.mini.to(1, { ...springs.sheet, velocity: vy / travel });
          }
          return;
        }
        const distance = geo.vh - geo.bar.y + 28;
        if (vy > 350 || motion.open.get() < 0.7) {
          dismiss(-vy / distance);
        } else {
          motion.open.to(1, { ...springs.sheet, velocity: -vy / distance });
        }
      },
    });
  }, [dismiss, geo, motion, page]);

  /* ------------------------------------------------------------ keyboard */

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const current = playerStore.get();
      if (current.mode !== 'full' || (event.target as HTMLElement)?.closest?.('input, textarea')) {
        return;
      }
      if (event.key === 'Escape') {
        player.minimise();
      } else if (event.key === ' ') {
        event.preventDefault();
        player.toggle();
      } else if (event.key === 'ArrowRight') {
        current.kind === 'podcast' ? player.seekBy(30) : player.step(1);
      } else if (event.key === 'ArrowLeft') {
        current.kind === 'podcast' ? player.seekBy(-15) : player.step(-1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* --------------------------------------------------------------- view */

  const neighbours = kind === 'podcast' ? [index] : [index - 1, index, index + 1];
  const canPrev = index > 0;
  const canNext = index < queue.length - 1;

  return (
    <div
      aria-hidden={mode === 'closed'}
      aria-label={item ? `Now playing: ${item.title}` : undefined}
      aria-modal={mode === 'full' ? true : undefined}
      className={cx('player', `is-${mode}`, `kind-${kind}`)}
      data-playing={state.status === 'playing' || state.status === 'loading'}
      ref={rootRef}
      role={mode === 'full' ? 'dialog' : undefined}
    >
      <div className="player-scrim" ref={scrimRef} />
      <div className="player-bg" ref={bgRef}>
        <div className="player-bg-mini" ref={bgMiniRef} />
      </div>

      <div className="player-full" ref={fullRef}>
        {item ? <Ambient item={item} /> : null}
        <header className="player-top">
          <span aria-hidden="true" className="player-grabber" />
          <button aria-label="Minimise player" className="icon-btn" onClick={() => player.minimise()} type="button">
            <ChevronDownIcon size={22} />
          </button>
          <div className="player-top-label">
            {kind === 'podcast' ? (
              <span>Now playing</span>
            ) : (
              <>
                <span>{kind === 'short' ? 'Shorts' : 'Videos'}</span>
                <b>
                  {index + 1}
                  <i> / {queue.length}</i>
                </b>
              </>
            )}
          </div>
          <span />
        </header>

        <div className="player-pager">
          <div className="player-track" ref={trackRef}>
            {neighbours.map((slideIndex) => {
              const slide = queue[slideIndex];
              if (!slide) {
                return null;
              }
              const offset = slideIndex - index;
              const isCurrent = offset === 0;
              return (
                <div
                  aria-hidden={!isCurrent}
                  className={cx('player-slide', isCurrent && 'is-current')}
                  key={slide.id}
                  style={{ '--offset': offset } as CSSProperties}
                >
                  {slide.kind === 'video' ? (
                    <VideoSlide current={isCurrent} item={slide as VideoItem} />
                  ) : slide.kind === 'short' ? (
                    <ShortSlide current={isCurrent} item={slide as VideoItem} />
                  ) : (
                    <PodcastCard item={slide as PodcastItem} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {kind !== 'podcast' && queue.length > 1 ? (
          <div className="player-arrows">
            <button aria-label="Previous" className="icon-btn" disabled={!canPrev} onClick={() => player.step(-1)} type="button">
              <ChevronLeftIcon size={22} />
            </button>
            <button aria-label="Next" className="icon-btn" disabled={!canNext} onClick={() => player.step(1)} type="button">
              <ChevronRightIcon size={22} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="stage" ref={stageRef}>
        <div className="stage-inner">
          <div className="stage-media" ref={mediaRef} />
          {item && item.kind !== 'podcast' ? (
            <Thumb
              className={cx('stage-poster', !state.posterVisible && 'is-hidden')}
              eager
              item={item as VideoItem}
              key={item.id}
              quality="high"
            />
          ) : null}
          {item && item.kind === 'podcast' ? <Artwork className="stage-art" eager sourceId={item.sourceId} /> : null}
          {item && item.kind === 'video' ? <VideoControls item={item as VideoItem} /> : null}
          {item && item.kind === 'short' ? <ShortOverlay item={item as VideoItem} live /> : null}
        </div>
      </div>

      <MiniBar onDismiss={() => dismiss()} ref={miniRef} />
    </div>
  );
}

/** Soft colour wash behind the card, taken from the artwork. */
function Ambient({ item }: { item: VideoItem | PodcastItem }) {
  return (
    <div aria-hidden="true" className="player-ambient" key={item.id}>
      {item.kind === 'podcast' ? <Artwork sourceId={item.sourceId} /> : <Thumb item={item as VideoItem} />}
    </div>
  );
}
