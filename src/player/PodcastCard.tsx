import { useState } from 'react';
import { sourceById } from '../data/catalogue';
import type { PodcastItem } from '../data/types';
import { FollowButton, shareItem } from '../feed/actions';
import { libraryStore } from '../lib/feed';
import { durationLabel, shortDate } from '../lib/format';
import { useStore } from '../lib/store';
import { cx, SaveButton } from '../ui/bits';
import { CrossIcon, ListIcon, NextTrackIcon, PauseIcon, PlayIcon, PreviousTrackIcon, ShareIcon, SkipIcon } from '../ui/icons';
import { player, playerStore } from './controller';
import { Scrubber } from './Scrubber';

/**
 * Full-page podcast card. No sideways swiping here: previous and next step
 * through the show's episodes, and the title block slides in the direction
 * you travelled.
 */
export function PodcastCard({ item }: { item: PodcastItem }) {
  const status = useStore(playerStore, (state) => state.status);
  const message = useStore(playerStore, (state) => state.message);
  const rate = useStore(playerStore, (state) => state.rate);
  const index = useStore(playerStore, (state) => state.index);
  const queue = useStore(playerStore, (state) => state.queue);
  const direction = useStore(playerStore, (state) => state.direction);
  const progress = useStore(libraryStore, (library) => library.progress);
  const [listOpen, setListOpen] = useState(false);
  const source = sourceById.get(item.sourceId);

  const playing = status === 'playing';
  const loading = status === 'loading';
  // Queue is newest first, so "next" in the list is the older episode.
  const canPrev = index > 0;
  const canNext = index < queue.length - 1;

  return (
    <article className={cx('pslide', listOpen && 'is-list-open')}>
      <div className="pslide-main">
        <div className={cx('pslide-slot', !playing && !loading && 'is-resting')} data-slot="current" />

        <div className={cx('pslide-meta', direction > 0 ? 'from-right' : 'from-left')} key={item.id}>
          <div className="pslide-show">
            <span>{source?.short}</span>
            <FollowButton id={item.sourceId} type="source" />
          </div>
          <h2>{item.title}</h2>
          <p>
            {shortDate(item.publishedAt)} · {durationLabel(item.durationSeconds)}
            {item.description ? <span className="pslide-desc">{item.description}</span> : null}
          </p>
        </div>

        {status === 'error' ? (
          <div className="pslide-error">
            <span>{message}</span>
            <button className="pill-btn" onClick={() => player.retry()} type="button">
              Try again
            </button>
          </div>
        ) : (
          <Scrubber remaining />
        )}

        <div className="transport">
          <button
            aria-label="Previous episode"
            className="transport-step"
            disabled={!canPrev}
            onClick={() => player.step(-1)}
            type="button"
          >
            <PreviousTrackIcon size={28} />
          </button>
          <button aria-label="Back 15 seconds" className="transport-skip" onClick={() => player.seekBy(-15)} type="button">
            <SkipIcon back seconds={15} size={34} />
          </button>
          <button aria-label={playing ? 'Pause' : 'Play'} className="transport-play" onClick={() => player.toggle()} type="button">
            {loading ? <span className="spinner is-dark" /> : playing ? <PauseIcon size={34} /> : <PlayIcon size={36} />}
          </button>
          <button aria-label="Forward 30 seconds" className="transport-skip" onClick={() => player.seekBy(30)} type="button">
            <SkipIcon seconds={30} size={34} />
          </button>
          <button
            aria-label="Next episode"
            className="transport-step"
            disabled={!canNext}
            onClick={() => player.step(1)}
            type="button"
          >
            <NextTrackIcon size={28} />
          </button>
        </div>

        <div className="pslide-actions">
          <button aria-label={`Playback speed ${rate}×`} className="rate-btn" onClick={() => player.cycleRate()} type="button">
            {rate}×
          </button>
          <SaveButton className="icon-btn" item={item} />
          <button aria-label="Share" className="icon-btn" onClick={() => shareItem(item)} type="button">
            <ShareIcon size={22} />
          </button>
          <button aria-expanded={listOpen} className="episodes-btn" onClick={() => setListOpen(true)} type="button">
            <ListIcon size={20} />
            {queue.length} episodes
          </button>
        </div>
      </div>

      <aside aria-label="Episodes" className="pslide-list">
        <header>
          <h3 className="mini-head">{source?.short}</h3>
          <button aria-label="Close episode list" className="icon-btn" onClick={() => setListOpen(false)} type="button">
            <CrossIcon size={18} />
          </button>
        </header>
        <ol data-scroll>
          {queue.map((episode, episodeIndex) => {
            const saved = progress[episode.id];
            const ratio = saved && saved.duration ? Math.min(1, saved.position / saved.duration) : 0;
            const active = episodeIndex === index;
            return (
              <li key={episode.id}>
                <button
                  aria-current={active}
                  className={cx(active && 'is-active')}
                  onClick={() => {
                    player.setIndex(episodeIndex, episodeIndex > index ? 1 : -1);
                    setListOpen(false);
                  }}
                  type="button"
                >
                  <span className="pslide-list-num">
                    {active ? <span className={cx('eq', playing && 'is-playing')}><i /><i /><i /></span> : episodeIndex + 1}
                  </span>
                  <span className="pslide-list-text">
                    <strong>{episode.title}</strong>
                    <span>
                      {shortDate(episode.publishedAt)} · {durationLabel((episode as PodcastItem).durationSeconds)}
                    </span>
                    {ratio > 0 && ratio < 0.97 ? (
                      <span className="mini-progress">
                        <i style={{ transform: `scaleX(${ratio})` }} />
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>
    </article>
  );
}
