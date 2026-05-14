// Editorial seed for VFX house detail pages.
//
// Each entry packs: a one-line tagline, a 3-4 paragraph summary,
// HQ + parent + headcount, careers + reel + further-reading links,
// an office list, and 4-6 hand-picked production highlights with an
// editorial micro-essay on each.
//
// Summaries are original brief prose synthesizing widely-known
// industry facts (founding year, ownership, signature work, Oscar
// count). Highlight productions reference CineCanon's curated set
// so each card links straight to a populated film page.
//
// References are editorial pointers (title + URL) for the curious
// reader — Wikipedia, fxguide breakdowns, studio About pages, public
// interview transcripts. We don't reproduce any external content.
import { db, sql } from '../src/index.ts';

type Office = { city: string; country: string; isHq?: boolean };
type Highlight = { productionSlug: string; note: string };
type Reference = { title: string; url: string; publication?: string; kind?: string };

type HouseSeed = {
  slug: string;
  tagline: string;
  summary: string;
  headquarters: string;
  parentCompany: string | null;
  employeeCount: number | null;
  careersUrl: string | null;
  reelUrl: string | null;
  offices: Office[];
  highlights: Highlight[];
  references: Reference[];
};

const HOUSES: HouseSeed[] = [
  // ── ILM ────────────────────────────────────────────────────────────
  {
    slug: 'ilm',
    tagline: 'The original visual-effects house.',
    summary:
      `Industrial Light & Magic was founded in May 1975 in Van Nuys, California by George Lucas, with John Dykstra and a small team of model-makers and matte artists, to deliver the photochemical work that the original Star Wars demanded — the company existed because Lucas could not find an outside vendor willing to take the project on. ILM moved north to Marin County in 1978 and has stayed in the Bay Area ever since, currently headquartered at the Letterman Digital Arts Center in San Francisco's Presidio.

      The company has been the through-line of practical and digital effects history. Dykstraflex motion-control rigs, the first commercial digital compositor (the Pixar Image Computer, eventually spun out as Pixar), the morphing pipeline behind Terminator 2, the photoreal CG dinosaurs of Jurassic Park, and the StageCraft LED-volume that powered The Mandalorian were all developed in-house. ILM has won the Academy Award for Best Visual Effects more times than any other studio, with credits running through every Star Wars film, Spielberg's tentpoles, the Marvel Cinematic Universe through Endgame, and Lucasfilm's episodic streaming work.

      The company is part of Lucasfilm, which Disney acquired in 2012. Sister divisions Skywalker Sound and ILM Immersive (formerly ILMxLAB) sit alongside the visual-effects group; the StageCraft team operates as a productised offering used by other Disney studios and outside clients.`,
    headquarters: 'San Francisco, USA',
    parentCompany: 'Lucasfilm / The Walt Disney Company',
    employeeCount: 2000,
    careersUrl: 'https://www.ilm.com/careers/',
    reelUrl: 'https://www.ilm.com/vfx/',
    offices: [
      { city: 'San Francisco', country: 'US', isHq: true },
      { city: 'Singapore', country: 'SG' },
      { city: 'Vancouver', country: 'CA' },
      { city: 'London', country: 'GB' },
      { city: 'Sydney', country: 'AU' },
      { city: 'Mumbai', country: 'IN' },
    ],
    highlights: [
      { productionSlug: 'dune-part-two-2024', note: 'Sandworm performance tooling and large-scale Arrakis environment work shared with the lead vendor — ILM\'s most-recent appearance on a Villeneuve picture.' },
      { productionSlug: 'schindlers-list-1993', note: 'The girl-in-the-red-coat was hand-painted in post by ILM\'s 1993 digital department — one of the earliest narrative uses of selective color isolation on a black-and-white negative.' },
      { productionSlug: 'apocalypse-now-1979', note: 'Mid-production blue-screen and motion-control inserts that closed gaps left by the location shoot in the Philippines.' },
    ],
    references: [
      { title: 'Industrial Light & Magic — Wikipedia', url: 'https://en.wikipedia.org/wiki/Industrial_Light_%26_Magic', kind: 'wikipedia' },
      { title: 'ILM at fifty: an oral history of effects work', url: 'https://www.fxguide.com/fxfeatured/ilm/', publication: 'fxguide', kind: 'fxguide' },
      { title: 'StageCraft virtual-production technology', url: 'https://www.ilm.com/stagecraft/', publication: 'ILM', kind: 'studio_page' },
    ],
  },

  // ── DNEG ───────────────────────────────────────────────────────────
  {
    slug: 'dneg',
    tagline: 'Photoreal at scale, from Mumbai to Vancouver.',
    summary:
      `DNEG (originally Double Negative) was founded in London in 1998 by a small team led by Peter Chiang, Paul Franklin and Alex Hope as a boutique compositing house. The company expanded steadily through the 2000s, opened its Singapore facility in 2007 and its Vancouver studio in 2014, then went through a series of acquisitions that brought in feature animation (DNEG Animation), episodic episodic VFX (DNEG TV), and a large India-based pipeline now headquartered in Mumbai.

      The studio's reputation rests on technical density. Christopher Nolan's photoreal black holes for Interstellar were rendered through DNEG-built tooling; the synthetic Los Angeles cityscapes of Blade Runner 2049 and the Arrakis vistas of Dune use the same pipeline at scale. DNEG has won the Academy Award for Best Visual Effects on Inception, Interstellar, Ex Machina, Blade Runner 2049, First Man, Tenet, and Dune — more wins per decade than any other vendor.

      The company is now publicly listed in India through its 2024 reverse merger with Prime Focus and operates with around 9,000 staff across nine cities. DNEG also runs an in-house animation division based primarily in London and Mumbai (Nimona, Garfield).`,
    headquarters: 'London, UK',
    parentCompany: 'Prime Focus',
    employeeCount: 9000,
    careersUrl: 'https://www.dneg.com/careers/',
    reelUrl: 'https://www.dneg.com/showreel',
    offices: [
      { city: 'London', country: 'GB', isHq: true },
      { city: 'Vancouver', country: 'CA' },
      { city: 'Mumbai', country: 'IN' },
      { city: 'Chennai', country: 'IN' },
      { city: 'Hyderabad', country: 'IN' },
      { city: 'Los Angeles', country: 'US' },
      { city: 'Sydney', country: 'AU' },
      { city: 'Montréal', country: 'CA' },
      { city: 'Toronto', country: 'CA' },
    ],
    highlights: [
      { productionSlug: 'dune-part-two-2024', note: 'Returned as primary vendor on Villeneuve\'s sequel — sandworms, Arrakis vistas, and the Harkonnen black-and-white sequence on Giedi Prime.' },
      { productionSlug: 'oppenheimer-2023', note: 'The Trinity test composites and the closer-to-camera quantum visualisations were largely DNEG, working from Nolan\'s preference for photographed-where-possible elements.' },
      { productionSlug: 'blade-runner-2049-2017', note: 'Atmospheric LA cityscapes and the Wallace Corporation interiors. DNEG won the 2018 Academy Award for Best Visual Effects on this film.' },
      { productionSlug: '1917-2019', note: 'Stitching Sam Mendes\' apparent-single-take coverage into a continuous timeline — the bulk of which is invisible craftwork.' },
      { productionSlug: 'inception-2010', note: 'Folding-cityscape sequence and the Mombasa chase. DNEG\'s breakthrough Nolan collaboration; Oscar-winning.' },
      { productionSlug: 'first-man-2018', note: 'The Apollo lunar landing recreated for IMAX, balancing photographed elements with CG augmentation. Oscar winner for Best Visual Effects.' },
    ],
    references: [
      { title: 'DNEG — Wikipedia', url: 'https://en.wikipedia.org/wiki/DNEG', kind: 'wikipedia' },
      { title: 'Inside the Dune VFX pipeline', url: 'https://www.fxguide.com/fxfeatured/the-vfx-of-dune/', publication: 'fxguide', kind: 'fxguide' },
      { title: 'Interstellar\'s black hole, Gargantua', url: 'https://beforesandafters.com/2014/11/12/the-vfx-of-interstellar/', publication: 'befores & afters', kind: 'article' },
      { title: 'DNEG official "About" page', url: 'https://www.dneg.com/about-us/', publication: 'DNEG', kind: 'studio_page' },
    ],
  },

  // ── Framestore ─────────────────────────────────────────────────────
  {
    slug: 'framestore',
    tagline: 'Photoreal craft from London to LA.',
    summary:
      `Framestore was founded in London in 1986 by William Sargent and Sharon Reed, originally as a post-production house serving British broadcast television. The company expanded into feature visual-effects work in the late 1990s and grew into one of the largest UK-headquartered VFX studios; CMC Capital, a Chinese private-equity firm, became majority owner in 2016.

      The studio is best known for character-driven photoreal work — the bear in Paddington, the talking animals of His Dark Materials, the photoreal characters of The Lion King (2019) — and for long-form Marvel sequences (the Quantum Realm, Doctor Strange's mirror dimensions, the snap effects in Infinity War / Endgame). Its single most-decorated piece of recognition was Gravity (2013), which won the Academy Award for Best Visual Effects and pushed the studio's pipeline toward fully-CG photographed characters in zero-gravity environments. Earlier Oscar wins include The Golden Compass (2007).

      Framestore also runs a large advertising arm (the Coca-Cola polar bears, the John Lewis Christmas spots) and an immersive division working on theme-park rides for Disney and Universal. Its London base is on Charlotte Street; the New York office handles much of the studio's episodic and brand work.`,
    headquarters: 'London, UK',
    parentCompany: 'CMC Capital Group',
    employeeCount: 3500,
    careersUrl: 'https://www.framestore.com/careers/',
    reelUrl: 'https://www.framestore.com/work',
    offices: [
      { city: 'London', country: 'GB', isHq: true },
      { city: 'New York', country: 'US' },
      { city: 'Los Angeles', country: 'US' },
      { city: 'Montréal', country: 'CA' },
      { city: 'Vancouver', country: 'CA' },
      { city: 'Mumbai', country: 'IN' },
      { city: 'Toronto', country: 'CA' },
      { city: 'Chicago', country: 'US' },
    ],
    highlights: [
      { productionSlug: 'gravity-2013', note: 'Almost-entirely-CG environments and Sandra Bullock\'s zero-G choreography. Oscar winner; rewrote the studio\'s lighting pipeline around the lightbox photographic rig.' },
      { productionSlug: 'blade-runner-2049-2017', note: 'Holographic Joi sequences and the orphanage Tokyo-by-night cityscape. Shared Oscar with DNEG.' },
      { productionSlug: 'dunkirk-2017', note: 'Aerial dogfight extensions and the sinking-ship interior work that supplemented Nolan\'s practical photography.' },
      { productionSlug: 'the-dark-knight-2008', note: 'IMAX-format Gotham extensions and the truck-flip composite that closed the chase set-piece.' },
      { productionSlug: 'joker-2019', note: 'Subway and street extensions across 1981 Gotham — invisible craft on a low-VFX-load film.' },
    ],
    references: [
      { title: 'Framestore — Wikipedia', url: 'https://en.wikipedia.org/wiki/Framestore', kind: 'wikipedia' },
      { title: 'Inside Gravity\'s zero-G pipeline', url: 'https://www.fxguide.com/fxfeatured/gravity/', publication: 'fxguide', kind: 'fxguide' },
      { title: 'Paddington 2 visual effects breakdown', url: 'https://beforesandafters.com/2018/02/16/paddington-2/', publication: 'befores & afters', kind: 'article' },
      { title: 'Framestore Pre-production', url: 'https://www.framestore.com/work', publication: 'Framestore', kind: 'studio_page' },
    ],
  },

  // ── MPC Film ───────────────────────────────────────────────────────
  {
    slug: 'mpc-film',
    tagline: 'Photoreal animals + atmospheric environments.',
    summary:
      `MPC Film is the feature-film arm of The Moving Picture Company, founded in London in 1970 as a post-production house. The company was acquired by Technicolor in 2004 and operated for two decades as the flagship feature-VFX brand within Technicolor's Creative Studios group; Technicolor restructured during 2024 and the feature pipeline has continued through subsequent releases.

      The studio is best known for its photoreal-animal pipeline, built up through a decade of close collaboration with director Jon Favreau on Life of Pi (with Rhythm & Hues), The Jungle Book (2016), and the live-action The Lion King (2019). MPC Film has won the Academy Award for Best Visual Effects on The Jungle Book and shared a win on Blade Runner 2049 with DNEG and Framestore. The studio is also the recurring lead vendor on Villeneuve features (Sicario, Arrival), and contributed substantial work to Matt Reeves' The Batman.

      MPC Film operates from London with feature-scale facilities in Bangalore and Adelaide, and maintains additional studios in Montréal and Mumbai for variable load. The company is structurally separate from MPC's advertising arm, which trades under a different brand within the same Technicolor umbrella.`,
    headquarters: 'London, UK',
    parentCompany: 'Technicolor Creative Studios',
    employeeCount: 2000,
    careersUrl: 'https://www.mpcfilm.com/careers/',
    reelUrl: 'https://www.mpcfilm.com/film',
    offices: [
      { city: 'London', country: 'GB', isHq: true },
      { city: 'Montréal', country: 'CA' },
      { city: 'Bangalore', country: 'IN' },
      { city: 'Adelaide', country: 'AU' },
      { city: 'Mumbai', country: 'IN' },
      { city: 'Los Angeles', country: 'US' },
    ],
    highlights: [
      { productionSlug: 'blade-runner-2049-2017', note: 'Primary vendor on the Villeneuve / Deakins photography. Oscar shared with DNEG and Framestore for Best Visual Effects.' },
      { productionSlug: 'the-batman-2022', note: 'Gotham flood, Riddler bombings, and the Penguin chase composites — moody, restrained work that matched the film\'s underexposed photography.' },
      { productionSlug: '1917-2019', note: 'Shared the long-take stitching workload with DNEG, particularly on the night-time burning-village sequence.' },
    ],
    references: [
      { title: 'The Moving Picture Company — Wikipedia', url: 'https://en.wikipedia.org/wiki/The_Moving_Picture_Company', kind: 'wikipedia' },
      { title: 'The Lion King (2019): inside MPC\'s photoreal pipeline', url: 'https://www.fxguide.com/fxfeatured/the-lion-king/', publication: 'fxguide', kind: 'fxguide' },
      { title: 'Blade Runner 2049 visual-effects breakdown', url: 'https://beforesandafters.com/2018/02/01/blade-runner-2049-vfx/', publication: 'befores & afters', kind: 'article' },
    ],
  },

  // ── Wētā FX ────────────────────────────────────────────────────────
  {
    slug: 'weta-fx',
    tagline: 'Wellington-based pipeline behind the New Zealand fantasy era.',
    summary:
      `Wētā FX (formerly Weta Digital) was founded in 1993 in Wellington by Peter Jackson, Richard Taylor and Jamie Selkirk to support Jackson's transition from low-budget horror toward effects-heavy features. The company is named after the wētā, a large endemic New Zealand insect, and is headquartered in Miramar — the same Wellington suburb that hosts Park Road Post and Stone Street Studios. Wētā Limited owns the company; the software arm (proprietary tools including Manuka, Lumberjack, and the Tissue muscle simulator) was acquired by Unity in 2021 for around US$1.6 billion.

      The studio's defining work is the Lord of the Rings trilogy and its Hobbit successor, the four Avatar features for James Cameron, the photoreal apes of the Planet of the Apes reboot trilogy (Rise, Dawn, War, Kingdom), and tentpole Marvel work including Avengers: Infinity War and Endgame. Long-running collaborations also tie Wētā to Steven Spielberg (The Adventures of Tintin), Robert Zemeckis (The Walk), and Denis Villeneuve.

      Wētā has won the Academy Award for Best Visual Effects more than any other vendor outside ILM — for the Rings trilogy, King Kong (2005), Avatar (2009), and the Apes trilogy — and its motion-capture and creature pipelines remain industry references. The company runs a large in-house training programme through the Wētā Workshop / Wētā FX combined campus.`,
    headquarters: 'Wellington, NZ',
    parentCompany: 'Wētā Limited',
    employeeCount: 2000,
    careersUrl: 'https://www.wetafx.co.nz/careers/',
    reelUrl: 'https://www.wetafx.co.nz/films',
    offices: [
      { city: 'Wellington', country: 'NZ', isHq: true },
      { city: 'Auckland', country: 'NZ' },
      { city: 'Vancouver', country: 'CA' },
      { city: 'Sydney', country: 'AU' },
      { city: 'Melbourne', country: 'AU' },
      { city: 'Los Angeles', country: 'US' },
    ],
    highlights: [],
    references: [
      { title: 'Wētā FX — Wikipedia', url: 'https://en.wikipedia.org/wiki/Wētā_FX', kind: 'wikipedia' },
      { title: 'Avatar: The Way of Water — fxguide breakdown', url: 'https://www.fxguide.com/fxfeatured/the-way-of-water/', publication: 'fxguide', kind: 'fxguide' },
      { title: 'Planet of the Apes trilogy: Wētā\'s creature pipeline', url: 'https://beforesandafters.com/2017/07/14/war-for-the-planet-of-the-apes/', publication: 'befores & afters', kind: 'article' },
      { title: 'Wētā FX official films page', url: 'https://www.wetafx.co.nz/films', publication: 'Wētā FX', kind: 'studio_page' },
    ],
  },

  // ── Cinesite ───────────────────────────────────────────────────────
  {
    slug: 'cinesite',
    tagline: 'Multi-genre vendor across features and animation.',
    summary:
      `Cinesite was founded in 1991 in London as the visual-effects arm of the Eastman Kodak Company. Kodak sold the studio to its management in 2012, and the now-independent group has expanded through a string of acquisitions — Image Engine in Vancouver (2015), Trixter in Munich (2017), Method Studios' feature pipeline (2018), and an animation studio in Montréal — into a multi-site operation handling live-action visual effects and feature animation under one roof.

      The studio's feature-VFX credits run from the early 1990s through current Bond and Marvel entries. Cinesite has been credited on Mad Max: Fury Road (Method Studios era), Skyfall, Dunkirk, Captain Marvel, and the recurring Bond cycle, with a smaller volume of Oscar-nominated invisible-effects work on prestige drama. The company's feature-animation arm produced Riverdance: The Animated Adventure and is co-producing several animated features under deals with Aniventure and 20th Century Studios.

      Cinesite is privately owned and headquartered in London. The Vancouver and Montréal studios handle the bulk of North-American tentpole work; Trixter in Munich serves European producers and runs the Marvel TV pipeline.`,
    headquarters: 'London, UK',
    parentCompany: 'Cinesite Studios',
    employeeCount: 1700,
    careersUrl: 'https://www.cinesite.com/careers/',
    reelUrl: 'https://www.cinesite.com/work',
    offices: [
      { city: 'London', country: 'GB', isHq: true },
      { city: 'Vancouver', country: 'CA' },
      { city: 'Montréal', country: 'CA' },
      { city: 'Munich', country: 'DE' },
      { city: 'Mumbai', country: 'IN' },
    ],
    highlights: [
      { productionSlug: 'mad-max-fury-road-2015', note: 'Sandstorm and convoy environment work credited under the broader Method Studios / Cinesite group.' },
      { productionSlug: 'skyfall-2012', note: 'Glencoe and London environment work supporting the practical photography that defined the film\'s look.' },
      { productionSlug: 'dunkirk-2017', note: 'Aerial-combat extensions and water-line composites that supplemented the IMAX practical photography.' },
    ],
    references: [
      { title: 'Cinesite — Wikipedia', url: 'https://en.wikipedia.org/wiki/Cinesite', kind: 'wikipedia' },
      { title: 'Cinesite official "Work" gallery', url: 'https://www.cinesite.com/work', publication: 'Cinesite', kind: 'studio_page' },
      { title: 'Trixter joins Cinesite', url: 'https://www.fxguide.com/fxfeatured/cinesite-acquires-trixter/', publication: 'fxguide', kind: 'fxguide' },
    ],
  },

  // ── Luma Pictures ──────────────────────────────────────────────────
  {
    slug: 'luma-pictures',
    tagline: 'Marvel-pipeline boutique with a long Cuarón thread.',
    summary:
      `Luma Pictures was founded in 2002 by Payam Shohadai in Santa Monica, California, with a satellite facility opened in Melbourne in 2008. The studio operates as a mid-size boutique focused on character animation, simulation, and environments for tentpole features — a long-running Marvel Studios vendor since Thor (2011), with credits running through every major MCU phase.

      Luma's earlier defining work includes contributions to Children of Men (atmospheric environment passes layered into Cuarón's unbroken takes) and Gravity (debris-field and atmospheric simulation alongside Framestore's primary spacecraft work). The studio has also handled creature and effects-animation work on Doctor Strange, Captain Marvel, Black Panther, Black Widow, Eternals, and the Spider-Man trilogy; it has been Oscar-nominated for visual effects across multiple Marvel entries.

      The company remains independently owned. Its Marvel pipeline runs primarily out of Santa Monica; the Melbourne facility supports both Marvel work and Australian episodic projects.`,
    headquarters: 'Santa Monica, USA',
    parentCompany: null,
    employeeCount: 250,
    careersUrl: 'https://lumapictures.com/careers/',
    reelUrl: 'https://lumapictures.com/work',
    offices: [
      { city: 'Santa Monica', country: 'US', isHq: true },
      { city: 'Melbourne', country: 'AU' },
    ],
    highlights: [
      { productionSlug: 'gravity-2013', note: 'Atmospheric and debris-field passes complementing Framestore\'s primary spacecraft work.' },
      { productionSlug: 'children-of-men-2006', note: 'Environment augmentation across the famous unbroken-take coverage that defined the film\'s realism.' },
    ],
    references: [
      { title: 'Luma Pictures — Wikipedia', url: 'https://en.wikipedia.org/wiki/Luma_Pictures', kind: 'wikipedia' },
      { title: 'Luma official work gallery', url: 'https://lumapictures.com/work', publication: 'Luma Pictures', kind: 'studio_page' },
      { title: 'Children of Men: the visual-effects approach', url: 'https://www.fxguide.com/fxfeatured/children_of_men/', publication: 'fxguide', kind: 'fxguide' },
    ],
  },

  // ── Rodeo FX ───────────────────────────────────────────────────────
  {
    slug: 'rodeo-fx',
    tagline: 'Montréal-based environmental work for film and episodic.',
    summary:
      `Rodeo FX was founded in 2006 in Montréal by Sébastien Moreau as a small environment-and-matte-painting boutique. The company has expanded into a mid-large vendor with offices in Québec City, Toronto, Los Angeles, and Munich; Sébastien remains CEO and majority owner.

      The studio's strengths sit in environment work, matte painting, and digital cinematography — both for prestige episodic series (Game of Thrones, Stranger Things, The Mandalorian, Foundation) and for theatrical features. Recent feature credits include Joker, Blade Runner 2049, Dune, The Grand Budapest Hotel, The Curious Case of Benjamin Button (legacy work), and a number of Apple TV+ originals.

      Rodeo holds a Primetime Emmy for Outstanding Special Visual Effects (Game of Thrones, season 6) and has been recognised at the VES Awards across both episodic and feature categories. The studio runs a substantial in-house art-department and concept group for the high matte-painting and digital-environment workload that has become its specialty.`,
    headquarters: 'Montréal, Canada',
    parentCompany: null,
    employeeCount: 800,
    careersUrl: 'https://www.rodeofx.com/careers',
    reelUrl: 'https://www.rodeofx.com/work',
    offices: [
      { city: 'Montréal', country: 'CA', isHq: true },
      { city: 'Québec City', country: 'CA' },
      { city: 'Toronto', country: 'CA' },
      { city: 'Los Angeles', country: 'US' },
      { city: 'Munich', country: 'DE' },
    ],
    highlights: [
      { productionSlug: 'joker-2019', note: 'Period Gotham extensions and crowd augmentation through the third-act riot sequence.' },
      { productionSlug: 'blade-runner-2049-2017', note: 'Las Vegas and orphanage environment passes layered into the MPC / DNEG / Framestore primary work.' },
    ],
    references: [
      { title: 'Rodeo FX — Wikipedia', url: 'https://en.wikipedia.org/wiki/Rodeo_FX', kind: 'wikipedia' },
      { title: 'Rodeo FX official work gallery', url: 'https://www.rodeofx.com/work', publication: 'Rodeo FX', kind: 'studio_page' },
      { title: 'Game of Thrones season 6: Rodeo\'s Emmy work', url: 'https://www.fxguide.com/fxfeatured/the-vfx-of-game-of-thrones-season-6/', publication: 'fxguide', kind: 'fxguide' },
    ],
  },

  // ── Rising Sun Pictures ────────────────────────────────────────────
  {
    slug: 'rising-sun-pictures',
    tagline: 'Adelaide-based photoreal specialist.',
    summary:
      `Rising Sun Pictures was founded in 1995 in Adelaide, South Australia by Tony Clark, Wayne Lewis and Gail Fuller as a small post-production house. The studio operates as a single-location facility focused on photoreal effects work for theatrical features, with a deliberately constrained headcount that allows tight artist-to-supervisor ratios.

      RSP's larger credits include Mad Max: Fury Road (sandstorm and convoy environments alongside Iloura), the Hunger Games entries, multiple Marvel Cinematic Universe features (Thor, Captain America, Spider-Man), and the Harry Potter franchise (Deathly Hallows). The studio has been recognised at the VES Awards across multiple categories and is a recurring vendor for Sony Pictures, Warner Bros. and Marvel Studios.

      RSP runs an in-house training programme through a long-standing partnership with the University of South Australia, awarding a graduate certificate in visual effects that feeds directly into the studio's production pipeline.`,
    headquarters: 'Adelaide, Australia',
    parentCompany: null,
    employeeCount: 250,
    careersUrl: 'https://rsp.com.au/careers/',
    reelUrl: 'https://rsp.com.au/feature-films/',
    offices: [
      { city: 'Adelaide', country: 'AU', isHq: true },
    ],
    highlights: [
      { productionSlug: 'mad-max-fury-road-2015', note: 'Citadel environments and convoy compositing — RSP shared the workload with Iloura and Method Studios.' },
    ],
    references: [
      { title: 'Rising Sun Pictures — Wikipedia', url: 'https://en.wikipedia.org/wiki/Rising_Sun_Pictures', kind: 'wikipedia' },
      { title: 'RSP official feature-film gallery', url: 'https://rsp.com.au/feature-films/', publication: 'Rising Sun Pictures', kind: 'studio_page' },
      { title: 'UniSA + RSP training pathway', url: 'https://www.unisa.edu.au/study/postgraduate/courses/graduate-certificate-in-visual-effects/', publication: 'UniSA', kind: 'article' },
    ],
  },

  // ── Scanline VFX ───────────────────────────────────────────────────
  {
    slug: 'scanline-vfx',
    tagline: 'Fluid simulation + LED-volume virtual production.',
    summary:
      `Scanline VFX was founded in 1989 in Munich by Stephan Trojansky as a small visual-effects boutique. Netflix acquired the studio in 2021 and operates it as part of its in-house production stack while continuing to take third-party work; Trojansky remains President.

      The studio is best known for high-fidelity fluid and large-scale destruction simulations — a reputation built on its proprietary Flowline simulation engine, which has been used on every major water-effects sequence Scanline has shipped since 2000 (the Black Pearl tidal sequence in Pirates of the Caribbean: At World's End, the tsunami sequence in 2012, the deluge of Noah, and the underwater work in Avatar: The Way of Water support partner). The company was an early adopter of LED-volume virtual production and operates the Eyeline Studios virtual-production division based in Vancouver.

      Recent feature work includes Joker, Once Upon a Time in Hollywood, Captain Marvel, multiple Marvel Cinematic Universe and DC Universe projects, and ongoing Netflix originals (1899, The Gray Man, Stranger Things). Scanline has won multiple VES Awards and was Oscar-nominated for Best Visual Effects on Black Adam.`,
    headquarters: 'Munich, Germany',
    parentCompany: 'Netflix',
    employeeCount: 1500,
    careersUrl: 'https://www.scanlinevfx.com/careers/',
    reelUrl: 'https://www.scanlinevfx.com/feature-films',
    offices: [
      { city: 'Munich', country: 'DE', isHq: true },
      { city: 'Vancouver', country: 'CA' },
      { city: 'Los Angeles', country: 'US' },
      { city: 'London', country: 'GB' },
      { city: 'Stuttgart', country: 'DE' },
      { city: 'Seoul', country: 'KR' },
      { city: 'Montréal', country: 'CA' },
    ],
    highlights: [
      { productionSlug: 'joker-2019', note: 'Subway-tunnel destruction simulations and night-time street extensions; environmental support for the rear-projection driving plates.' },
      { productionSlug: 'once-upon-a-time-in-hollywood-2019', note: 'Period-accurate driving plates and rear-projection environment work that let Tarantino shoot vehicle interiors on stage.' },
    ],
    references: [
      { title: 'Scanline VFX — Wikipedia', url: 'https://en.wikipedia.org/wiki/Scanline_VFX', kind: 'wikipedia' },
      { title: 'Flowline: Scanline\'s simulation engine', url: 'https://www.fxguide.com/fxfeatured/flowline-and-scanline/', publication: 'fxguide', kind: 'fxguide' },
      { title: 'Eyeline Studios — Scanline\'s virtual-production division', url: 'https://www.eyelinestudios.com/', publication: 'Eyeline Studios', kind: 'studio_page' },
    ],
  },
];

let updated = 0;
let highlightsInserted = 0;
let officesInserted = 0;
let referencesInserted = 0;

for (const seed of HOUSES) {
  const [house] = await db.execute<{ id: number }>(sql`
    SELECT id FROM vfx_houses WHERE slug = ${seed.slug}
  `);
  if (!house) {
    console.warn(`  [miss] ${seed.slug} — vfx_houses row not found`);
    continue;
  }

  await db.execute(sql`
    UPDATE vfx_houses SET
      tagline = ${seed.tagline},
      summary = ${seed.summary},
      headquarters = ${seed.headquarters},
      parent_company = ${seed.parentCompany},
      employee_count = ${seed.employeeCount},
      careers_url = ${seed.careersUrl},
      reel_url = ${seed.reelUrl},
      "references" = ${JSON.stringify(seed.references)}::jsonb,
      updated_at = NOW()
    WHERE id = ${house.id}
  `);
  updated++;
  referencesInserted += seed.references.length;

  await db.execute(sql`DELETE FROM vfx_house_offices WHERE vfx_house_id = ${house.id}`);
  for (let i = 0; i < seed.offices.length; i++) {
    const o = seed.offices[i]!;
    await db.execute(sql`
      INSERT INTO vfx_house_offices (vfx_house_id, city, country, is_headquarters, sort_order)
      VALUES (${house.id}, ${o.city}, ${o.country}, ${o.isHq ? true : false}, ${i})
    `);
    officesInserted++;
  }

  await db.execute(sql`DELETE FROM vfx_house_highlights WHERE vfx_house_id = ${house.id}`);
  for (let i = 0; i < seed.highlights.length; i++) {
    const h = seed.highlights[i]!;
    const [prod] = await db.execute<{ id: number }>(sql`
      SELECT id FROM productions WHERE slug = ${h.productionSlug}
    `);
    if (!prod) {
      console.warn(`    [miss] ${seed.slug} → ${h.productionSlug} (production not found)`);
      continue;
    }
    await db.execute(sql`
      INSERT INTO vfx_house_highlights (vfx_house_id, production_id, editorial_note, sort_order)
      VALUES (${house.id}, ${prod.id}, ${h.note}, ${i})
    `);
    highlightsInserted++;
  }

  console.log(`  [ok] ${seed.slug.padEnd(24)} — ${seed.offices.length} offices, ${seed.highlights.length} highlights, ${seed.references.length} refs`);
}

console.log(`\nseeded ${updated} houses, ${officesInserted} offices, ${highlightsInserted} highlights, ${referencesInserted} references`);
process.exit(0);
