import { forwardRef } from 'react';
import { sourceById } from '../data/catalogue';
import type { VideoItem } from '../data/types';
import { useStore } from '../lib/store';
import { CrossIcon, NextTrackIcon, PauseIcon, PlayIcon } from '../ui/icons';
import { currentItem, player, playerStore } from './controller';
import { ProgressLine } from './Scrubber';

/**
 * Mini player. The media thumbnail is not in here: the live stage shrinks into
 * the empty slot on the left, so playback never restarts between sizes.
 */
export const MiniBar = forwardRef<HTMLDivElement, { onDismiss: () => void }>(function MiniBar({ onDismiss }, ref) {
  const state = useStore(playerStore);
  const item = currentItem(state);
  const source = item ? sourceById.get(item.sourceId) : undefined;
  const playing = state.status === 'playing';
  const loading = state.status === 'loading';
  const title = item ? (item.kind === 'podcast' ? item.title : (item as VideoItem).headline) : '';
  const canNext = state.index < state.queue.length - 1;

  return (
    <div className="mini" ref={ref}>
      <button
        aria-label="Open player"
        className="mini-open"
        onClick={() => player.expand()}
        tabIndex={state.mode === 'mini' ? 0 : -1}
        type="button"
      >
        <span className="mini-thumb" data-mini-thumb />
        <span className="mini-text">
          <strong>{title}</strong>
          <span>{source?.short}</span>
        </span>
      </button>
      <button
        aria-label={playing ? 'Pause' : 'Play'}
        className="mini-btn is-primary"
        onClick={() => player.toggle()}
        tabIndex={state.mode === 'mini' ? 0 : -1}
        type="button"
      >
        {loading ? <span className="spinner" /> : playing ? <PauseIcon size={24} /> : <PlayIcon size={26} />}
      </button>
      {canNext ? (
        <button
          aria-label={state.kind === 'podcast' ? 'Next episode' : 'Next'}
          className="mini-btn mini-next"
          onClick={() => player.step(1)}
          tabIndex={state.mode === 'mini' ? 0 : -1}
          type="button"
        >
          <NextTrackIcon size={22} />
        </button>
      ) : null}
      <button
        aria-label="Close player"
        className="mini-btn"
        onClick={onDismiss}
        tabIndex={state.mode === 'mini' ? 0 : -1}
        type="button"
      >
        <CrossIcon size={20} />
      </button>
      <ProgressLine className="mini-line" />
    </div>
  );
});
