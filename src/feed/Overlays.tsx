import { useEffect, useMemo, useRef, useState } from 'react';
import { competitions, players } from '../data/catalogue';
import { itemById } from '../data/content';
import type { FeedItem } from '../data/types';
import { libraryStore, search } from '../lib/feed';
import { useStore } from '../lib/store';
import { cx } from '../ui/bits';
import { CrossIcon } from '../ui/icons';
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
    ...players.slice(0, 4).map((player) => ({ label: player.last })),
    ...competitions.slice(0, 3).map((competition) => ({ label: competition.name })),
  ];

  return (
    <div aria-hidden={!open} className={cx('search', open && 'is-open')}>
      <div className="search-bar">
        <input
          aria-label="Search the feed"
          enterKeyHint="search"
          onChange={(event) => setQuery(event.target.value.slice(0, 120))}
          placeholder="Search"
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
            <div className="suggestions">
              {suggestions.map((suggestion) => (
                <button className="suggestion" key={suggestion.label} onClick={() => setQuery(suggestion.label)} type="button">
                  {suggestion.label}
                </button>
              ))}
            </div>
          </>
        ) : results.length ? (
          <>
            <div className="compact-list">
              {results.map((item) => (
                <CompactRow item={item} key={item.id} onOpen={onClose} />
              ))}
            </div>
          </>
        ) : (
          <p className="search-empty">Nothing matches “{query.trim()}”.</p>
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
    <Sheet onClose={onClose} open={open} title="Saved">
      {items.length ? (
        <div className="compact-list">
          {items.map((item) => (
            <CompactRow item={item} key={item.id} onOpen={onClose} />
          ))}
        </div>
      ) : (
        <p className="search-empty">Nothing saved yet. Save from the player.</p>
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
