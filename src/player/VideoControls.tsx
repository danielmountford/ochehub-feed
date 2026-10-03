import { useEffect, useState } from 'react';
import type { VideoItem } from '../data/types';
import { useStore } from '../lib/store';
import { cx } from '../ui/bits';
import { ExternalIcon, PauseIcon, PlayIcon, SkipIcon, VolumeIcon, VolumeMutedIcon } from '../ui/icons';
import { player, playerStore } from './controller';
import { ProgressLine, Scrubber } from './Scrubber';

/**
 * Controls drawn over the video. The layer also soaks up touches so the card
 * can be swiped; a tap shows the controls, and they fade after a few seconds
 * of playback.
 */
export function VideoControls({ item }: { item: VideoItem }) {
  const status = useStore(playerStore, (state) => state.status);
  const message = useStore(playerStore, (state) => state.message);
  const muted = useStore(playerStore, (state) => state.muted);
  const forcedMute = useStore(playerStore, (state) => state.forcedMute);
  const needsTap = useStore(playerStore, (state) => state.needsTap);
  const hasNext = useStore(playerStore, (state) => state.index < state.queue.length - 1);
  const [visible, setVisible] = useState(false);

  const playing = status === 'playing';
  const loading = status === 'loading';

  // Auto-hide while playing; stay up when paused.
  useEffect(() => {
    if (!visible || !playing) {
      return;
    }
    const timer = window.setTimeout(() => setVisible(false), 2800);
    return () => window.clearTimeout(timer);
  }, [visible, playing, status]);

  useEffect(() => {
    setVisible(false);
  }, [item.id]);

  if (status === 'error') {
    return (
      <div className="vc vc-message">
        <p>{message}</p>
        <div className="vc-message-actions">
          <button className="pill-btn" onClick={() => player.retry()} type="button">
            Try again
          </button>
          <a className="pill-btn is-ghost" href={item.url} rel="noreferrer" target="_blank">
            Watch on YouTube <ExternalIcon size={16} />
          </a>
        </div>
      </div>
    );
  }

  if (status === 'ended') {
    return (
      <div className="vc vc-message">
        <div className="vc-message-actions">
          <button className="pill-btn is-ghost" onClick={() => player.toggle()} type="button">
            Replay
          </button>
          {hasNext ? (
            <button className="pill-btn" onClick={() => player.step(1)} type="button">
              Next video
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const show = visible || status === 'paused';

  return (
    <div
      className={cx('vc', show && 'is-visible', needsTap && 'is-passthrough')}
      onClick={() => setVisible((value) => !value)}
    >
      <div className="vc-shade" />
      {loading ? <span aria-label="Loading" className="spinner vc-spinner" role="status" /> : null}

      {forcedMute || needsTap ? (
        <button
          className="vc-hint"
          onClick={(event) => {
            event.stopPropagation();
            player.setMuted(false);
          }}
          type="button"
        >
          <VolumeMutedIcon size={18} />
          {needsTap ? 'Tap the video to play' : 'Tap for sound'}
        </button>
      ) : null}

      <div className="vc-centre">
        <button
          aria-label="Back 10 seconds"
          className="vc-skip"
          onClick={(event) => {
            event.stopPropagation();
            player.seekBy(-10);
            setVisible(true);
          }}
          tabIndex={show ? 0 : -1}
          type="button"
        >
          <SkipIcon back seconds={10} size={30} />
        </button>
        <button
          aria-label={playing ? 'Pause' : 'Play'}
          className="vc-play"
          onClick={(event) => {
            event.stopPropagation();
            player.toggle();
            setVisible(true);
          }}
          tabIndex={show ? 0 : -1}
          type="button"
        >
          {playing || loading ? <PauseIcon size={30} /> : <PlayIcon size={32} />}
        </button>
        <button
          aria-label="Forward 10 seconds"
          className="vc-skip"
          onClick={(event) => {
            event.stopPropagation();
            player.seekBy(10);
            setVisible(true);
          }}
          tabIndex={show ? 0 : -1}
          type="button"
        >
          <SkipIcon seconds={10} size={30} />
        </button>
      </div>

      <button
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="vc-mute"
        onClick={(event) => {
          event.stopPropagation();
          player.setMuted(!muted);
          setVisible(true);
        }}
        tabIndex={show ? 0 : -1}
        type="button"
      >
        {muted ? <VolumeMutedIcon size={22} /> : <VolumeIcon size={22} />}
      </button>

      <div className="vc-bottom" onClick={(event) => event.stopPropagation()}>
        <Scrubber variant="slim" />
      </div>
      <ProgressLine className="vc-line" />
    </div>
  );
}
