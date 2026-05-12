'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * T5-4 — keyboard shortcuts (Wikipedia / Linear / GitHub style):
 *   - `g` then `f`/`c`/`g`/`v`/`b` jumps to films/crew/gear/vfx/bookmarks
 *   - `g` then `h` jumps home
 *   - `?` toggles a help overlay
 *
 * Ignored when the user is typing in an input/textarea/contenteditable.
 * Mounted once in the root layout.
 */

const ROUTE_FOR_KEY: Record<string, string> = {
  h: '/',
  f: '/films',
  c: '/crew',
  g: '/gear',
  v: '/vfx',
  b: '/bookmarks',
};

export function KeyboardShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // a11y — focus management: move focus into the dialog on open, trap
  // Tab cycles inside it, restore focus on close. WCAG 2.1 Success
  // Criterion 2.4.3.
  useEffect(() => {
    if (!helpOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    function trap(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', trap);
    return () => {
      window.removeEventListener('keydown', trap);
      previouslyFocused.current?.focus();
    };
  }, [helpOpen]);

  useEffect(() => {
    let pendingG = false;
    let pendingTimer: number | null = null;

    function isTyping(target: EventTarget | null): boolean {
      const el = target as HTMLElement | null;
      if (!el) return false;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;

      if (e.key === '?') {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }

      if (helpOpen && e.key === 'Escape') {
        setHelpOpen(false);
        return;
      }

      if (pendingG) {
        const route = ROUTE_FOR_KEY[e.key];
        pendingG = false;
        if (pendingTimer !== null) { window.clearTimeout(pendingTimer); pendingTimer = null; }
        if (route) {
          e.preventDefault();
          router.push(route);
        }
        return;
      }

      if (e.key === 'g') {
        pendingG = true;
        pendingTimer = window.setTimeout(() => { pendingG = false; pendingTimer = null; }, 1500);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (pendingTimer !== null) window.clearTimeout(pendingTimer);
    };
  }, [router, helpOpen]);

  if (!helpOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/70 p-8 backdrop-blur-sm"
      onClick={() => setHelpOpen(false)}
    >
      <div
        ref={dialogRef}
        className="mt-24 w-full max-w-md rounded border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg text-zinc-100">Keyboard shortcuts</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setHelpOpen(false)}
            className="text-xs text-zinc-500 hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded px-1"
            aria-label="Close keyboard shortcuts dialog"
          >
            Esc
          </button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <Shortcut keys={['/']} desc="Focus search" />
          <Shortcut keys={['?']} desc="Toggle this help" />
          <Shortcut keys={['g', 'h']} desc="Go to home" />
          <Shortcut keys={['g', 'f']} desc="Go to films" />
          <Shortcut keys={['g', 'c']} desc="Go to crew" />
          <Shortcut keys={['g', 'g']} desc="Go to gear" />
          <Shortcut keys={['g', 'v']} desc="Go to VFX" />
          <Shortcut keys={['g', 'b']} desc="Go to bookmarks" />
        </dl>
      </div>
    </div>
  );
}

function Shortcut({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <>
      <dt className="flex gap-1">
        {keys.map((k) => (
          <kbd
            key={k}
            className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-zinc-700 bg-zinc-950 px-1.5 font-mono text-xs text-zinc-300"
          >
            {k}
          </kbd>
        ))}
      </dt>
      <dd className="text-zinc-300">{desc}</dd>
    </>
  );
}
