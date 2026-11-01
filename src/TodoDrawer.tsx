import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export function TodoDrawer({ onDismiss, children }: { onDismiss: () => void; children: (close: () => void) => ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; y: number; lastY: number; time: number; velocity: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  useLayoutEffect(() => {
    const sheet = dialog.current!;
    const focused = document.activeElement;
    const scrollY = window.scrollY;
    const body = document.body.style;
    const previous = { position: body.position, top: body.top, width: body.width, overflow: body.overflow };
    Object.assign(body, { position: 'fixed', top: `-${scrollY}px`, width: '100%', overflow: 'hidden' });
    const viewport = window.visualViewport;
    function resize() {
      const height = viewport?.height ?? window.innerHeight;
      const bottom = Math.max(0, window.innerHeight - height - (viewport?.offsetTop ?? 0));
      sheet.style.setProperty('--drawer-bottom', `${bottom}px`);
      sheet.style.setProperty('--drawer-height', `${Math.max(0, height - 16)}px`);
      sheet.style.setProperty('--drawer-safe-bottom', bottom > 80 ? '0px' : 'env(safe-area-inset-bottom)');
    }
    resize();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize);
    // Focus only after final drawer geometry and viewport listeners are in place.
    // Focusing a translated, offscreen input makes iOS pan to its old position.
    sheet.showModal();
    sheet.querySelector<HTMLElement>('[data-drawer-autofocus]')?.focus({ preventScroll: true });
    let frame = 0;
    let settleUntil = 0;
    function settleViewport() {
      resize();
      if (performance.now() < settleUntil) frame = requestAnimationFrame(settleViewport);
      else frame = 0;
    }
    function trackKeyboard() {
      settleUntil = performance.now() + 700;
      if (!frame) frame = requestAnimationFrame(settleViewport);
    }
    // WebKit can delay viewport events until keyboard animation finishes.
    sheet.addEventListener('focusin', trackKeyboard);
    sheet.addEventListener('focusout', trackKeyboard);
    trackKeyboard();
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer.current);
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      window.removeEventListener('resize', resize);
      sheet.removeEventListener('focusin', trackKeyboard);
      sheet.removeEventListener('focusout', trackKeyboard);
      sheet.close();
      Object.assign(body, previous);
      window.scrollTo(0, scrollY);
      if (focused instanceof HTMLElement && focused.isConnected) focused.focus({ preventScroll: true });
    };
  }, []);

  function close() {
    if (timer.current !== undefined) return;
    setClosing(true);
    setVisible(false);
    setDragging(false);
    drag.current = null;
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280;
    timer.current = setTimeout(() => dismiss.current(), duration);
  }

  function resetDrag() { drag.current = null; setDragging(false); setOffset(0); }

  return <dialog ref={dialog} className={`todo-drawer${visible ? ' is-visible' : ''}${closing ? ' is-closing' : ''}${dragging ? ' is-dragging' : ''}`}
    style={{ '--drawer-offset': `${offset}px` } as CSSProperties}
    aria-labelledby="todo-form-title" onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }}>
    <div className="drawer-grab-zone" aria-hidden="true"
      onPointerDown={event => {
        if (event.button !== 0 || closing) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id: event.pointerId, y: event.clientY, lastY: event.clientY, time: event.timeStamp, velocity: 0 };
        setDragging(true);
      }}
      onPointerMove={event => {
        const start = drag.current;
        if (!start || start.id !== event.pointerId) return;
        const elapsed = event.timeStamp - start.time;
        if (elapsed > 0) start.velocity = (event.clientY - start.lastY) / elapsed;
        start.lastY = event.clientY;
        start.time = event.timeStamp;
        const distance = event.clientY - start.y;
        setOffset(distance < 0 ? distance * .15 : distance);
      }}
      onPointerUp={event => {
        const start = drag.current;
        if (!start || start.id !== event.pointerId) return;
        const distance = event.clientY - start.y;
        const fast = event.timeStamp - start.time < 100 && start.velocity > .6 && distance > 24;
        if (distance > Math.min(140, (dialog.current?.offsetHeight ?? 500) * .25) || fast) close();
        else resetDrag();
      }}
      onPointerCancel={resetDrag} onLostPointerCapture={() => { if (drag.current) resetDrag(); }}>
      <div className="drawer-handle" />
    </div>
    <div className="drawer-content">{children(close)}</div>
  </dialog>;
}
