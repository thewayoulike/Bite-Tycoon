import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';

const FOCUSABLE = 'button:not(:disabled),select:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]';

type TabEvent = { key: string; shiftKey: boolean; preventDefault: () => void };

/** Keep Tab and Shift+Tab inside an open dialog. */
export function trapDialogTab(event: TabEvent, root: HTMLElement | null) {
  if (event.key !== 'Tab' || !root) return;
  const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
  if (!items.length) { event.preventDefault(); return; }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  const inside = active instanceof HTMLElement && root.contains(active);
  if (event.shiftKey && (active === first || active === root || !inside)) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (active === last || active === root || !inside)) { event.preventDefault(); first.focus(); }
}

export function useDialogFocus<T extends HTMLElement>(onEscape?: () => void): { ref: RefObject<T | null>; onKeyDown: (event: KeyboardEvent) => void } {
  const ref = useRef<T>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus();
    return () => previous?.focus?.();
  }, []);
  return {
    ref,
    onKeyDown: (event) => {
      if (event.key === 'Escape' && onEscape) { event.stopPropagation(); onEscape(); }
      trapDialogTab(event, ref.current);
    },
  };
}
