import { useEffect, useState } from 'react';
import { sourceById } from '../data/catalogue';
import type { VideoItem } from '../data/types';
import { shareItem } from '../feed/actions';
import { useStore } from '../lib/store';
import { cx, SaveButton, SourceAvatar, Thumb } from '../ui/bits';
import { ExternalIcon, PauseIcon, PlayIcon, ShareIcon, VolumeIcon, VolumeMutedIcon } from '../ui/icons';
import { player, playerStore } from './controller';
import { ProgressLine } from './Scrubber';

/** A Short in the pager: tall slot, caption and actions laid over the picture. */
export function ShortSlide({ item, current }: { item: VideoItem; current: boolean }) {
  return (
    <article className="sslide">
      <div className="sslide-slot" data-slot={current ? 'current' : undefined}>
        <Thumb eager item={item} />
        {/* Neighbouring cards carry a static copy of the overlay; the live one rides on the stage. */}
        {current ? null : <ShortOverlay item={item} />}
      </div>
    </article>
  );
}

/**
 * Caption, action rail and tap-to-pause for a Short. With `live` it is wired
 * to the player; without, it is the still version shown on neighbouring cards.
 */
export function ShortOverlay({ item, live }: { item: VideoItem; live?: boolean }) {
  const source = sourceById.get(item.sourceId);
  const status = useStore(playerStore, (state) => state.status);
  const message = useStore(playerStore, (state) => state.message);
  const muted = useStore(playerStore, (state) => state.muted);
  const forcedMute = useStore(playerStore, (state) => state.forcedMute);
  const needsTap = useStore(playerStore, (state) => state.needsTap);
  const [flash, setFlash] = useState<'play' | 'pause' | null>(null);

  useEffect(() => {
    if (!flash) {
      return;
    }
    const timer = window.setTimeout(() => setFlash(null), 520);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const paused = live && status === 'paused';
  const failed = live && status === 'error';

  return (
    <div
      className={cx('so', live && needsTap && 'is-passthrough')}
      onClick={
        live
          ? () => {
              if (forcedMute) {
                player.setMuted(false);
                return;
              }
              setFlash(status === 'playing' ? 'pause' : 'play');
              player.toggle();
            }
          : undefined
      }
    >
      <div className="so-shade" />

      {live && status === 'loading' ? <span aria-label="Loading" className="spinner so-spinner" role="status" /> : null}
      {live && (flash || paused) && !failed ? (
        <span aria-hidden="true" className={cx('so-flash', paused && !flash && 'is-held')}>
          {flash === 'pause' ? <PauseIcon size={34} /> : <PlayIcon size={36} />}
        </span>
      ) : null}

      {failed ? (
        <div className="so-error" onClick={(event) => event.stopPropagation()}>
          <p>{message}</p>
          <button className="pill-btn" onClick={() => player.retry()} type="button">
            Try again
          </button>
        </div>
      ) : null}

      {live && (forcedMute || needsTap) ? (
        <span className="vc-hint so-hint">
          <VolumeMutedIcon size={18} />
          {needsTap ? 'Tap the video to play' : 'Tap for sound'}
        </span>
      ) : null}

      <div className="so-rail" onClick={(event) => event.stopPropagation()}>
        <SaveButton className="so-action" item={item} />
        <button aria-label="Share" className="so-action" onClick={() => shareItem(item)} type="button">
          <ShareIcon size={22} />
        </button>
        {live ? (
          <button
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="so-action"
            onClick={() => player.setMuted(!muted)}
            type="button"
          >
            {muted ? <VolumeMutedIcon size={22} /> : <VolumeIcon size={22} />}
          </button>
        ) : (
          <span className="so-action" />
        )}
        <a aria-label="Open on YouTube" className="so-action" href={item.url} rel="noreferrer" target="_blank">
          <ExternalIcon size={22} />
        </a>
      </div>

      <div className="so-caption">
        <div className="so-source">
          <SourceAvatar size={32} sourceId={item.sourceId} />
          <strong>{source?.name}</strong>
        </div>
        <h2>{item.headline}</h2>
        {item.context ? <p>{item.context}</p> : null}
      </div>

      {live ? <ProgressLine className="so-line" /> : null}
    </div>
  );
}
