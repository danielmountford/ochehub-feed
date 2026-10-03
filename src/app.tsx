import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { VideoItem } from './data/types';
import { focusStore, toast } from './feed/actions';
import { QueueContext } from './feed/cards';
import { SavedSheet, SearchOverlay, Toast } from './feed/Overlays';
import { TuneSheet } from './feed/TuneSheet';
import { ForYouView, NewsView, PodcastsView, ShortsView, SocialView, type TabId, tabs, VideosView } from './feed/views';
import { attachDrag } from './lib/drag';
import { defaultPrefs, type Focus, itemsOfKind, libraryStore, type Prefs, prefsStore } from './lib/feed';
import { clamp, lerp, MotionValue, rubber, springs } from './lib/motion';
import { useStore } from './lib/store';
import { PlayerHost } from './player/PlayerHost';
import { cx } from './ui/bits';
import { BookmarkIcon, FeedIcon, GearIcon, MatchesIcon, SearchIcon, TuneIcon, YouIcon } from './ui/icons';

const appNav = [
  { id: 'matches', label: 'Matches', Icon: MatchesIcon },
  { id: 'feed', label: 'Feed', Icon: FeedIcon },
  { id: 'gear', label: 'Gear', Icon: GearIcon },
  { id: 'you', label: 'You', Icon: YouIcon },
];

/** Space between two pages while one slides past the other. */
const PAGE_GAP = 28;

const tabIndex = (id: TabId) => tabs.findIndex((entry) => entry.id === id);

function initialTab(): TabId {
  const hash = window.location.hash.replace('#', '');
  return tabs.some((tab) => tab.id === hash) ? (hash as TabId) : 'for-you';
}

function Page({ id, prefs, focus, goTo, onTune }: { id: TabId; prefs: Prefs; focus: Focus | null; goTo: (tab: TabId) => void; onTune: () => void }) {
  switch (id) {
    case 'for-you':
      return <ForYouView focus={focus} goTo={goTo} onTune={onTune} prefs={prefs} />;
    case 'videos':
      return <VideosView prefs={prefs} />;
    case 'shorts':
      return <ShortsView prefs={prefs} />;
    case 'podcasts':
      return <PodcastsView prefs={prefs} />;
    case 'news':
      return <NewsView prefs={prefs} />;
    default:
      return <SocialView prefs={prefs} />;
  }
}

export function App() {
  const prefs = useStore(prefsStore);
  const focus = useStore(focusStore);
  const savedCount = useStore(libraryStore, (library) => library.saved.length);
  /** The page in the document flow. */
  const [tab, setTab] = useState<TabId>(initialTab);
  /** The page sliding in beside it, while a swipe or tab change is under way. */
  const [peek, setPeek] = useState<TabId | null>(null);
  /** The tab a released swipe is heading for; its label lights up straight away. */
  const [heading, setHeading] = useState<TabId | null>(null);
  const [tuneOpen, setTuneOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [ducked, setDucked] = useState(false);
  const [solid, setSolid] = useState(false);

  const shellRef = useRef<HTMLDivElement>(null);
  const mastRef = useRef<HTMLElement>(null);
  const feedRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const pageEls = useRef(new Map<TabId, HTMLElement>());

  /**
   * The pager. `x` is how far the current page has been pushed sideways, in
   * pixels; the page beside it sits one `span` further along on `side`. The
   * finger sets `x` directly and a spring finishes the move, so a swipe can be
   * followed, reversed or thrown.
   */
  const pager = useRef({
    x: new MotionValue(0),
    tab,
    peek: null as TabId | null,
    side: 1 as 1 | -1,
    span: 1,
    settling: null as TabId | 'back' | null,
  }).current;

  // Everything below talks to the pager through these, so gesture listeners
  // attached once always act on the current state.
  const api = useRef({
    goTo: (_next: TabId) => {},
    jump: (_next: TabId) => {},
  }).current;

  useLayoutEffect(() => {
    const strip = tabsRef.current;

    const centreOf = (id: TabId) => {
      const button = strip?.querySelector<HTMLElement>(`[data-tab="${id}"]`);
      return button ? button.offsetLeft + button.offsetWidth / 2 : 0;
    };

    /** The green dot travels between tabs in step with the pages. */
    function placeDot() {
      if (!strip) {
        return;
      }
      const from = centreOf(pager.tab);
      const progress = pager.peek ? clamp(Math.abs(pager.x.get()) / pager.span, 0, 1) : 0;
      strip.style.setProperty('--dot-x', `${pager.peek ? lerp(from, centreOf(pager.peek), progress) : from}px`);
    }

    function paint() {
      const x = pager.x.get();
      const current = pageEls.current.get(pager.tab);
      if (current) {
        current.style.transform = x ? `translate3d(${x}px, 0, 0)` : '';
      }
      const beside = pager.peek ? pageEls.current.get(pager.peek) : undefined;
      if (beside) {
        beside.style.transform = `translate3d(${x + pager.side * pager.span}px, 0, 0)`;
      }
      placeDot();
    }

    function revealTab(id: TabId, smooth: boolean) {
      const button = strip?.querySelector<HTMLElement>(`[data-tab="${id}"]`);
      if (strip && button) {
        strip.scrollTo({ left: button.offsetLeft - (strip.clientWidth - button.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
      }
    }

    /** Mounts a page beside the current one, pinned to the screen under the header. */
    function showPeek(id: TabId, side: 1 | -1) {
      const feed = feedRef.current;
      const mast = mastRef.current;
      const shell = shellRef.current;
      if (!feed || !mast || !shell) {
        return;
      }
      pager.side = side;
      pager.span = shell.clientWidth + PAGE_GAP;
      feed.style.setProperty('--peek-top', `${mast.offsetHeight - feed.getBoundingClientRect().top}px`);
      feed.style.setProperty('--peek-h', `${window.innerHeight - mast.offsetHeight}px`);
      pager.peek = id;
      flushSync(() => {
        setPeek(id);
        setDucked(false);
      });
      paint();
    }

    function hidePeek() {
      pager.peek = null;
      flushSync(() => {
        setPeek(null);
        setHeading(null);
      });
      paint();
    }

    /** The page beside becomes the page: it drops into the flow at the top. */
    function commit(id: TabId) {
      pager.tab = id;
      pager.peek = null;
      pager.x.set(0);
      flushSync(() => {
        setTab(id);
        setPeek(null);
        setHeading(null);
        setDucked(false);
      });
      paint();
      window.scrollTo(0, 0);
      window.history.replaceState(null, '', `#${id}`);
      revealTab(id, true);
    }

    function settle(forward: boolean, velocity: number) {
      const target = forward ? pager.peek : null;
      const spring = { ...springs.pager, velocity, restDistance: 0.5, restSpeed: 8 };
      if (target) {
        pager.settling = target;
        setHeading(target);
        revealTab(target, true);
        pager.x.to(-pager.side * pager.span, {
          ...spring,
          onRest: () => {
            pager.settling = null;
            commit(target);
          },
        });
      } else {
        pager.settling = 'back';
        pager.x.to(0, {
          ...spring,
          onRest: () => {
            pager.settling = null;
            if (pager.peek) {
              hidePeek();
            }
          },
        });
      }
    }

    /** Lands a move that is still springing, so the next one starts from rest. */
    function finishNow() {
      const settling = pager.settling;
      if (!settling) {
        return;
      }
      pager.settling = null;
      pager.x.stop();
      if (settling === 'back') {
        pager.x.set(0);
        if (pager.peek) {
          hidePeek();
        }
      } else {
        commit(settling);
      }
    }

    api.goTo = (next) => {
      finishNow();
      if (next === pager.tab) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      showPeek(next, tabIndex(next) > tabIndex(pager.tab) ? 1 : -1);
      settle(true, 0);
    };

    api.jump = (next) => {
      finishNow();
      commit(next);
    };

    const unsubscribe = pager.x.onChange(paint);
    const onResize = () => placeDot();
    placeDot();
    revealTab(pager.tab, false);
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(placeDot).catch(() => undefined);

    // Swiping sideways anywhere on the page moves between tabs. Carousels and
    // rails keep their own sideways scroll.
    const shell = shellRef.current;
    const detach = shell
      ? attachDrag(
          shell,
          {
            begin(start) {
              const scroller = start.target.closest?.<HTMLElement>('[data-hscroll]');
              if (scroller && scroller.scrollWidth > scroller.clientWidth + 1) {
                return false;
              }
              return !start.target.closest?.('input, textarea, select');
            },
            claim(axis) {
              if (axis !== 'x') {
                return false;
              }
              finishNow();
              return true;
            },
            move({ dx }) {
              // Dragging left brings in the next tab; dragging right, the previous one.
              const side = dx < 0 ? 1 : dx > 0 ? -1 : 0;
              if (side) {
                const neighbour = tabs[tabIndex(pager.tab) + side]?.id ?? null;
                if (neighbour !== pager.peek) {
                  if (neighbour) {
                    showPeek(neighbour, side);
                  } else if (pager.peek) {
                    hidePeek();
                  }
                }
              }
              // Past the first or last tab the page resists and springs back.
              pager.x.set(pager.peek ? clamp(dx, -pager.span, pager.span) : rubber(dx, shell.clientWidth, 0.3));
            },
            end({ vx }) {
              if (!pager.peek) {
                settle(false, vx);
                return;
              }
              // Far enough, or thrown hard enough, and the swipe carries on to the next page.
              const speed = vx * -pager.side;
              const far = Math.abs(pager.x.get()) > Math.min(pager.span * 0.3, 160);
              settle((far && speed > -250) || speed > 450, vx);
            },
          },
          { xBias: 1.25 },
        )
      : undefined;

    return () => {
      unsubscribe();
      detach?.();
      window.removeEventListener('resize', onResize);
    };
  }, [api, pager]);

  const goTo = (next: TabId) => api.goTo(next);

  // Focusing on a follow (from a tag in the player) always lands on For you.
  useEffect(() => {
    const onFocus = () => api.jump('for-you');
    window.addEventListener('feed:focus', onFocus);
    return () => window.removeEventListener('feed:focus', onFocus);
  }, [api]);

  // The header gains a backdrop once content scrolls under it, and tucks its
  // top row away on the way down.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 24);
      if (Math.abs(y - lastY) < 6) {
        return;
      }
      setDucked(y > lastY && y > 160 && !pager.peek);
      lastY = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pager]);

  const queues = useMemo(
    () => ({
      videos: itemsOfKind<VideoItem>('video', prefs),
      shorts: itemsOfKind<VideoItem>('short', prefs),
    }),
    [prefs],
  );

  const lit = heading ?? tab;
  const tuned = JSON.stringify(prefs) !== JSON.stringify(defaultPrefs);
  const outside = (label: string) => toast(`${label} lives in the main OcheHub app`);

  return (
    <QueueContext.Provider value={queues}>
      <div className="feed-shell" ref={shellRef}>
        <header className={cx('masthead', ducked && 'is-ducked', solid && 'is-solid')} ref={mastRef}>
          <div className="appbar">
            <a aria-label="OcheHub" className="brand" href="#for-you" onClick={() => goTo('for-you')}>
              <img alt="OcheHub" height="25" src="brand/ochehub-logo.svg" width="113" />
            </a>
            <nav aria-label="OcheHub" className="appbar-nav">
              {appNav.map(({ id, label }) => (
                <button
                  aria-current={id === 'feed' ? 'page' : undefined}
                  className={cx(id === 'feed' && 'is-active')}
                  key={id}
                  onClick={() => (id === 'feed' ? goTo('for-you') : outside(label))}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </nav>
            <div className="appbar-actions">
              <button aria-label="Search" className="icon-btn" onClick={() => setSearchOpen(true)} type="button">
                <SearchIcon size={22} />
              </button>
              <button aria-label={`Saved, ${savedCount} items`} className="icon-btn" onClick={() => setSavedOpen(true)} type="button">
                <BookmarkIcon size={22} />
              </button>
              <button aria-label="Tune your feed" className={cx('icon-btn', tuned && 'has-dot')} onClick={() => setTuneOpen(true)} type="button">
                <TuneIcon size={19} />
              </button>
            </div>
          </div>

          <div aria-label="Feed sections" className="tabs" data-hscroll ref={tabsRef} role="tablist">
            {tabs.map((entry) => (
              <button
                aria-selected={entry.id === lit}
                className={cx('tab', entry.id === lit && 'is-active')}
                data-tab={entry.id}
                key={entry.id}
                onClick={() => goTo(entry.id)}
                role="tab"
                type="button"
              >
                {entry.label}
              </button>
            ))}
            <span aria-hidden="true" className="tab-dot" />
          </div>
        </header>

        <main className="feed" id="feed" ref={feedRef}>
          {tabs
            .filter((entry) => entry.id === tab || entry.id === peek)
            .map((entry) => (
              <div
                aria-hidden={entry.id === tab ? undefined : true}
                className={cx('page', entry.id === tab ? 'is-current' : 'is-peek')}
                key={entry.id}
                ref={(element: HTMLDivElement | null) => {
                  if (element) {
                    pageEls.current.set(entry.id, element);
                  } else {
                    pageEls.current.delete(entry.id);
                  }
                }}
              >
                <Page focus={focus} goTo={goTo} id={entry.id} onTune={() => setTuneOpen(true)} prefs={prefs} />
              </div>
            ))}
        </main>
      </div>

      <nav aria-label="OcheHub" className="dock">
        {appNav.map(({ id, label, Icon }) => (
          <button
            aria-current={id === 'feed' ? 'page' : undefined}
            aria-label={label}
            className={cx(id === 'feed' && 'is-active')}
            key={id}
            onClick={() => (id === 'feed' ? goTo('for-you') : outside(label))}
            type="button"
          >
            <Icon size={21} />
          </button>
        ))}
      </nav>

      <PlayerHost />
      <SearchOverlay onClose={() => setSearchOpen(false)} open={searchOpen} />
      <SavedSheet onClose={() => setSavedOpen(false)} open={savedOpen} />
      <TuneSheet onClose={() => setTuneOpen(false)} open={tuneOpen} />
      <Toast />
    </QueueContext.Provider>
  );
}
