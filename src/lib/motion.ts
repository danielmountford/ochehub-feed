/**
 * Tiny motion toolkit: a spring-driven value you can also set directly while a
 * finger is down. No dependencies; everything animates through one rAF loop.
 *
 * In the OcheHub web app this maps onto framer-motion's `useMotionValue` +
 * `animate(value, target, { type: 'spring' })`.
 */

export interface SpringOptions {
  stiffness?: number;
  damping?: number;
  mass?: number;
  /** Initial velocity in units per second. */
  velocity?: number;
  /** Stop when both distance and speed fall under these. */
  restDistance?: number;
  restSpeed?: number;
  onRest?: () => void;
}

type Listener = (value: number) => void;

const active = new Set<MotionValue>();
let frame = 0;
let last = 0;

function tick(now: number) {
  const dt = Math.min(0.032, (now - last) / 1000 || 0.016);
  last = now;
  for (const value of [...active]) {
    value.step(dt);
  }
  frame = active.size ? requestAnimationFrame(tick) : 0;
}

function schedule(value: MotionValue) {
  active.add(value);
  if (!frame) {
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }
}

export function prefersReducedMotion() {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export class MotionValue {
  private current: number;
  private target: number;
  private velocity = 0;
  private options: Required<Omit<SpringOptions, 'velocity' | 'onRest'>> = {
    stiffness: 260,
    damping: 30,
    mass: 1,
    restDistance: 0.001,
    restSpeed: 0.01,
  };
  private onRest?: () => void;
  private listeners = new Set<Listener>();

  constructor(initial: number) {
    this.current = initial;
    this.target = initial;
  }

  get() {
    return this.current;
  }

  getTarget() {
    return this.target;
  }

  isAnimating() {
    return active.has(this);
  }

  /** Jump to a value (finger tracking). Cancels any running spring. */
  set(value: number) {
    active.delete(this);
    this.onRest = undefined;
    this.velocity = 0;
    this.target = value;
    if (value !== this.current) {
      this.current = value;
      this.emit();
    }
  }

  /** Spring towards a target, carrying over release velocity. */
  to(target: number, options: SpringOptions = {}) {
    this.target = target;
    this.options = {
      stiffness: options.stiffness ?? 260,
      damping: options.damping ?? 30,
      mass: options.mass ?? 1,
      restDistance: options.restDistance ?? 0.001,
      restSpeed: options.restSpeed ?? 0.01,
    };
    this.onRest = options.onRest;
    if (options.velocity !== undefined) {
      this.velocity = options.velocity;
    }
    if (prefersReducedMotion()) {
      this.finish();
      return;
    }
    schedule(this);
  }

  stop() {
    active.delete(this);
    this.onRest = undefined;
    this.velocity = 0;
  }

  onChange(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Internal: advance the spring by `dt` seconds (semi-implicit Euler, sub-stepped). */
  step(dt: number) {
    const { stiffness, damping, mass, restDistance, restSpeed } = this.options;
    const steps = Math.max(1, Math.ceil(dt / 0.004));
    const h = dt / steps;
    for (let i = 0; i < steps; i += 1) {
      const force = -stiffness * (this.current - this.target) - damping * this.velocity;
      this.velocity += (force / mass) * h;
      this.current += this.velocity * h;
    }
    if (Math.abs(this.current - this.target) < restDistance && Math.abs(this.velocity) < restSpeed) {
      this.finish();
      return;
    }
    this.emit();
  }

  private finish() {
    active.delete(this);
    this.current = this.target;
    this.velocity = 0;
    this.emit();
    const done = this.onRest;
    this.onRest = undefined;
    done?.();
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.current);
    }
  }
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
/** Map `value` from [inMin, inMax] onto 0..1, clamped. */
export const progress = (value: number, inMin: number, inMax: number) =>
  clamp((value - inMin) / (inMax - inMin), 0, 1);
/** Resistance past an edge: the further you pull, the less it moves. */
export const rubber = (distance: number, dimension: number, constant = 0.55) =>
  (distance * dimension * constant) / (dimension + constant * Math.abs(distance));

export const springs = {
  /** Sheet open/close and full ⇄ mini morph. */
  sheet: { stiffness: 300, damping: 34, mass: 1 },
  /** Horizontal card paging. */
  pager: { stiffness: 320, damping: 36, mass: 1 },
  /** Small settles and snaps. */
  snappy: { stiffness: 520, damping: 40, mass: 1 },
} as const;
