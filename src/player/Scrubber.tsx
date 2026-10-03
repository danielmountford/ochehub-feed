import { type CSSProperties, type PointerEvent, useRef, useState } from 'react';
import { clamp } from '../lib/motion';
import { clock } from '../lib/format';
import { useStore } from '../lib/store';
import { cx } from '../ui/bits';
import { player, timeStore } from './controller';

/**
 * Seek bar. Dragging previews the time under the thumb and only seeks on
 * release, so scrubbing never stutters the media. `data-nodrag` keeps the
 * card's swipe gestures out of the way.
 */
export function Scrubber({ variant = 'bar', remaining }: { variant?: 'bar' | 'slim'; remaining?: boolean }) {
  const { position, duration } = useStore(timeStore);
  const [preview, setPreview] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const shown = preview ?? position;
  const ratio = duration > 0 ? clamp(shown / duration, 0, 1) : 0;

  function ratioAt(event: PointerEvent) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) {
      return 0;
    }
    return clamp((event.clientX - rect.left) / rect.width, 0, 1);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!duration) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setPreview(ratioAt(event) * duration);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (preview !== null) {
      setPreview(ratioAt(event) * duration);
    }
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (preview !== null) {
      player.seek(ratioAt(event) * duration);
      setPreview(null);
    }
  }

  return (
    <div className={cx('scrub', `scrub-${variant}`, preview !== null && 'is-dragging')} data-nodrag>
      <div
        aria-label="Seek"
        aria-valuemax={Math.round(duration)}
        aria-valuemin={0}
        aria-valuenow={Math.round(shown)}
        aria-valuetext={`${clock(shown)} of ${clock(duration)}`}
        className="scrub-hit"
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.stopPropagation();
            player.seekBy(10);
          } else if (event.key === 'ArrowLeft') {
            event.stopPropagation();
            player.seekBy(-10);
          }
        }}
        onPointerCancel={() => setPreview(null)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ref={trackRef}
        role="slider"
        style={{ '--ratio': ratio } as CSSProperties}
        tabIndex={0}
      >
        <div className="scrub-track">
          <div className="scrub-fill" />
        </div>
        <div className="scrub-thumb" />
      </div>
      <div className="scrub-times">
        <span>{clock(shown)}</span>
        <span>{duration ? (remaining ? `-${clock(duration - shown)}` : clock(duration)) : '--:--'}</span>
      </div>
    </div>
  );
}

/** Hairline progress with no interaction: stage edge and mini bar. */
export function ProgressLine({ className }: { className?: string }) {
  const { position, duration } = useStore(timeStore);
  const ratio = duration > 0 ? clamp(position / duration, 0, 1) : 0;
  return (
    <div aria-hidden="true" className={cx('progress-line', className)}>
      <i style={{ transform: `scaleX(${ratio})` }} />
    </div>
  );
}
