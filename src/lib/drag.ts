/**
 * One gesture recogniser for touch and mouse.
 *
 * It waits until the pointer has moved a few pixels, works out which axis the
 * gesture is on, and then asks the caller whether it wants that gesture. If
 * not, the browser keeps it (so vertical scrolling inside the card still
 * works). Once claimed, native scrolling is suppressed and the caller gets
 * deltas plus a release velocity for springs.
 */

export type Axis = 'x' | 'y';

export interface DragStart {
  target: HTMLElement;
  x: number;
  y: number;
  pointer: 'touch' | 'mouse';
}

export interface DragMove {
  axis: Axis;
  dx: number;
  dy: number;
  /** px per second, smoothed over the last ~80ms. */
  vx: number;
  vy: number;
  target: HTMLElement;
}

export interface DragHandlers {
  /** Return false to ignore this press entirely (e.g. it started on a slider). */
  begin?(start: DragStart): boolean;
  /** Called once when the axis is known. Return true to take the gesture. */
  claim(axis: Axis, direction: 1 | -1, start: DragStart): boolean;
  move(move: DragMove): void;
  end(move: DragMove): void;
}

const SLOP = 8;

interface Sample {
  t: number;
  x: number;
  y: number;
}

export interface DragOptions {
  /**
   * How much further sideways than vertically the pointer must have travelled
   * for the gesture to count as horizontal. Above 1 favours scrolling.
   */
  xBias?: number;
}

export function attachDrag(element: HTMLElement, handlers: DragHandlers, options: DragOptions = {}) {
  const xBias = options.xBias ?? 1;
  let start: DragStart | null = null;
  let startTime = 0;
  let axis: Axis | null = null;
  let claimed = false;
  let rejected = false;
  let samples: Sample[] = [];
  let suppressClick = false;

  function velocity() {
    const now = performance.now();
    const recent = samples.filter((sample) => now - sample.t < 100);
    if (recent.length < 2) {
      return { vx: 0, vy: 0 };
    }
    const first = recent[0];
    const lastSample = recent[recent.length - 1];
    const dt = (lastSample.t - first.t) / 1000;
    if (dt <= 0) {
      return { vx: 0, vy: 0 };
    }
    return { vx: (lastSample.x - first.x) / dt, vy: (lastSample.y - first.y) / dt };
  }

  function down(x: number, y: number, target: EventTarget | null, pointer: 'touch' | 'mouse') {
    const candidate: DragStart = { target: target as HTMLElement, x, y, pointer };
    if (handlers.begin && !handlers.begin(candidate)) {
      start = null;
      return false;
    }
    start = candidate;
    startTime = performance.now();
    axis = null;
    claimed = false;
    rejected = false;
    samples = [{ t: startTime, x, y }];
    return true;
  }

  /** Returns true when the gesture is ours and the browser default should be cancelled. */
  function moveTo(x: number, y: number) {
    if (!start || rejected) {
      return false;
    }
    const dx = x - start.x;
    const dy = y - start.y;
    samples.push({ t: performance.now(), x, y });
    if (samples.length > 12) {
      samples.shift();
    }
    if (!axis) {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) {
        return false;
      }
      axis = Math.abs(dx) > Math.abs(dy) * xBias ? 'x' : 'y';
      const direction = (axis === 'x' ? dx : dy) > 0 ? 1 : -1;
      claimed = handlers.claim(axis, direction, start);
      if (!claimed) {
        rejected = true;
        return false;
      }
      // Re-base so the content does not jump by the slop distance.
      start = { ...start, x, y };
      handlers.move({ axis, dx: 0, dy: 0, vx: 0, vy: 0, target: start.target });
      return true;
    }
    if (claimed) {
      handlers.move({ axis, dx, dy, ...velocity(), target: start.target });
      return true;
    }
    return false;
  }

  function up(x: number, y: number, cancelled: boolean) {
    if (!start) {
      return;
    }
    const current = start;
    if (claimed && axis) {
      suppressClick = true;
      setTimeout(() => {
        suppressClick = false;
      }, 60);
      handlers.end({ axis, dx: x - current.x, dy: y - current.y, ...velocity(), target: current.target });
    }
    void cancelled;
    start = null;
    axis = null;
    claimed = false;
  }

  // Touch
  let touchId: number | null = null;

  function findTouch(list: TouchList) {
    for (let i = 0; i < list.length; i += 1) {
      if (list[i].identifier === touchId) {
        return list[i];
      }
    }
    return null;
  }

  function onTouchStart(event: TouchEvent) {
    if (touchId !== null || event.touches.length > 1) {
      return;
    }
    const touch = event.changedTouches[0];
    if (down(touch.clientX, touch.clientY, event.target, 'touch')) {
      touchId = touch.identifier;
    }
  }

  function onTouchMove(event: TouchEvent) {
    const touch = findTouch(event.changedTouches);
    if (!touch) {
      return;
    }
    if (moveTo(touch.clientX, touch.clientY) && event.cancelable) {
      event.preventDefault();
    }
  }

  function onTouchEnd(event: TouchEvent) {
    const touch = findTouch(event.changedTouches);
    if (!touch) {
      return;
    }
    touchId = null;
    up(touch.clientX, touch.clientY, event.type === 'touchcancel');
  }

  // Mouse
  let mouseDown = false;

  function onMouseDown(event: MouseEvent) {
    if (event.button !== 0 || touchId !== null) {
      return;
    }
    if (down(event.clientX, event.clientY, event.target, 'mouse')) {
      mouseDown = true;
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
  }

  function onMouseMove(event: MouseEvent) {
    if (!mouseDown) {
      return;
    }
    if (moveTo(event.clientX, event.clientY)) {
      event.preventDefault();
      window.getSelection()?.removeAllRanges();
    }
  }

  function onMouseUp(event: MouseEvent) {
    if (!mouseDown) {
      return;
    }
    mouseDown = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    up(event.clientX, event.clientY, false);
  }

  // A drag that ends over a button must not also click it.
  function onClickCapture(event: MouseEvent) {
    if (suppressClick) {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  function onDragStart(event: DragEvent) {
    event.preventDefault();
  }

  element.addEventListener('touchstart', onTouchStart, { passive: true });
  element.addEventListener('touchmove', onTouchMove, { passive: false });
  element.addEventListener('touchend', onTouchEnd);
  element.addEventListener('touchcancel', onTouchEnd);
  element.addEventListener('mousedown', onMouseDown);
  element.addEventListener('click', onClickCapture, true);
  element.addEventListener('dragstart', onDragStart);

  return () => {
    element.removeEventListener('touchstart', onTouchStart);
    element.removeEventListener('touchmove', onTouchMove);
    element.removeEventListener('touchend', onTouchEnd);
    element.removeEventListener('touchcancel', onTouchEnd);
    element.removeEventListener('mousedown', onMouseDown);
    element.removeEventListener('click', onClickCapture, true);
    element.removeEventListener('dragstart', onDragStart);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };
}
