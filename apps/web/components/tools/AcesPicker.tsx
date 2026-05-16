'use client';

import { useMemo, useState } from 'react';

/**
 * E-35 — ACES pipeline picker. Camera body → IDT mapping is the
 * non-trivial part; deliverable → ODT is mostly mechanical. Sources:
 * AcademySoftwareFoundation/OpenColorIO-Configs (CC BY-NC-ND 4.0
 * licensed config; we cite, don't redistribute) and per-camera ACES
 * IDT vendor docs.
 */

type Camera = {
  id: string;
  label: string;
  log: string;
  gamut: string;
  /** Default ACES 1.3 IDT name. EI variants exist for ARRI; this is base. */
  idt: string;
};

const CAMERAS: readonly Camera[] = [
  { id: 'arri-alexa-65',     label: 'ARRI ALEXA 65',          log: 'LogC3',  gamut: 'ARRI Wide Gamut 3', idt: 'ACES IDT.ARRI.LogC3.EI800' },
  { id: 'arri-alexa-mini-lf', label: 'ARRI ALEXA Mini LF',    log: 'LogC3',  gamut: 'ARRI Wide Gamut 3', idt: 'ACES IDT.ARRI.LogC3.EI800' },
  { id: 'arri-alexa-35',     label: 'ARRI ALEXA 35',          log: 'LogC4',  gamut: 'ARRI Wide Gamut 4', idt: 'ACES IDT.ARRI.LogC4' },
  { id: 'sony-venice-2',     label: 'Sony VENICE 2',           log: 'S-Log3', gamut: 'S-Gamut3.Cine',     idt: 'ACES IDT.Sony.SLog3.SGamut3Cine' },
  { id: 'sony-venice',       label: 'Sony VENICE (1)',         log: 'S-Log3', gamut: 'S-Gamut3.Cine',     idt: 'ACES IDT.Sony.SLog3.SGamut3Cine' },
  { id: 'red-vraptor-vv',    label: 'RED V-RAPTOR VV',         log: 'Log3G10',gamut: 'REDWideGamutRGB',    idt: 'ACES IDT.RED.Log3G10.RWG' },
  { id: 'red-monstro',       label: 'RED Monstro 8K VV',       log: 'Log3G10',gamut: 'REDWideGamutRGB',    idt: 'ACES IDT.RED.Log3G10.RWG' },
  { id: 'red-helium',        label: 'RED Helium 8K',           log: 'Log3G10',gamut: 'REDWideGamutRGB',    idt: 'ACES IDT.RED.Log3G10.RWG' },
  { id: 'panavision-dxl2',   label: 'Panavision Millennium DXL2', log: 'Log3G10', gamut: 'REDWideGamutRGB', idt: 'ACES IDT.RED.Log3G10.RWG' },
  { id: 'blackmagic-ursa',   label: 'Blackmagic URSA Mini Pro 12K', log: 'Blackmagic Film Gen 5', gamut: 'Blackmagic Wide Gamut Gen 5', idt: 'ACES IDT.BMD.Gen5.BMDFilmGen5' },
];

type Working = { id: string; label: string; description: string };

const WORKING: readonly Working[] = [
  { id: 'aces-cct',  label: 'ACEScct',     description: 'Log encoding for grading; gentle toe in shadows. Default for most colorists.' },
  { id: 'aces-cg',   label: 'ACEScg',      description: 'Linear AP1 working space; preferred for VFX and CGI compositing.' },
  { id: 'aces-2065', label: 'ACES2065-1',  description: 'Archival linear AP0 master; not a working space — used for interchange.' },
];

type Deliverable = { id: string; label: string; odt: string; viewing: string };

const DELIVERABLES: readonly Deliverable[] = [
  { id: 'rec709-sdr',     label: 'Rec.709 SDR (theatrical / streaming SDR)',    odt: 'ACES Output Transform — Rec.709 D65',           viewing: '100 nits, gamma 2.4' },
  { id: 'rec2020-pq',     label: 'Rec.2020 HDR PQ (HDR10 / Dolby Vision)',      odt: 'ACES Output Transform — Rec.2020 D65 ST.2084',  viewing: '1000 nits, ST.2084' },
  { id: 'p3-d65-sdr',     label: 'DCI-P3 D65 SDR (cinema digital projection)',  odt: 'ACES Output Transform — P3 D65',                viewing: '48 nits, gamma 2.6' },
  { id: 'p3-d65-pq',      label: 'DCI-P3 D65 HDR PQ (Dolby Cinema)',            odt: 'ACES Output Transform — P3 D65 ST.2084',        viewing: '108 nits, ST.2084' },
  { id: 'srgb-d65-sdr',   label: 'sRGB D65 SDR (web / desktop preview)',        odt: 'ACES Output Transform — sRGB D65',              viewing: '80 nits, sRGB EOTF' },
];

export function AcesPicker() {
  const [cameraId, setCameraId] = useState<string>('arri-alexa-mini-lf');
  const [workingId, setWorkingId] = useState<string>('aces-cct');
  const [deliverableId, setDeliverableId] = useState<string>('rec709-sdr');

  const camera = CAMERAS.find((c) => c.id === cameraId)!;
  const working = WORKING.find((w) => w.id === workingId)!;
  const deliverable = DELIVERABLES.find((d) => d.id === deliverableId)!;

  // Step components for the chain diagram.
  const steps = useMemo(() => [
    { label: 'Camera log',       value: camera.log },
    { label: 'Camera gamut',     value: camera.gamut },
    { label: 'IDT',              value: camera.idt,        accent: true },
    { label: 'Working space',    value: working.label,     accent: true },
    { label: 'ODT',              value: deliverable.odt,   accent: true },
    { label: 'Deliverable',      value: deliverable.label.split(' (')[0]! },
  ], [camera, working, deliverable]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Camera</span>
          <select
            value={cameraId}
            onChange={(e) => setCameraId(e.target.value)}
            className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
          >
            {CAMERAS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Working space</span>
          <select
            value={workingId}
            onChange={(e) => setWorkingId(e.target.value)}
            className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
          >
            {WORKING.map((w) => (
              <option key={w.id} value={w.id}>{w.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Deliverable</span>
          <select
            value={deliverableId}
            onChange={(e) => setDeliverableId(e.target.value)}
            className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
          >
            {DELIVERABLES.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Pipeline diagram */}
      <div role="status" aria-live="polite" aria-label="ACES pipeline result" className="overflow-x-auto">
        <div className="flex min-w-max items-stretch gap-2 rounded border border-zinc-800 bg-zinc-900/40 p-3">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-stretch gap-2">
              <div className={`flex flex-col justify-between rounded border px-3 py-2 min-w-[140px] ${s.accent ? 'border-amber-700 bg-amber-950/30' : 'border-zinc-700 bg-zinc-950'}`}>
                <div className="text-[10px] uppercase tracking-wide text-zinc-300">{s.label}</div>
                <div className={`mt-1 font-mono text-xs ${s.accent ? 'text-amber-300' : 'text-zinc-200'}`}>{s.value}</div>
              </div>
              {i < steps.length - 1 && (
                <div aria-hidden="true" className="flex items-center text-zinc-400">→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded border border-zinc-800 p-3">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Working-space note</div>
          <p className="mt-1 text-zinc-300">{working.description}</p>
        </div>
        <div className="rounded border border-zinc-800 p-3">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Deliverable viewing</div>
          <p className="mt-1 text-zinc-300">{deliverable.viewing}</p>
        </div>
      </div>
    </div>
  );
}
