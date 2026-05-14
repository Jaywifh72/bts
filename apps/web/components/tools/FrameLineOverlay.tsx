'use client';

import { useState } from 'react';

/**
 * E-37 — frame-line overlay tool. Pure SVG; client-side only.
 *
 * Concept: a sensor (or "reference image") is shown as the outer
 * rectangle. Each common cinema aspect ratio is rendered as a centered
 * rectangle within it — the largest fully-contained rectangle of that
 * aspect. Toggling aspects shows/hides their guides. Dropping an image
 * on top fills the sensor frame so the user can see how their actual
 * shot will crop.
 *
 * Sensor presets cover the formats CineCanon already taxonomizes
 * (E-23 / formats.ts): ARRI ALEXA 65, Mini LF, S35 4-perf, IMAX 65mm
 * 15-perf, etc. We give each its native sensor aspect.
 */

const SENSORS: Array<{ id: string; label: string; width: number; height: number }> = [
  { id: 'imax-1.43', label: 'IMAX 65mm 15-perf (1.43:1)', width: 1.43, height: 1 },
  { id: 'alexa-65', label: 'ARRI ALEXA 65 Open Gate (1.51:1)', width: 1.51, height: 1 },
  { id: 'alexa-mini-lf', label: 'ARRI ALEXA Mini LF Open Gate (1.44:1)', width: 1.44, height: 1 },
  { id: 's35-4perf', label: 'Super 35 4-perf (1.34:1)', width: 1.34, height: 1 },
  { id: 'vistavision', label: 'VistaVision 8-perf (1.5:1)', width: 1.5, height: 1 },
  { id: 's16', label: 'Super 16 (1.66:1)', width: 1.66, height: 1 },
];

const ASPECTS: Array<{ id: string; label: string; ratio: number; color: string }> = [
  { id: '1.33', label: '1.33:1', ratio: 1.33, color: '#f59e0b' },
  { id: '1.66', label: '1.66:1', ratio: 1.66, color: '#10b981' },
  { id: '1.78', label: '1.78:1 (16:9)', ratio: 1.78, color: '#3b82f6' },
  { id: '1.85', label: '1.85:1 (academy)', ratio: 1.85, color: '#a855f7' },
  { id: '2.0', label: '2.00:1 (univisium)', ratio: 2.0, color: '#ec4899' },
  { id: '2.20', label: '2.20:1 (70mm)', ratio: 2.2, color: '#06b6d4' },
  { id: '2.39', label: '2.39:1 (anamorphic)', ratio: 2.39, color: '#ef4444' },
  { id: '2.76', label: '2.76:1 (Ultra Pana)', ratio: 2.76, color: '#84cc16' },
];

type Frame = { x: number; y: number; w: number; h: number };

/**
 * Largest aspect-`ratio` rectangle centered inside the (sensorW × sensorH)
 * canvas. If the requested aspect is wider than the sensor, the rectangle
 * matches the sensor's width and gets letterboxed. Otherwise pillarboxed.
 */
function inscribe(sensorW: number, sensorH: number, ratio: number): Frame {
  const sensorRatio = sensorW / sensorH;
  if (ratio >= sensorRatio) {
    const w = sensorW;
    const h = sensorW / ratio;
    return { x: 0, y: (sensorH - h) / 2, w, h };
  }
  const h = sensorH;
  const w = sensorH * ratio;
  return { x: (sensorW - w) / 2, y: 0, w, h };
}

export function FrameLineOverlay() {
  const [sensorId, setSensorId] = useState('alexa-mini-lf');
  const [activeAspects, setActiveAspects] = useState<Set<string>>(new Set(['2.39', '1.85']));
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const sensor = SENSORS.find((s) => s.id === sensorId)!;
  // Render the sensor at a fixed pixel canvas — 1200×height.
  const canvasW = 1200;
  const canvasH = canvasW / (sensor.width / sensor.height);

  function toggleAspect(id: string) {
    setActiveAspects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3">
        <label className="text-xs text-zinc-500">
          Sensor / format
          <select
            value={sensorId}
            onChange={(e) => setSensorId(e.target.value)}
            className="ml-2 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
          >
            {SENSORS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-500">
          Reference image
          <input
            type="file"
            accept="image/*"
            onChange={onImageChange}
            className="ml-2 text-sm text-zinc-300 file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-zinc-200"
          />
        </label>
        {imageDataUrl && (
          <button
            type="button"
            onClick={() => setImageDataUrl(null)}
            className="text-xs text-zinc-500 hover:text-amber-400"
          >
            Clear image
          </button>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Show frame lines</p>
        <div className="flex flex-wrap gap-2">
          {ASPECTS.map((a) => {
            const active = activeAspects.has(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAspect(a.id)}
                className={`rounded border px-2 py-1 text-xs transition-colors ${
                  active
                    ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600'
                }`}
                style={active ? { borderColor: a.color, color: a.color } : undefined}
                aria-pressed={active}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded border border-zinc-800 bg-zinc-950">
        <svg
          viewBox={`0 0 ${canvasW} ${canvasH}`}
          className="block w-full"
          aria-label={`${sensor.label} with selected aspect frame lines overlaid`}
        >
          {imageDataUrl ? (
            <image
              href={imageDataUrl}
              x={0}
              y={0}
              width={canvasW}
              height={canvasH}
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <rect x={0} y={0} width={canvasW} height={canvasH} fill="#27272a" />
          )}

          {/* Sensor outline */}
          <rect
            x={0}
            y={0}
            width={canvasW}
            height={canvasH}
            fill="none"
            stroke="#71717a"
            strokeWidth={2}
            strokeDasharray="6 4"
          />

          {/* Frame-line guides */}
          {ASPECTS.filter((a) => activeAspects.has(a.id)).map((a) => {
            const f = inscribe(canvasW, canvasH, a.ratio);
            return (
              <g key={a.id}>
                <rect
                  x={f.x}
                  y={f.y}
                  width={f.w}
                  height={f.h}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={3}
                />
                <text
                  x={f.x + 12}
                  y={f.y + 24}
                  fill={a.color}
                  fontSize={16}
                  fontFamily="monospace"
                  fontWeight={600}
                  paintOrder="stroke"
                  stroke="#0a0a0a"
                  strokeWidth={3}
                >
                  {a.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-xs text-zinc-500">
        Sensor ratios are nominal native gate aspects — your actual capture
        ratio depends on which mode the camera body is configured for. Always
        cross-check with the manufacturer's frame-line tool before lock.
      </p>
    </div>
  );
}
