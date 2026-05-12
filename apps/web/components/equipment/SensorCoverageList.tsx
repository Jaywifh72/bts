import { SENSORS_BY_DIAGONAL, sensorDiagonal } from '@/lib/sensor-presets';

type Verdict = 'covers' | 'covers-1.85' | 'vignettes';

/**
 * Derives "which sensors does this lens cover" from the curated
 * image_circle_mm value. Three states per sensor:
 *   covers       — image circle ≥ sensor diagonal
 *   covers-1.85  — image circle ≥ 1.85:1 inscribed crop diagonal
 *                  (i.e. covers when the camera shoots at 1.85 or wider
 *                   crops, but not full open-gate)
 *   vignettes    — image circle below the 1.85 crop diagonal
 *
 * The 1.85 cut-off is editorially common — most narrative work crops
 * to 1.85, 2.00, or 2.39 anyway, so a lens that covers-1.85 is
 * effectively usable on the body even if it doesn't cover open-gate.
 */
function classify(imageCircle: number, w: number, h: number): Verdict {
  const diag = sensorDiagonal(w, h);
  if (imageCircle >= diag) return 'covers';
  // 1.85 inscribed inside the sensor.
  const aspect = 1.85;
  const sensorAspect = w / h;
  const cropW = aspect >= sensorAspect ? w : h * aspect;
  const cropH = aspect >= sensorAspect ? w / aspect : h;
  const cropDiag = sensorDiagonal(cropW, cropH);
  return imageCircle >= cropDiag ? 'covers-1.85' : 'vignettes';
}

const STATE_STYLE: Record<Verdict, { bg: string; text: string; label: string; sym: string }> = {
  covers:        { bg: 'bg-emerald-950/40 border-emerald-800', text: 'text-emerald-300', label: 'Covers', sym: '✓' },
  'covers-1.85': { bg: 'bg-amber-950/40 border-amber-800',    text: 'text-amber-300',   label: 'Covers @ 1.85+', sym: '◑' },
  vignettes:     { bg: 'bg-zinc-900 border-zinc-800',          text: 'text-zinc-500',     label: 'Vignettes', sym: '×' },
};

export function SensorCoverageList({ imageCircleMm }: { imageCircleMm: number }) {
  const rows = SENSORS_BY_DIAGONAL.map((s) => ({
    ...s,
    verdict: classify(imageCircleMm, s.width_mm, s.height_mm),
  }));

  return (
    <div className="overflow-hidden rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Sensor</th>
            <th className="px-3 py-2 text-right font-medium text-zinc-400">Active area</th>
            <th className="px-3 py-2 text-right font-medium text-zinc-400">Diag</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Coverage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const style = STATE_STYLE[s.verdict];
            return (
              <tr key={s.id} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
                <td className="px-3 py-2 text-zinc-200">{s.label}</td>
                <td className="px-3 py-2 text-right font-mono text-xs text-zinc-400">
                  {s.width_mm} × {s.height_mm} mm
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs text-zinc-400">
                  Ø{s.diagonal.toFixed(2)} mm
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs ${style.bg} ${style.text}`}>
                    <span aria-hidden>{style.sym}</span>
                    {style.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
