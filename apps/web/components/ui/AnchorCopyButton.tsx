'use client';

import { useState } from 'react';

/**
 * UX-audit E2 — small `#` button rendered next to anchored section
 * headings. On click, copies the absolute URL with `#anchorId` to the
 * clipboard so a DP can paste-link "the lighting plot on Dune Part Two"
 * directly into Slack.
 *
 * Falls back silently on browsers without `navigator.clipboard` — the
 * button simply doesn't update; users can use the URL-bar approach.
 */
export function AnchorCopyButton({ anchorId }: { anchorId: string }) {
  const [state, setState] = useState<'idle' | 'copied'>('idle');

  async function onCopy() {
    try {
      const url = `${window.location.origin}${window.location.pathname}#${anchorId}`;
      await navigator.clipboard.writeText(url);
      setState('copied');
      setTimeout(() => setState('idle'), 1600);
    } catch {
      // no-op — clipboard API not available
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={state === 'copied' ? 'Section link copied' : `Copy link to ${anchorId} section`}
      title="Copy link to this section"
      className="ml-2 rounded px-1 text-xs text-zinc-500 hover:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
    >
      {state === 'copied' ? (
        <span className="text-amber-300">
          <span aria-hidden="true">✓ </span>copied
        </span>
      ) : (
        <span aria-hidden="true">#</span>
      )}
    </button>
  );
}
