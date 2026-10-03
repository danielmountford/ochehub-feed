import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { viewer } from './data/catalogue';
import type { VideoItem } from './data/types';
import { focusStore, toast } from './feed/actions';
import { QueueContext } from './feed/cards';
import { SavedSheet, SearchOverlay, Toast } from './feed/Overlays';
import { TuneSheet } from './feed/TuneSheet';
import { ForYouView, NewsView, PodcastsView, ShortsView, SocialView, type TabId, tabs, VideosView } from './feed/views';
import { itemsOfKind, libraryStore, prefsStore } from './lib/feed';
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
  const [barHidden, setBarHidden] = useState(false);
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
    setBarHidden(false);
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

  // The brand bar ducks away on the way down and returns on the way up; the tabs always stay.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 6) {
        return;
      }
      setBarHidden(y > lastY && y > 120);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Slide the oche line under the active tab and keep that tab in view.
  useLayoutEffect(() => {
    const strip = tabsRef.current;
    const activeButton = strip?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!strip || !activeButton) {
      return;
    }
    const place = () => {
      strip.style.setProperty('--line-x', `${activeButton.offsetLeft}px`);
      strip.style.setProperty('--line-w', `${activeButton.offsetWidth}px`);
    };
    place();
    const target = activeButton.offsetLeft - (strip.clientWidth - activeButton.offsetWidth) / 2;
    strip.scrollTo({ left: target, behavior: 'smooth' });
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

  const tuned = prefs.strength !== 'everything';

  return (
    <QueueContext.Provider value={queues}>
      <div className="feed-shell">
        <header className={cx('masthead', barHidden && 'is-ducked')}>
          <div className="appbar">
            <a aria-label="OcheHub" className="brand" href="#for-you" onClick={() => goTo('for-you')}>
              <img alt="OcheHub" height="25" src="brand/ochehub-logo.svg" width="113" />
            </a>
            <nav aria-label="OcheHub" className="appbar-nav">
              {appNav.map(({ id, label, Icon }) => (
                <button
                  aria-current={id === 'feed' ? 'page' : undefined}
                  className={cx(id === 'feed' && 'is-active')}
                  key={id}
                  onClick={() => (id === 'feed' ? goTo('for-you') : toast(`${label} lives in the main OcheHub app`))}
                  type="button"
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </nav>
            <div className="appbar-actions">
              <button aria-label="Search" className="icon-btn is-glass" onClick={() => setSearchOpen(true)} type="button">
                <SearchIcon size={20} />
              </button>
              <button aria-label={`Saved, ${savedCount} items`} className="icon-btn is-glass" onClick={() => setSavedOpen(true)} type="button">
                <BookmarkIcon size={20} />
                {savedCount ? <b className="badge">{savedCount}</b> : null}
              </button>
              <span aria-label={`Signed in as ${viewer.name}`} className="avatar">
                {viewer.initials}
              </span>
            </div>
          </div>

          <div className="tabbar">
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
              <span aria-hidden="true" className="tab-line" />
            </div>
            <button aria-label="Tune your feed" className={cx('tune-btn', tuned && 'is-tuned')} onClick={() => setTuneOpen(true)} type="button">
              <TuneIcon size={17} />
            </button>
          </div>
        </header>

        <main className="feed" id="feed">
          <div className="view" key={`${tab}:${focus ? `${focus.type}-${focus.id}` : ''}`} style={{ '--dir': direction } as CSSProperties}>
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

      <nav aria-label="OcheHub" className="bottom-nav">
        {appNav.map(({ id, label, Icon }) => (
          <button
            aria-current={id === 'feed' ? 'page' : undefined}
            className={cx(id === 'feed' && 'is-active')}
            key={id}
            onClick={() => (id === 'feed' ? goTo('for-you') : toast(`${label} lives in the main OcheHub app`))}
            type="button"
          >
            <Icon size={20} />
            <span>{label}</span>
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
