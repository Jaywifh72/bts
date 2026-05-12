'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

/**
 * E-45 — Letterboxd CSV importer. Parses watched.csv (or
 * diary.csv / ratings.csv — they all share the Date,Name,Year header
 * shape) entirely client-side, then POSTs (title, year) pairs to
 * `/api/import/letterboxd/match` for matching against curated
 * productions.
 *
 * "Nothing is uploaded" is the user-visible promise — we send only
 * the title/year pairs, not the full CSV (no dates, ratings, URIs).
 */

type Entry = { title: string; year: number | null };
type Match = Entry & {
  production_slug: string | null;
  production_title: string | null;
  data_tier: string | null;
  release_year: number | null;
};

/**
 * Tiny CSV parser. Letterboxd CSVs are RFC 4180-ish: comma-separated,
 * double-quoted strings escape internal quotes by doubling. We only
 * need columns "Name" and "Year".
 */
function parseCsv(text: string): { rows: string[][]; header: string[] } {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { cur.push(field); field = ''; }
      else if (ch === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else if (ch === '\r') { /* skip */ }
      else { field += ch; }
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  const header = rows.shift() ?? [];
  return { header, rows };
}

function extractEntries(text: string): Entry[] {
  const { header, rows } = parseCsv(text);
  const nameIdx = header.findIndex((h) => h.trim().toLowerCase() === 'name');
  const yearIdx = header.findIndex((h) => h.trim().toLowerCase() === 'year');
  if (nameIdx === -1) return [];
  const out: Entry[] = [];
  for (const row of rows) {
    const title = row[nameIdx]?.trim();
    if (!title) continue;
    const yearRaw = yearIdx >= 0 ? row[yearIdx]?.trim() : null;
    const year = yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null;
    out.push({ title, year });
  }
  return out;
}

export function LetterboxdImport() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<{ total: number; matched: number; curated: number; unmatched: number } | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState<'curated' | 'all-matched' | 'unmatched'>('curated');

  async function handleFile(file: File) {
    setError(null);
    setCounts(null);
    setMatches([]);
    setLoading(true);
    try {
      const text = await file.text();
      const entries = extractEntries(text);
      if (entries.length === 0) {
        throw new Error('No valid rows found. Ensure the CSV has a "Name" column.');
      }
      const r = await fetch('/api/import/letterboxd/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${r.status}`);
      }
      const json = (await r.json()) as { matches: Match[]; counts: typeof counts };
      setMatches(json.matches);
      setCounts(json.counts);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const filtered = matches.filter((m) => {
    if (filter === 'curated') return m.data_tier === 'curated';
    if (filter === 'all-matched') return m.production_slug !== null;
    return m.production_slug === null;
  });

  return (
    <div className="space-y-6">
      <div
        className="flex flex-col items-center gap-3 rounded border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) void handleFile(f);
        }}
      >
        <p className="text-sm text-zinc-400">
          Drop <code>watched.csv</code> here, or browse below.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-500"
          disabled={loading}
        >
          {loading ? 'Matching…' : 'Choose CSV'}
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {counts && (
        <div className="space-y-4">
          <div className="grid gap-3 text-center sm:grid-cols-4">
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Watched</div>
              <div className="font-mono text-2xl text-zinc-100">{counts.total}</div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Matched here</div>
              <div className="font-mono text-2xl text-zinc-100">{counts.matched}</div>
            </div>
            <div className="rounded border border-amber-700 bg-amber-950/30 p-3">
              <div className="text-xs uppercase tracking-wide text-amber-500">Curated BTS</div>
              <div className="font-mono text-2xl text-amber-300">{counts.curated}</div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Unmatched</div>
              <div className="font-mono text-2xl text-zinc-500">{counts.unmatched}</div>
            </div>
          </div>

          <div className="flex gap-2">
            {(['curated', 'all-matched', 'unmatched'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded border px-2 py-1 text-xs ${
                  filter === k ? 'border-amber-500 bg-amber-950/40 text-amber-300' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                {k === 'curated' ? `Curated (${counts.curated})` : k === 'all-matched' ? `All matched (${counts.matched})` : `Unmatched (${counts.unmatched})`}
              </button>
            ))}
          </div>

          <ul className="space-y-1 rounded border border-zinc-800 bg-zinc-900/40 p-3 max-h-96 overflow-y-auto text-sm">
            {filtered.slice(0, 500).map((m, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span className="font-mono text-xs text-zinc-600 tabular-nums w-12 shrink-0">{m.year ?? '—'}</span>
                {m.production_slug ? (
                  <>
                    <Link href={`/films/${m.production_slug}`} className="text-zinc-100 hover:text-amber-400">
                      {m.production_title}
                    </Link>
                    {m.data_tier === 'curated' && (
                      <span className="rounded bg-amber-950/40 border border-amber-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-400">
                        curated
                      </span>
                    )}
                    {m.title.toLowerCase() !== (m.production_title ?? '').toLowerCase() && (
                      <span className="text-xs text-zinc-600">(matched: "{m.title}")</span>
                    )}
                  </>
                ) : (
                  <span className="text-zinc-500">{m.title}</span>
                )}
              </li>
            ))}
            {filtered.length > 500 && (
              <li className="text-xs text-zinc-600">
                + {filtered.length - 500} more. Filter narrows the set; this list is capped at 500 rows.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
