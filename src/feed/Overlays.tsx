import { useEffect, useMemo, useRef, useState } from 'react';
import { competitions, players } from '../data/catalogue';
import { itemById } from '../data/content';
import type { FeedItem } from '../data/types';
import { libraryStore, search } from '../lib/feed';
import { useStore } from '../lib/store';
import { cx, PlayerDisc } from '../ui/bits';
import { BookmarkIcon, CrossIcon, SearchIcon } from '../ui/icons';
import { toastStore } from './actions';
import { CompactRow } from './cards';
import { Sheet } from './Sheet';

/* ---------------------------------------------------------------- search */

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => search(query), [query]);

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(timer);
    }
    setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  const suggestions = [
    ...players.slice(0, 5).map((player) => ({ label: player.last, playerId: player.id })),
    ...competitions.slice(0, 3).map((competition) => ({ label: competition.name, playerId: undefined })),
  ];

  return (
    <div aria-hidden={!open} className={cx('search', open && 'is-open')}>
      <div className="search-bar">
        <SearchIcon size={20} />
        <input
          aria-label="Search the feed"
          enterKeyHint="search"
          onChange={(event) => setQuery(event.target.value.slice(0, 120))}
          placeholder="Search videos, podcasts, news"
          ref={inputRef}
          tabIndex={open ? 0 : -1}
          type="search"
          value={query}
        />
        <button aria-label="Close search" className="icon-btn" onClick={onClose} tabIndex={open ? 0 : -1} type="button">
          <CrossIcon size={20} />
        </button>
      </div>
      <div className="search-body">
        {!query.trim() ? (
          <>
            <h3 className="mini-head">Try</h3>
            <div className="chip-wrap">
              {suggestions.map((suggestion) => (
                <button className="chip" key={suggestion.label} onClick={() => setQuery(suggestion.label)} type="button">
                  {suggestion.playerId ? <PlayerDisc playerId={suggestion.playerId} size={22} /> : null}
                  {suggestion.label}
                </button>
              ))}
            </div>
          </>
        ) : results.length ? (
          <>
            <h3 className="mini-head">
              {results.length} result{results.length === 1 ? '' : 's'}
            </h3>
            <div className="compact-list">
              {results.map((item) => (
                <CompactRow item={item} key={item.id} onOpen={onClose} />
              ))}
            </div>
          </>
        ) : (
          <p className="search-empty">Nothing matches “{query.trim()}”. Try a player, a tournament or a show.</p>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- saved */

export function SavedSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const saved = useStore(libraryStore, (library) => library.saved);
  const items = saved.map((id) => itemById.get(id)).filter((item): item is FeedItem => Boolean(item));
  return (
    <Sheet eyebrow={`${items.length} item${items.length === 1 ? '' : 's'}`} onClose={onClose} open={open} title="Saved">
      {items.length ? (
        <div className="compact-list">
          {items.map((item) => (
            <CompactRow item={item} key={item.id} onOpen={onClose} />
          ))}
        </div>
      ) : (
        <div className="empty is-inline">
          <BookmarkIcon size={28} />
          <h2>Nothing saved yet</h2>
          <p>Tap the bookmark on any video, episode or headline to keep it here.</p>
        </div>
      )}
    </Sheet>
  );
}

/* ----------------------------------------------------------------- toast */

export function Toast() {
  const message = useStore(toastStore);
  return (
    <div aria-live="polite" className="toast-layer" role="status">
      {message ? (
        <div className="toast" key={message.id}>
          {message.text}
        </div>
      ) : null}
    </div>
  );
}
