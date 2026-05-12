import { rssFetcher, htmlListFetcher, curatedListFetcher, type StudioConfig } from './ingest.ts';

/**
 * E-02 — VFX studio source registry. Each entry says how to fetch the
 * studio's filmography. Three patterns:
 *
 *   - WordPress RSS (e.g. ILM): use `rssFetcher(feedUrl)`.
 *   - Bespoke HTML grid (Wētā, DNEG, Framestore, MPC): need a custom
 *     parser. Slot reserved; ship adapters one at a time.
 *   - JSON-API (Rodeo FX, Scanline use Next.js — hydrated state in
 *     script tags): can be parsed without rendering the page.
 */
export const STUDIOS: Record<string, StudioConfig> = {
  ilm: {
    houseSlug: 'ilm',
    label: 'Industrial Light & Magic',
    fetcher: rssFetcher('https://www.ilm.com/vfx/feed/'),
    role: 'primary',
  },
  dneg: {
    houseSlug: 'dneg',
    label: 'DNEG',
    fetcher: htmlListFetcher(
      'https://www.dneg.com/our-work/',
      /href="\/our-work\/([a-z0-9-]+)"/i,
      'https://www.dneg.com/our-work/',
    ),
    role: 'primary',
  },
  framestore: {
    houseSlug: 'framestore',
    label: 'Framestore',
    fetcher: htmlListFetcher(
      'https://www.framestore.com/work',
      /href="\/work\/([a-z0-9-]+)"/i,
      'https://www.framestore.com/work/',
    ),
    role: 'primary',
  },
  // Wētā FX and MPC publish SPA-only filmography pages, and TMDb's
  // `with_companies` index credits the production studio rather
  // than the VFX house — so neither auto-source works. Curated
  // lists below cover the major VFX-supervisor work each house is
  // documented for in cited industry sources (befores & afters,
  // fxguide, IBC keynotes). Edit + re-run `vfx-studios:ingest --house weta`
  // to expand coverage.
  weta: {
    houseSlug: 'weta',
    label: 'Wētā FX',
    fetcher: curatedListFetcher([
      // Avatar saga + Cameron pipeline.
      { title: 'Avatar', year: 2009 },
      { title: 'Avatar: The Way of Water', year: 2022 },
      // LOTR + Hobbit (the foundational Wētā work).
      { title: 'The Lord of the Rings: The Fellowship of the Ring', year: 2001 },
      { title: 'The Lord of the Rings: The Two Towers', year: 2002 },
      { title: 'The Lord of the Rings: The Return of the King', year: 2003 },
      { title: 'The Hobbit: An Unexpected Journey', year: 2012 },
      { title: 'The Hobbit: The Desolation of Smaug', year: 2013 },
      { title: 'The Hobbit: The Battle of the Five Armies', year: 2014 },
      // Marvel.
      { title: 'Avengers: Infinity War', year: 2018 },
      { title: 'Avengers: Endgame', year: 2019 },
      { title: 'Black Panther', year: 2018 },
      // Other landmark.
      { title: 'King Kong', year: 2005 },
      { title: 'District 9', year: 2009 },
      { title: 'Furiosa: A Mad Max Saga', year: 2024 },
      { title: 'Wonka', year: 2023 },
    ]),
    role: 'primary',
  },
  mpc: {
    houseSlug: 'mpc',
    label: 'MPC (The Moving Picture Company)',
    fetcher: curatedListFetcher([
      // Villeneuve + Deakins pipeline.
      { title: 'Blade Runner 2049', year: 2017 },
      { title: '1917', year: 2019 },
      { title: 'Dune', year: 2021 },
      // Disney photoreal CG.
      { title: 'The Jungle Book', year: 2016 },
      { title: 'The Lion King', year: 2019 },
      { title: 'Mufasa: The Lion King', year: 2024 },
      { title: 'Maleficent', year: 2014 },
      { title: 'Maleficent: Mistress of Evil', year: 2019 },
      // Recent.
      { title: 'Wonka', year: 2023 },
      { title: 'Pinocchio', year: 2022 },
      { title: 'The Batman', year: 2022 },
    ]),
    role: 'primary',
  },
};
