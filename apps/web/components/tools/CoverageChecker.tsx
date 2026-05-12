'use client';

import { useMemo, useState } from 'react';
import type { LensCoverageItem } from '@bts/db';
import { SENSORS } from '@/lib/sensor-presets';

/**
 * E-34 — sensor/aspect compatibility checker. Pure trig:
 *
 *   inscribed_w = min(sensor_w, sensor_h * aspect)
 *   inscribed_h = min(sensor_h, sensor_w / aspect)
 *   crop_diag   = sqrt(w² + h²)
 *
 *   covers_full_sensor = lens_image_circle ≥ sensor_diagonal
 *   covers_at_aspect   = lens_image_circle ≥ crop_diag
 *
 * Sensor presets live in `lib/sensor-presets.ts` so the item page
 * can derive its own coverage panel from the same numbers.
 */

type Aspect = { id: string; label: string; ratio: number };

const ASPECTS: readonly Aspect[] = [
  { id: '1.33', label: '1.33:1 (4:3)',         ratio: 1.3333 },
  { id: '1.66', label: '1.66:1',                ratio: 1.66 },
  { id: '1.78', label: '1.78:1 (16:9)',         ratio: 1.7777 },
  { id: '1.85', label: '1.85:1 (academy)',      ratio: 1.85 },
  { id: '2.0',  label: '2.00:1 (univisium)',    ratio: 2.0 },
  { id: '2.20', label: '2.20:1 (70mm)',         ratio: 2.2 },
  { id: '2.39', label: '2.39:1 (anamorphic)',   ratio: 2.39 },
  { id: '2.76', label: '2.76:1 (Ultra Pana)',   ratio: 2.76 },
];

function inscribe(sensorW: number, sensorH: number, aspect: number): { w: number; h: number } {
  const sensorAspect = sensorW / sensorH;
  if (aspect >= sensorAspect) {
    return { w: sensorW, h: sensorW / aspect };
  }
  return { w: sensorH * aspect, h: sensorH };
}

function diag(w: number, h: number): number {
  return Math.sqrt(w * w + h * h);
}

type Verdict =
  | { kind: 'covers';       margin_mm: number }
  | { kind: 'covers-aspect'; deficit_mm: number; margin_mm: number }
  | { kind: 'vignettes';    deficit_mm: number };

function verdict(imageCircle: number, sensorDiag: number, cropDiag: number): Verdict {
  if (imageCircle >= sensorDiag) return { kind: 'covers', margin_mm: imageCircle - sensorDiag };
  if (imageCircle >= cropDiag) return {
    kind: 'covers-aspect',
    deficit_mm: sensorDiag - imageCircle,
    margin_mm: imageCircle - cropDiag,
  };
  return { kind: 'vignettes', deficit_mm: cropDiag - imageCircle };
}

export function CoverageChecker({ lenses }: { lenses: LensCoverageItem[] }) {
  const [sensorId, setSensorId] = useState<string>('alexa-mini-lf');
  const [aspectId, setAspectId] = useState<string>('1.85');
  const [lensSlug, setLensSlug] = useState<string>('');
  const [manualCircle, setManualCircle] = useState<string>('');

  const sensor = SENSORS.find((s) => s.id === sensorId)!;
  const aspect = ASPECTS.find((a) => a.id === aspectId)!;

  const lensesByMfg = useMemo(() => {
    const m = new Map<string, LensCoverageItem[]>();
    for (const l of lenses) {
      const list = m.get(l.manufacturer) ?? [];
      list.push(l);
      m.set(l.manufacturer, list);
    }
    return m;
  }, [lenses]);

  const selectedLens = lenses.find((l) => l.slug_path === lensSlug);
  const imageCircle = selectedLens
    ? Number(selectedLens.image_circle_mm)
    : manualCircle ? Number(manualCircle) : NaN;

  const sensorDiag = diag(sensor.width_mm, sensor.height_mm);
  const inscribed = inscribe(sensor.width_mm, sensor.height_mm, aspect.ratio);
  const cropDiag = diag(inscribed.w, inscribed.h);

  const v = !Number.isFinite(imageCircle) || imageCircle <= 0
    ? null
    : verdict(imageCircle, sensorDiag, cropDiag);

  // SVG viewport: scale longest dimension (sensor or lens circle) to fit.
  const svgPad = 14;
  const span = Math.max(imageCircle * 2 || 0, sensorDiag * 2);
  const scale = (320 - svgPad * 2) / span;
  const cx = 320 / 2;
  const cy = 320 / 2;
  const sw = sensor.width_mm * scale;
  const sh = sensor.height_mm * scale;
  const iw = inscribed.w * scale;
  const ih = inscribed.h * scale;
  const cr = (Number.isFinite(imageCircle) ? imageCircle : 0) * scale;

  const verdictColor = v?.kind === 'covers' ? 'text-emerald-400 border-emerald-700 bg-emerald-950/40'
    : v?.kind === 'covers-aspect' ? 'text-amber-400 border-amber-700 bg-amber-950/40'
    : v?.kind === 'vignettes' ? 'text-red-400 border-red-700 bg-red-950/40'
    : 'text-zinc-400 border-zinc-800 bg-zinc-950';

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        {/* Sensor */}
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Sensor</span>
          <select
            value={sensorId}
            onChange={(e) => setSensorId(e.target.value)}
            className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
          >
            {SENSORS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.width_mm} × {s.height_mm} mm, Ø{diag(s.width_mm, s.height_mm).toFixed(2)} mm)
              </option>
            ))}
          </select>
        </label>

        {/* Aspect */}
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Delivery aspect</span>
          <select
            value={aspectId}
            onChange={(e) => setAspectId(e.target.value)}
            className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
          >
            {ASPECTS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </label>

        {/* Lens */}
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Lens (curated)</span>
          <select
            value={lensSlug}
            onChange={(e) => { setLensSlug(e.target.value); setManualCircle(''); }}
            className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
          >
            <option value="">— or enter image circle below —</option>
            {[...lensesByMfg.entries()].map(([mfg, list]) => (
              <optgroup key={mfg} label={mfg}>
                {list.map((l) => (
                  <option key={l.slug_path} value={l.slug_path}>
                    {l.series} — {l.item} (Ø{Number(l.image_circle_mm).toFixed(1)} mm{l.is_anamorphic ? `, ${l.anamorphic_squeeze ?? 2}× anam` : ''})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-zinc-500">…or image circle (mm)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={manualCircle}
            onChange={(e) => { setManualCircle(e.target.value); setLensSlug(''); }}
            placeholder="e.g. 46.3"
            className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
          />
        </label>

        {/* Result card */}
        {v && (
          <div className={`rounded border p-4 text-sm ${verdictColor}`}>
            <div className="font-medium">
              {v.kind === 'covers' && '✓ Covers full sensor'}
              {v.kind === 'covers-aspect' && '⚠ Covers only at this aspect'}
              {v.kind === 'vignettes' && '✗ Vignettes — image circle too small'}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs">
              <span>Lens image Ø</span>
              <span className="text-right">{imageCircle.toFixed(2)} mm</span>
              <span>Sensor diagonal</span>
              <span className="text-right">{sensorDiag.toFixed(2)} mm</span>
              <span>Crop @ {aspect.id}:1 diagonal</span>
              <span className="text-right">{cropDiag.toFixed(2)} mm</span>
              <span>Crop area</span>
              <span className="text-right">{inscribed.w.toFixed(2)} × {inscribed.h.toFixed(2)} mm</span>
              {v.kind === 'covers' && (
                <>
                  <span>Margin</span>
                  <span className="text-right">+{v.margin_mm.toFixed(2)} mm</span>
                </>
              )}
              {v.kind === 'covers-aspect' && (
                <>
                  <span>Aspect margin</span>
                  <span className="text-right">+{v.margin_mm.toFixed(2)} mm</span>
                  <span>Sensor deficit</span>
                  <span className="text-right">−{v.deficit_mm.toFixed(2)} mm</span>
                </>
              )}
              {v.kind === 'vignettes' && (
                <>
                  <span>Deficit</span>
                  <span className="text-right">−{v.deficit_mm.toFixed(2)} mm</span>
                </>
              )}
            </div>
          </div>
        )}
        {!v && (
          <p className="rounded border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">
            Pick a lens above (or enter an image circle in mm) to compute coverage.
          </p>
        )}
      </div>

      {/* SVG diagram */}
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 320 320" className="w-full max-w-xs rounded border border-zinc-800 bg-zinc-950">
          {/* Lens image circle */}
          {Number.isFinite(imageCircle) && imageCircle > 0 && (
            <circle
              cx={cx} cy={cy} r={cr}
              fill="none"
              stroke={v?.kind === 'covers' ? '#10b981' : v?.kind === 'covers-aspect' ? '#f59e0b' : '#ef4444'}
              strokeWidth={2}
              strokeDasharray="4 3"
            />
          )}
          {/* Sensor rectangle */}
          <rect
            x={cx - sw / 2} y={cy - sh / 2} width={sw} height={sh}
            fill="none" stroke="#a1a1aa" strokeWidth={1.5}
          />
          {/* Inscribed crop */}
          <rect
            x={cx - iw / 2} y={cy - ih / 2} width={iw} height={ih}
            fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth={1}
          />
        </svg>
        <div className="mt-3 grid grid-cols-[12px_1fr] items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
          <span className="block h-px w-3 border-t-2 border-dashed border-emerald-500" />
          <span>Lens image circle</span>
          <span className="block h-px w-3 border-t-2 border-zinc-400" />
          <span>Sensor active area</span>
          <span className="block h-2 w-3 bg-amber-500/30 ring-1 ring-amber-500" />
          <span>Crop @ {aspect.id}:1</span>
        </div>
      </div>
    </div>
  );
}
