import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { attachDrag } from '../lib/drag';
import { clamp, MotionValue, springs } from '../lib/motion';
import { cx } from '../ui/bits';
import { CrossIcon } from '../ui/icons';

/**
 * Bottom sheet on phones, side drawer on wide screens. Springs open, can be
 * dragged down to dismiss on touch, and closes on backdrop tap or Escape.
 */
export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const [rendered, setRendered] = useState(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  /** 1 = fully hidden, 0 = fully open. */
  const hidden = useRef(new MotionValue(1)).current;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    if (open) {
      setRendered(true);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!rendered) {
      return;
    }
    const paint = (value: number) => {
      panelRef.current?.style.setProperty('--t', String(clamp(value, 0, 1)));
      if (backdropRef.current) {
        backdropRef.current.style.opacity = String(1 - clamp(value, 0, 1));
      }
    };
    paint(hidden.get());
    const off = hidden.onChange(paint);
    return off;
  }, [hidden, rendered]);

  useLayoutEffect(() => {
    if (!rendered) {
      return;
    }
    if (open) {
      hidden.to(0, springs.sheet);
    } else {
      hidden.to(1, { ...springs.sheet, onRest: () => setRendered(false) });
    }
  }, [hidden, open, rendered]);

  useEffect(() => {
    if (!rendered) {
      return;
    }
    document.documentElement.classList.add('sheet-open');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('sheet-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [rendered]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!rendered || !panel) {
      return;
    }
    return attachDrag(panel, {
      begin: (start) => start.pointer === 'touch' && !start.target.closest('[data-nodrag]'),
      claim(axis, direction, start) {
        if (axis !== 'y' || direction < 0) {
          return false;
        }
        const scroller = start.target.closest<HTMLElement>('[data-scroll]');
        return !scroller || scroller.scrollTop <= 0;
      },
      move: ({ dy }) => hidden.set(clamp(dy / panel.offsetHeight, 0, 1)),
      end({ vy }) {
        const velocity = vy / panel.offsetHeight;
        if (vy > 600 || hidden.get() > 0.3) {
          hidden.to(1, { ...springs.sheet, velocity, onRest: () => setRendered(false) });
          closeRef.current();
        } else {
          hidden.to(0, { ...springs.sheet, velocity });
        }
      },
    });
  }, [hidden, rendered]);

  if (!rendered) {
    return null;
  }

  return (
    <div className={cx('sheet-layer', className)}>
      <div className="sheet-backdrop" onClick={onClose} ref={backdropRef} />
      <div aria-label={title} aria-modal="true" className="sheet" ref={panelRef} role="dialog">
        <header className="sheet-head">
          <span aria-hidden="true" className="sheet-grabber" />
          <div>
            {eyebrow ? <small>{eyebrow}</small> : null}
            <h2>{title}</h2>
          </div>
          <button aria-label="Close" className="icon-btn" onClick={onClose} type="button">
            <CrossIcon size={20} />
          </button>
        </header>
        <div className="sheet-body" data-scroll>
          {children}
        </div>
        {footer ? <footer className="sheet-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}
