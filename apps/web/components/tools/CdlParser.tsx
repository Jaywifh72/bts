'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';

/**
 * E-36 — ASC CDL parser. Pure client-side: file picker → DOMParser
 * over the XML → extract SOPNode (Slope, Offset, Power triplets) +
 * SatNode (Saturation float).
 *
 * `.cdl` files contain a single ColorCorrection element. `.ccc` is
 * a ColorCorrectionCollection wrapping multiple corrections (each
 * with an id attribute). We surface every correction we find and let
 * the user pick which to preview.
 *
 * The preview is approximate — full ASC CDL math is per-channel
 * gamma + saturation in a defined working space, but a CSS filter
 * gets the eye most of the way there for a quick read.
 */

type Correction = {
  id: string | null;
  slope: [number, number, number];
  offset: [number, number, number];
  power: [number, number, number];
  saturation: number;
};

function parseTriple(text: string | null | undefined): [number, number, number] | null {
  if (!text) return null;
  const parts = text.trim().split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return parts as [number, number, number];
}

function parseCdl(xml: string): Correction[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid XML: ' + doc.querySelector('parsererror')?.textContent?.slice(0, 200));
  }
  const corrections = doc.getElementsByTagName('ColorCorrection');
  if (corrections.length === 0) {
    throw new Error('No <ColorCorrection> element found.');
  }
  const out: Correction[] = [];
  for (const cc of Array.from(corrections)) {
    const slope = parseTriple(cc.getElementsByTagName('Slope')[0]?.textContent);
    const offset = parseTriple(cc.getElementsByTagName('Offset')[0]?.textContent);
    const power = parseTriple(cc.getElementsByTagName('Power')[0]?.textContent);
    const satText = cc.getElementsByTagName('Saturation')[0]?.textContent;
    const saturation = satText ? Number(satText.trim()) : 1.0;
    if (!slope || !offset || !power) continue;
    out.push({
      id: cc.getAttribute('id'),
      slope, offset, power,
      saturation: Number.isFinite(saturation) ? saturation : 1.0,
    });
  }
  if (out.length === 0) throw new Error('No valid SOP node found in any <ColorCorrection>.');
  return out;
}

/**
 * CSS approximation of the SOP+Sat math. Real ASC CDL is per-channel,
 * so a single CSS `filter: brightness contrast saturate` is lossy —
 * we average the slope (≈ contrast) and use the saturation directly.
 */
function approximateCssFilter(c: Correction): string {
  const slopeAvg = (c.slope[0] + c.slope[1] + c.slope[2]) / 3;
  const offsetAvg = (c.offset[0] + c.offset[1] + c.offset[2]) / 3;
  // Slope ≈ contrast multiplier; offset ≈ brightness shift; power ≈ gamma.
  const powerAvg = (c.power[0] + c.power[1] + c.power[2]) / 3;
  return [
    `brightness(${(1 + offsetAvg).toFixed(3)})`,
    `contrast(${slopeAvg.toFixed(3)})`,
    `saturate(${c.saturation.toFixed(3)})`,
    // Approximate gamma via additional contrast nudge if power deviates.
    powerAvg !== 1 ? `contrast(${(2 - powerAvg).toFixed(3)})` : '',
  ].filter(Boolean).join(' ');
}

const SAMPLE_IMAGE = 'https://image.tmdb.org/t/p/w1280/d5NXSklXo0qyIYkgV94XAgMIckC.jpg';

export function CdlParser() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  async function handleFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const list = parseCdl(text);
      setCorrections(list);
      setActiveIdx(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCorrections([]);
    }
  }

  const active = corrections[activeIdx];

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
        <p className="text-sm text-zinc-400">Drop a .cdl or .ccc file here, or browse below.</p>
        <input
          ref={fileInput}
          type="file"
          accept=".cdl,.ccc,.xml,application/xml,text/xml"
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
        >
          Choose file
        </button>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded border border-red-800 bg-red-950/30 p-3 text-sm text-red-300"
        >
          <span aria-hidden="true">⚠ </span>Parse error: {error}
        </div>
      )}

      {corrections.length > 1 && (
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            {corrections.length} ColorCorrection element{corrections.length === 1 ? '' : 's'} found
          </span>
          <select
            value={activeIdx}
            onChange={(e) => setActiveIdx(Number(e.target.value))}
            className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
          >
            {corrections.map((c, i) => (
              <option key={i} value={i}>
                {c.id ?? `(unnamed #${i + 1})`}
              </option>
            ))}
          </select>
        </label>
      )}

      {active && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">SOP node</div>
              <div className="mt-2 grid grid-cols-[auto_1fr_1fr_1fr] gap-x-4 gap-y-1 font-mono text-sm">
                <span className="text-zinc-500">Channel</span>
                <span className="text-right text-zinc-500">R</span>
                <span className="text-right text-zinc-500">G</span>
                <span className="text-right text-zinc-500">B</span>
                <span className="text-zinc-400">Slope</span>
                {active.slope.map((v, i) => (
                  <span key={`s${i}`} className="text-right text-zinc-200">{v.toFixed(4)}</span>
                ))}
                <span className="text-zinc-400">Offset</span>
                {active.offset.map((v, i) => (
                  <span key={`o${i}`} className="text-right text-zinc-200">{v.toFixed(4)}</span>
                ))}
                <span className="text-zinc-400">Power</span>
                {active.power.map((v, i) => (
                  <span key={`p${i}`} className="text-right text-zinc-200">{v.toFixed(4)}</span>
                ))}
              </div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Sat node</div>
              <div className="mt-1 font-mono text-sm text-zinc-200">
                Saturation: {active.saturation.toFixed(4)}
              </div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-500">
              CSS filter approximation:
              <code className="mt-1 block break-all text-amber-400">{approximateCssFilter(active)}</code>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Preview (CSS approximation)</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="mb-1 text-xs text-zinc-600">Original</div>
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded">
                  <Image
                    src={SAMPLE_IMAGE}
                    alt="Sample frame, unmodified"
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-zinc-600">After CDL</div>
                <div
                  className="relative aspect-[16/9] w-full overflow-hidden rounded"
                  style={{ filter: approximateCssFilter(active) }}
                >
                  <Image
                    src={SAMPLE_IMAGE}
                    alt="Sample frame with CDL applied"
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-600">
              Real ASC CDL math is per-channel slope/offset/power. The
              browser CSS filter is a rough single-channel approximation
              — useful for direction but not for pixel-accurate dailies.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
