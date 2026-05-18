import { validateSpecs } from '@bts/db/schema/specs';

interface SpecsTableProps {
  category: string;
  specs: unknown;
}

// Per-key display labels + value renderers. Keys not listed here fall
// back to underscore-stripped key + raw value.
type Renderer = { label: string; render?: (v: unknown) => React.ReactNode };
const LENS_FIELDS: Record<string, Renderer> = {
  focal_length_mm:    { label: 'Focal length',    render: (v) => `${v} mm` },
  max_aperture_t:     { label: 'Max aperture',    render: (v) => `T${v}` },
  min_aperture_t:     { label: 'Min aperture',    render: (v) => `T${v}` },
  image_circle_mm:    { label: 'Image circle',    render: (v) => `${v} mm` },
  lens_format:        { label: 'Format',          render: (v) => ({
    s16: 'Super 16',
    s35: 'Super 35',
    full_frame: 'Full Frame',
    full_frame_plus: 'Full Frame Plus',
    large_format: 'Large Format (LPL)',
    imax: 'IMAX 65mm',
    vista_vision: 'VistaVision',
  } as Record<string, string>)[String(v)] ?? String(v) },
  is_anamorphic:      { label: 'Anamorphic',      render: (v) => v ? 'Yes' : 'No' },
  anamorphic_squeeze: { label: 'Squeeze',         render: (v) => v != null ? `${v}×` : '—' },
  minimum_focus_m:    { label: 'Close focus',     render: (v) => `${v} m` },
  weight_kg:          { label: 'Weight',          render: (v) => `${v} kg` },
  front_diameter_mm:  { label: 'Front Ø',         render: (v) => `${v} mm` },
  mount:              { label: 'Mount' },
  breathing:          { label: 'Focus breathing' },
  focus_throw_deg:    { label: 'Focus throw',     render: (v) => `${v}°` },
  mtf_chart_url:      { label: 'MTF chart',       render: (v) => (
    <a href={String(v)} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
      View MTF chart →
    </a>
  ) },
  iris_blade_count:   { label: 'Iris blades',     render: (v) => `${v}` },
  character_notes:    { label: 'Character' },
  year_introduced:    { label: 'Year introduced', render: (v) => `${v}` },
  filter_thread_mm:   { label: 'Filter thread',   render: (v) => `${v} mm` },
  length_mm:          { label: 'Length',          render: (v) => `${v} mm` },
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

// E-15 — camera benchmarks render with explicit units.
const CAMERA_FIELDS: Record<string, Renderer> = {
  sensor_size:           { label: 'Sensor',          render: (v) => String(v).replace(/_/g, ' ') },
  sensor_resolution_max: { label: 'Max resolution' },
  max_frame_rate_fps:    { label: 'Max frame rate',  render: (v) => `${v} fps` },
  internal_codecs:       { label: 'Internal codecs', render: (v) => Array.isArray(v) ? v.join(', ') : String(v) },
  mount:                 { label: 'Mount' },
  color_science:         { label: 'Color science' },
  weight_kg:             { label: 'Weight',          render: (v) => `${v} kg` },
  dynamic_range_stops:        { label: 'Dynamic range',     render: (v) => `${v} stops` },
  rolling_shutter_ms:         { label: 'Rolling shutter',   render: (v) => `${v} ms` },
  latitude_above_key_stops:   { label: 'Latitude above key', render: (v) => `+${v} stops` },
  latitude_below_key_stops:   { label: 'Latitude below key', render: (v) => `−${v} stops` },
  benchmark_url:              { label: 'Lab report',         render: (v) => (
    <a href={String(v)} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
      View lab report →
    </a>
  ) },
  native_iso:                 { label: 'Native ISO',
    render: (v) => Array.isArray(v) ? `Dual: ${v[0]} / ${v[1]}` : `${v}` },
  sensor_w_mm:                { label: 'Sensor width',     render: (v) => `${v} mm` },
  sensor_h_mm:                { label: 'Sensor height',    render: (v) => `${v} mm` },
  olpf_type:                  { label: 'OLPF' },
  recording_media:            { label: 'Recording media',  render: (v) => Array.isArray(v) ? v.join(', ') : String(v) },
  log_curves:                 { label: 'Log curves',       render: (v) => Array.isArray(v) ? v.join(', ') : String(v) },
  bit_depth:                  { label: 'Bit depth',        render: (v) => `${v}-bit` },
  max_fps_by_resolution:      { label: 'Max FPS / res',
    render: (v) => typeof v === 'object' && v
      ? Object.entries(v as Record<string, number>).map(([res, fps]) => `${res}: ${fps}`).join(' · ')
      : String(v) },
  built_in_nd:                { label: 'Built-in ND' },
  power_input:                { label: 'Power input' },
  year_introduced:            { label: 'Year introduced',  render: (v) => `${v}` },
  dp_notes:                   { label: 'DP notes' },
};

const LIGHTING_FIELDS: Record<string, Renderer> = {
  fixture_kind:                { label: 'Type', render: (v) => String(v).replace(/_/g, ' ') },
  color_temperature_range_k:   { label: 'CCT (text)', render: (v) => `${v} K` },
  cct_min_k:                   { label: 'CCT min', render: (v) => `${v} K` },
  cct_max_k:                   { label: 'CCT max', render: (v) => `${v} K` },
  cri:                         { label: 'CRI', render: (v) => `${v}` },
  tlci:                        { label: 'TLCI', render: (v) => `${v}` },
  duv:                         { label: 'Δuv', render: (v) => `${v}` },
  beam_angle_min_deg:          { label: 'Beam ° min', render: (v) => `${v}°` },
  beam_angle_max_deg:          { label: 'Beam ° max', render: (v) => `${v}°` },
  power_watts:                 { label: 'Power', render: (v) => `${v} W` },
  dmx_channels:                { label: 'DMX channels', render: (v) => `${v}` },
  lux_at_3m:                   { label: 'Lux @ 3m', render: (v) => `${v} lx` },
  max_output_lumens:           { label: 'Max output', render: (v) => `${v} lm` },
  rgb_color_mixing:            { label: 'RGB mixing', render: (v) => v ? 'Yes' : 'No' },
  power_inputs:                { label: 'Power inputs', render: (v) => Array.isArray(v) ? v.join(', ') : String(v) },
  ip_rating:                   { label: 'IP rating' },
  form_factor:                 { label: 'Form factor' },
  weight_kg:                   { label: 'Weight', render: (v) => `${v} kg` },
  year_introduced:             { label: 'Year introduced', render: (v) => `${v}` },
  gaffer_notes:                { label: 'Gaffer notes' },
};

function getRenderer(category: string, key: string): Renderer | undefined {
  if (category === 'lens_set') return LENS_FIELDS[key];
  if (category === 'camera_body') return CAMERA_FIELDS[key];
  if (category === 'lighting_fixture') return LIGHTING_FIELDS[key];
  return undefined;
}

export function SpecsTable({ category, specs }: SpecsTableProps) {
  let parsed: Record<string, unknown>;
  try {
    parsed = validateSpecs(category, specs) as Record<string, unknown>;
  } catch {
    parsed = (typeof specs === 'object' && specs !== null)
      ? specs as Record<string, unknown>
      : {};
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) return null;

  const knownKeys = new Set(Object.keys(parsed));
  const rawEntries = typeof specs === 'object' && specs !== null
    ? Object.entries(specs as Record<string, unknown>)
    : [];
  const unknownEntries = rawEntries.filter(([k]) => !knownKeys.has(k));

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Spec</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value], i) => {
            const r = getRenderer(category, key);
            return (
              <tr key={key} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
                <td className="px-3 py-2 text-zinc-400">{r?.label ?? key.replace(/_/g, ' ')}</td>
                <td className="px-3 py-2 text-zinc-200">
                  {r?.render ? r.render(value) : formatValue(value)}
                </td>
              </tr>
            );
          })}
          {unknownEntries.map(([key, value], i) => (
            <tr key={`unknown-${key}`} className={(entries.length + i) % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
              <td className="px-3 py-2 text-zinc-500">{key.replace(/_/g, ' ')}</td>
              <td className="px-3 py-2 text-zinc-500">{formatValue(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
