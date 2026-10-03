import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { VideoItem } from './data/types';
import { focusStore, toast } from './feed/actions';
import { QueueContext } from './feed/cards';
import { SavedSheet, SearchOverlay, Toast } from './feed/Overlays';
import { TuneSheet } from './feed/TuneSheet';
import { ForYouView, NewsView, PodcastsView, ShortsView, SocialView, type TabId, tabs, VideosView } from './feed/views';
import { defaultPrefs, itemsOfKind, libraryStore, prefsStore } from './lib/feed';
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

function initialTab(): TabId {
  const hash = window.location.hash.replace('#', '');
  return tabs.some((tab) => tab.id === hash) ? (hash as TabId) : 'for-you';
}

export function App() {
  const prefs = useStore(prefsStore);
  const focus = useStore(focusStore);
  const savedCount = useStore(libraryStore, (library) => library.saved.length);
  const [tab, setTab] = useState<TabId>(initialTab);
  const [direction, setDirection] = useState(1);
  const [tuneOpen, setTuneOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [ducked, setDucked] = useState(false);
  const [solid, setSolid] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  function goTo(next: TabId) {
    if (next === tab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setDirection(tabs.findIndex((entry) => entry.id === next) > tabs.findIndex((entry) => entry.id === tab) ? 1 : -1);
    setTab(next);
    window.history.replaceState(null, '', `#${next}`);
    window.scrollTo(0, 0);
    setDucked(false);
  }

  // Focusing on a follow (from a tag in the player) always lands on For you.
  useEffect(() => {
    const onFocus = () => {
      setTab('for-you');
      window.scrollTo(0, 0);
    };
    window.addEventListener('feed:focus', onFocus);
    return () => window.removeEventListener('feed:focus', onFocus);
  }, []);

  // The header is clear glass over the hero, gains a backdrop once content
  // scrolls under it, and tucks its top row away on the way down.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 24);
      if (Math.abs(y - lastY) < 6) {
        return;
      }
      setDucked(y > lastY && y > 160);
      lastY = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // One green dot marks the current tab and slides between them.
  useLayoutEffect(() => {
    const strip = tabsRef.current;
    const activeButton = strip?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!strip || !activeButton) {
      return;
    }
    const place = () => strip.style.setProperty('--dot-x', `${activeButton.offsetLeft + activeButton.offsetWidth / 2}px`);
    place();
    strip.scrollTo({ left: activeButton.offsetLeft - (strip.clientWidth - activeButton.offsetWidth) / 2, behavior: 'smooth' });
    window.addEventListener('resize', place);
    document.fonts?.ready.then(place).catch(() => undefined);
    return () => window.removeEventListener('resize', place);
  }, [tab]);

  const queues = useMemo(
    () => ({
      videos: itemsOfKind<VideoItem>('video', prefs),
      shorts: itemsOfKind<VideoItem>('short', prefs),
    }),
    [prefs],
  );

  const tuned = JSON.stringify(prefs) !== JSON.stringify(defaultPrefs);
  const outside = (label: string) => toast(`${label} lives in the main OcheHub app`);

  return (
    <QueueContext.Provider value={queues}>
      <div className="feed-shell">
        <header className={cx('masthead', ducked && 'is-ducked', solid && 'is-solid')}>
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

          <div aria-label="Feed sections" className="tabs" ref={tabsRef} role="tablist">
            {tabs.map((entry) => (
              <button
                aria-selected={entry.id === tab}
                className={cx('tab', entry.id === tab && 'is-active')}
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

        <main className="feed" id="feed">
          <div
            className={cx('view', tab === 'for-you' && !focus && 'has-hero')}
            key={`${tab}:${focus ? `${focus.type}-${focus.id}` : ''}`}
            style={{ '--dir': direction } as CSSProperties}
          >
            {tab === 'for-you' ? (
              <ForYouView focus={focus} goTo={goTo} onTune={() => setTuneOpen(true)} prefs={prefs} />
            ) : tab === 'videos' ? (
              <VideosView prefs={prefs} />
            ) : tab === 'shorts' ? (
              <ShortsView prefs={prefs} />
            ) : tab === 'podcasts' ? (
              <PodcastsView prefs={prefs} />
            ) : tab === 'news' ? (
              <NewsView prefs={prefs} />
            ) : (
              <SocialView prefs={prefs} />
            )}
          </div>
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
