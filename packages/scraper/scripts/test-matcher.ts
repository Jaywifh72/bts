import { matchProductionByContext } from '../src/scrapers/matcher.ts';

(async () => {
  const cases: Array<[string, number | null, string]> = [
    ['Dune: Part Two — VFX breakdown by DNEG', 2024, 'Dune Part Two'],
    ['Inside Oppenheimer practical effects work', 2023, 'Oppenheimer'],
    ['Cinematography of Interstellar revisited', null, 'Interstellar'],
    ['FMX is around the corner', null, 'false-positive guard'],
    ['Apple announces new Vision Pro features', null, 'unrelated article'],
    ['Wonder Man trailer reveals new VFX', null, 'single-word title without year — should NOT match Wonder'],
    ['Wonder revisited: 2017 retrospective', 2017, 'single-word title with exact year — should match Wonder'],
  ];
  for (const [title, year, label] of cases) {
    const r = await matchProductionByContext(title, year);
    console.log('[' + label + '] "' + title + '" => ' + (r ?? 'null'));
  }
  process.exit(0);
})();
