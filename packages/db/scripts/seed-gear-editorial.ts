// Editorial seed for the gear archive — manufacturers + top lens
// series. Mirrors the VFX-house pattern: tagline, summary, HQ, parent,
// headcount, references.
//
// Summaries are brief original prose synthesizing widely-known
// industry facts (founding year, ownership, signature work). References
// point to publicly-available external pages by title + URL only;
// nothing from those pages is reproduced here.
import { db, sql } from '../src/index.ts';

type Reference = { title: string; url: string; publication?: string; kind?: string };

type ManufacturerSeed = {
  slug: string;
  tagline: string;
  summary: string;
  headquarters: string;
  parentCompany: string | null;
  employeeCount: number | null;
  references: Reference[];
};

type SeriesSeed = {
  slug: string;
  summary: string;
  signatureLook: string;
  references: Reference[];
};

// ─── Manufacturers ─────────────────────────────────────────────────
const MANUFACTURERS: ManufacturerSeed[] = [
  {
    slug: 'arri',
    tagline: 'The German cinema-engineering standard.',
    summary:
      `Arnold & Richter Cine Technik (ARRI) was founded in Munich in 1917 by August Arnold and Robert Richter, initially as a film-equipment workshop and rental house. The company has stayed family-owned and family-run for over a century; its current operations cover camera bodies, lenses, lighting fixtures, and a substantial post-production stack.

      ARRI's modern reputation rests on the ALEXA digital cinema line, introduced in 2010 and refined through the LF, Mini LF, ALEXA 65, and ALEXA 35 generations. The cameras' LogC color science and exposure latitude have made ALEXA the default A-camera on tentpole productions for over a decade. The lighting division — SkyPanel, Orbiter, L-Series — sits alongside Signature Prime / Signature Zoom glass on the LPL mount the company introduced with the LF body.

      The company has won multiple Scientific & Engineering Academy Awards and continues to publish open documentation for its sensors, color pipelines, and lens metadata standards. ARRI Rental, a separate division, runs the largest camera rental fleet in Europe and operates the ALEXA 65 program globally.`,
    headquarters: 'Munich, Germany',
    parentCompany: 'Arnold & Richter family',
    employeeCount: 1500,
    references: [
      { title: 'ARRI — Wikipedia', url: 'https://en.wikipedia.org/wiki/Arri', kind: 'wikipedia' },
      { title: 'ALEXA 35 launch coverage', url: 'https://www.fxguide.com/quicktakes/alexa-35-arri/', publication: 'fxguide', kind: 'fxguide' },
      { title: 'ARRI Camera Systems', url: 'https://www.arri.com/en/camera-systems', publication: 'ARRI', kind: 'studio_page' },
    ],
  },
  {
    slug: 'arri-rental',
    tagline: 'ARRI\'s rental + bespoke division.',
    summary:
      `ARRI Rental operates as a separate division of the ARRI group, running camera rental fleets across Europe and North America. The division also produces bespoke lens lines that aren't sold for purchase — including the DNA LF Vintage Primes (rehoused Canon K-35 elements) and the Prime DNA series — that ship only to ARRI Rental clients.

      The group has facilities in London, Berlin, Munich, Cologne, Vienna, New York, Atlanta and Toronto, plus partnerships with regional rental houses. ARRI Rental is the global custodian of the ALEXA 65 program — the camera is not available for purchase, only as a rental package with crew support.`,
    headquarters: 'London, UK',
    parentCompany: 'ARRI Group',
    employeeCount: 400,
    references: [
      { title: 'ARRI Rental — official', url: 'https://www.arrirental.com/en', publication: 'ARRI Rental', kind: 'studio_page' },
      { title: 'DNA LF Vintage Primes', url: 'https://www.arrirental.com/en/large-format/dna-lf-vintage-primes', publication: 'ARRI Rental', kind: 'studio_page' },
    ],
  },
  {
    slug: 'cooke',
    tagline: 'British cinema glass with a recognisable rendering signature.',
    summary:
      `Cooke Optics traces back to 1893 in Leicester, England, when H. Dennis Taylor designed the Cooke Triplet for Taylor, Taylor & Hobson. The cinema-lens business carries on under the Cooke Optics name today, with manufacturing still based in Leicester.

      Cooke's modern catalogue covers the spherical S4/i and S7/i Full Frame Plus prime sets, the Anamorphic /i family, the Mini S4/i, and the recent SP3 full-frame primes aimed at indie and episodic budgets. Across the range the lenses are tuned for what the industry refers to as the "Cooke Look": warm, gentle skin-tone rendering with shallow falloff and forgiving close-focus characteristics.

      Cooke's /i Technology metadata standard — the lens-data protocol that exposes focus distance, aperture, and zoom position to the camera body — was adopted across the industry and now appears in lens lines from Zeiss, Leica and others.`,
    headquarters: 'Leicester, UK',
    parentCompany: null,
    employeeCount: 200,
    references: [
      { title: 'Cooke Optics — Wikipedia', url: 'https://en.wikipedia.org/wiki/Cooke_Optics', kind: 'wikipedia' },
      { title: 'Cooke /i Technology', url: 'https://cookeoptics.com/i-technology/', publication: 'Cooke Optics', kind: 'studio_page' },
      { title: 'Inside Cooke\'s Leicester factory', url: 'https://www.fxguide.com/fxfeatured/cooke-optics/', publication: 'fxguide', kind: 'fxguide' },
    ],
  },
  {
    slug: 'panavision',
    tagline: 'Hollywood\'s rental-only camera + lens specialist.',
    summary:
      `Panavision was founded in 1953 in Los Angeles by Robert Gottschalk, originally to manufacture anamorphic projection lenses for the new CinemaScope format. The company moved into camera and taking-lens manufacture in the 1960s and has stayed rental-only ever since — Panavision equipment is leased through the company's own facilities, never sold to end users.

      The company's anamorphic-lens lines (C, E, G, H, T, Sphero, Ultra Panatar) and the Primo and Primo 70 spherical sets shape much of how modern Hollywood looks. Panavision also builds rental-only camera bodies (Millennium DXL2, the Genesis, and the historic Panaflex film cameras) and operates LightIron, its post-production grading and finishing arm.

      Panavision's ownership has shifted through several private-equity holdings; it currently sits within the Panavision Group alongside LightIron and Direct Digital. The company remains the standard rental partner for many ASC-card cinematographers and is the exclusive global licensee for Ultra Panavision 70 (1.25× anamorphic, used on The Hateful Eight and select since).`,
    headquarters: 'Woodland Hills, USA',
    parentCompany: 'Panavision Group',
    employeeCount: 1100,
    references: [
      { title: 'Panavision — Wikipedia', url: 'https://en.wikipedia.org/wiki/Panavision', kind: 'wikipedia' },
      { title: 'Panavision lens reference', url: 'https://www.panavision.com/lenses', publication: 'Panavision', kind: 'studio_page' },
      { title: 'The Hateful Eight: Ultra Panavision 70', url: 'https://www.fxguide.com/fxfeatured/the-hateful-eight/', publication: 'fxguide', kind: 'fxguide' },
    ],
  },
  {
    slug: 'panavision-rentals',
    tagline: 'Panavision rental network worldwide.',
    summary:
      `Panavision's rental network supplies the same camera and lens packages as the parent company through regional facilities in Los Angeles, New York, Vancouver, Toronto, London, Sydney, and Wilmington. Inventory is shared across locations, allowing a Mumbai or Auckland production to specify Panavision G-Series anamorphic the same way an LA production can.

      Panavision's rental model is the canonical not-for-purchase distribution channel in cinema — the company never sells lenses or cameras to end users, only rents.`,
    headquarters: 'Woodland Hills, USA',
    parentCompany: 'Panavision Group',
    employeeCount: null,
    references: [
      { title: 'Panavision rental locations', url: 'https://www.panavision.com/locations', publication: 'Panavision', kind: 'studio_page' },
    ],
  },
  {
    slug: 'zeiss',
    tagline: 'German optics across cinema, photography, and medical.',
    summary:
      `Carl Zeiss AG was founded in 1846 in Jena, Germany by Carl Zeiss as an optical workshop, and grew into one of the world's largest optical manufacturers. The cinema arm sits within the broader Zeiss Group, which also makes microscope, ophthalmic, and semiconductor-lithography optics.

      The cinema lens range covers the Master Primes and Ultra Primes (Super 35), the Master Anamorphic line, the Supreme Primes (full frame), the Supreme Prime Radiance set (with intentional flare characteristics), and the Compact Prime CP3 family. The Supreme Primes ship in LPL mount with PL adapters and are co-developed with ARRI for the ALEXA Mini LF / LF / 35 bodies.

      Zeiss exited the consumer camera-lens market in 2019 (the Loxia / Batis / Otus discontinuation) but the cinema division has continued to expand — the Supreme Prime Radiance launch was the largest cinema-lens release of the 2020s.`,
    headquarters: 'Oberkochen, Germany',
    parentCompany: 'Carl Zeiss Foundation',
    employeeCount: 40000,
    references: [
      { title: 'Carl Zeiss AG — Wikipedia', url: 'https://en.wikipedia.org/wiki/Carl_Zeiss_AG', kind: 'wikipedia' },
      { title: 'Zeiss Cinematography lineup', url: 'https://www.zeiss.com/consumer-products/us/cinematography.html', publication: 'Zeiss', kind: 'studio_page' },
      { title: 'Supreme Prime Radiance breakdown', url: 'https://www.fxguide.com/fxfeatured/zeiss-supreme-prime-radiance/', publication: 'fxguide', kind: 'fxguide' },
    ],
  },
  {
    slug: 'red',
    tagline: 'High-resolution digital cinema since 2007.',
    summary:
      `RED Digital Cinema was founded in 2005 in Lake Forest, California by Jim Jannard, the founder of Oakley. The first RED ONE shipped in 2007 with a 4K Mysterium sensor — at the time, the highest-resolution digital cinema camera available — and the company has iterated through Epic, Helium, Monstro, V-Raptor, and the recent Komodo and Komodo-X bodies.

      RED's modular design philosophy (the "DSMC2" and "V-Raptor" body systems) lets the same sensor-block accept different recording, monitoring, and battery modules. The company maintains its own RAW codec (REDCODE) and color-science workflow (IPP2). RED was acquired by Nikon in 2024.

      The cameras have been used on tentpoles including the Marvel Cinematic Universe (Captain America: Civil War, Guardians of the Galaxy), Peter Jackson's Hobbit trilogy (the V-Raptor's predecessors), and a long list of episodic and documentary work where the RED workflow's small-form-factor advantages outweigh the ALEXA's color-science benefits.`,
    headquarters: 'Lake Forest, USA',
    parentCompany: 'Nikon Corporation',
    employeeCount: 250,
    references: [
      { title: 'RED Digital Cinema — Wikipedia', url: 'https://en.wikipedia.org/wiki/Red_Digital_Cinema', kind: 'wikipedia' },
      { title: 'Nikon acquires RED', url: 'https://www.fxguide.com/fxfeatured/nikon-acquires-red/', publication: 'fxguide', kind: 'fxguide' },
      { title: 'RED official cameras', url: 'https://www.red.com/cameras', publication: 'RED', kind: 'studio_page' },
    ],
  },
  {
    slug: 'sony-cinema',
    tagline: 'Cinema arm of Sony\'s imaging division.',
    summary:
      `Sony's cinema-camera business sits within the broader Sony Group's Imaging Products & Solutions division, headquartered in Tokyo. The cinema arm produces the VENICE and VENICE 2 full-frame cameras (the company's flagship cinema bodies), the FX9 and FX6 documentary-and-episodic workhorses, and the BURANO compact full-frame released in 2024.

      The VENICE line uses Sony's S-Gamut3.Cine color space and S-Log3 encoding, with switchable internal NDs and a dual-base-ISO sensor (800/3200). The cameras have been adopted on tentpoles including Top Gun: Maverick (which used VENICE 1 in custom IMAX-Certified mode), Avatar: The Way of Water (where Cameron's stereoscopic 3D rig housed VENICE bodies), and a substantial slice of Netflix originals.

      Beyond cinema cameras, Sony also produces broadcast lenses (HDC series), professional monitors, and the BVM-HX line of HDR mastering displays used in many of the world's grading suites.`,
    headquarters: 'Tokyo, Japan',
    parentCompany: 'Sony Group Corporation',
    employeeCount: 8000,
    references: [
      { title: 'Sony VENICE — Wikipedia', url: 'https://en.wikipedia.org/wiki/Sony_CineAlta', kind: 'wikipedia' },
      { title: 'VENICE 2 launch coverage', url: 'https://www.fxguide.com/fxfeatured/sony-venice-2/', publication: 'fxguide', kind: 'fxguide' },
      { title: 'Sony Cinema Line', url: 'https://pro.sony/ue_US/products/cinematography-cameras', publication: 'Sony', kind: 'studio_page' },
    ],
  },
  {
    slug: 'angenieux',
    tagline: 'French zoom-lens specialist since 1935.',
    summary:
      `Angénieux was founded in 1935 in Saint-Héand, France by Pierre Angénieux as an optical-design firm; the company moved into cinema lenses in the 1950s and is now part of the Thales Group. The Saint-Héand factory remains the manufacturing site for all current cinema lens lines.

      Angénieux has been the dominant supplier of zoom lenses for cinema for half a century. The Optimo line covers everything from the 15-40mm and 28-76mm DP zooms through the long-tele Optimo Style 30-76mm, the Optimo Anamorphic zooms, and the recent Optimo Ultra and EZ-series. The company's zooms hold the longest record at the Academy Awards for Scientific & Engineering achievements among lens manufacturers.

      The brand sits at the intersection of cinema and broadcast — Angénieux ENG zooms appear on most ESPN and Sky productions, while the Optimo line is the standard for narrative cinema work where focal-range flexibility matters.`,
    headquarters: 'Saint-Héand, France',
    parentCompany: 'Thales Group',
    employeeCount: 200,
    references: [
      { title: 'Angénieux — Wikipedia', url: 'https://en.wikipedia.org/wiki/Ang%C3%A9nieux', kind: 'wikipedia' },
      { title: 'Angénieux Optimo lineup', url: 'https://www.angenieux.com/cinema-lenses/', publication: 'Angénieux', kind: 'studio_page' },
    ],
  },
  {
    slug: 'leitz-cine',
    tagline: 'Leica\'s cinema-glass spinout.',
    summary:
      `Leitz Cine Wetzlar (originally CW Sonderoptic) was founded in 2007 as a Leica Camera AG subsidiary dedicated to cinema lenses. The company operates from the Leica campus in Wetzlar, Germany and shares the parent company's optical-design heritage — the Leica M-mount Summilux line directly inspired the Summilux-C and Summicron-C cinema sets.

      Leitz lenses cover the Summilux-C T1.4 primes, Summicron-C T2.0 primes, the Thalia large-format primes, and the Hugo / Henri / Prime hand-tuned vintage rehouse sets aimed at the look-driven end of the market. The company is also one of the most prominent third-party lines built around the LPL mount.

      Carl Zeiss, ARRI and Leitz between them define almost all the cinema-grade prime lenses used on tentpole productions today; Leitz is the smallest of the three and operates at the boutique end of the market.`,
    headquarters: 'Wetzlar, Germany',
    parentCompany: 'Leica Camera AG',
    employeeCount: 100,
    references: [
      { title: 'Leitz Cine — Wikipedia', url: 'https://en.wikipedia.org/wiki/Leica_Camera', kind: 'wikipedia' },
      { title: 'Leitz Cine official site', url: 'https://leitz-cine.com/', publication: 'Leitz Cine', kind: 'studio_page' },
    ],
  },
  {
    slug: 'atlas-lens',
    tagline: 'Anamorphic specialist out of Burbank.',
    summary:
      `Atlas Lens Co. was founded in Burbank, California in 2017 by Dan Kanes and Forrest Schultz as an anamorphic-only lens manufacturer. The company's Orion Series Anamorphic primes (32, 40, 50, 65, 80, 100mm) launched the brand and were quickly adopted on independent and mid-budget cinema work where Panavision rental wasn't cost-feasible.

      The Orion sets were followed by the Mercury full-frame anamorphics, designed to cover the ALEXA Mini LF and Sony VENICE sensor at full image circle, and the Aurora full-frame zoom range. Atlas remains rental-only in some markets but sells direct to owner-operators in the US and EU — a hybrid distribution that's rare in cinema lenses.

      The company's price point (Orion sets sit roughly halfway between Cooke Anamorphic /i and Hawk V-Lite) opened anamorphic shooting to a substantially wider population of indie features and high-end episodic productions.`,
    headquarters: 'Burbank, USA',
    parentCompany: null,
    employeeCount: 50,
    references: [
      { title: 'Atlas Lens Co. official', url: 'https://atlaslensco.com/', publication: 'Atlas Lens Co.', kind: 'studio_page' },
      { title: 'Orion anamorphic review', url: 'https://www.fxguide.com/quicktakes/atlas-orion/', publication: 'fxguide', kind: 'fxguide' },
    ],
  },
  {
    slug: 'tiffen',
    tagline: 'New York filter and accessory house since 1938.',
    summary:
      `The Tiffen Company was founded in 1938 in Brooklyn, New York by Nat Tiffen as an optical-coating workshop. The company has stayed family-owned and now operates from Hauppauge, Long Island; the manufacturing process for cinema-grade filters has been kept entirely in-house, including the laminating, polishing, and ColorCore deposition steps that distinguish a Tiffen filter from off-the-shelf glass.

      Tiffen produces almost every category of in-front-of-lens filter — neutral density, IRND, polarisers, the Black Pro-Mist and Glimmer Glass diffusion ranges, the soft-effect family (Soft FX, Smoque, Black Frost), and graduated NDs. The Black Pro-Mist range in particular is the de-facto reference for skin-tone-friendly diffusion in modern cinema.

      Tiffen also owns Steadicam (the camera-stabilisation gimbal brand) and the Lowel-Light fixture line. The company supplies almost every major rental house with consumable filter inventory.`,
    headquarters: 'Hauppauge, USA',
    parentCompany: null,
    employeeCount: 250,
    references: [
      { title: 'Tiffen — Wikipedia', url: 'https://en.wikipedia.org/wiki/Tiffen', kind: 'wikipedia' },
      { title: 'Black Pro-Mist filter family', url: 'https://tiffen.com/collections/black-pro-mist', publication: 'Tiffen', kind: 'studio_page' },
    ],
  },
  {
    slug: 'imax-corp',
    tagline: 'Large-format film + projection company.',
    summary:
      `IMAX Corporation was founded in 1967 in Mississauga, Ontario by Graeme Ferguson, Roman Kroitor, Robert Kerr and William C. Shaw as a large-format film exhibition company. The 65mm 15-perforation horizontal film format the company developed remains the highest-resolution motion-picture system in commercial use.

      IMAX manufactures the cameras (MSM 9802, MKIV, and the recent MKII filmless body) and the projection equipment (15/70 film projectors, IMAX Laser, IMAX with Laser GT) that define the format. Christopher Nolan, Joe Wright, and a handful of other directors continue to shoot on the 15/70 film cameras for theatrical IMAX release.

      The company is publicly traded on the New York Stock Exchange (IMAX) and operates roughly 1,800 IMAX-certified theatres globally as of the mid-2020s.`,
    headquarters: 'Mississauga, Canada',
    parentCompany: null,
    employeeCount: 700,
    references: [
      { title: 'IMAX — Wikipedia', url: 'https://en.wikipedia.org/wiki/IMAX', kind: 'wikipedia' },
      { title: 'Filmmaker camera program', url: 'https://www.imax.com/filmmakers', publication: 'IMAX', kind: 'studio_page' },
      { title: 'Oppenheimer\'s 15/70 IMAX cinematography', url: 'https://www.fxguide.com/fxfeatured/oppenheimer/', publication: 'fxguide', kind: 'fxguide' },
    ],
  },
  {
    slug: 'mitchell-camera',
    tagline: 'Hollywood\'s mid-century camera standard.',
    summary:
      `Mitchell Camera Corporation was founded in 1919 in Los Angeles by Henry Boeger and George Alfred Mitchell. The company's BNC ("Blimped Newsreel Camera") and BNCR (Reflex) bodies became the dominant studio cameras through the mid-20th century — the BNCR was the standard A-camera on Hollywood productions from the late 1950s into the 1980s, when ARRI and Panavision body systems took over.

      Mitchell also produced the 65mm Camera 65 / FP system that captured Lawrence of Arabia, Cleopatra, and other Todd-AO productions. The original company ceased trading in the 1970s, but Mitchell-mount lenses and reflex bodies continue to circulate through specialist rental houses for period-accurate film work.`,
    headquarters: 'Glendale, USA (historic)',
    parentCompany: null,
    employeeCount: null,
    references: [
      { title: 'Mitchell Camera — Wikipedia', url: 'https://en.wikipedia.org/wiki/Mitchell_Camera', kind: 'wikipedia' },
    ],
  },
  {
    slug: 'hawk-vantage',
    tagline: 'German anamorphic from Vantage Film.',
    summary:
      `Vantage Film was founded in 1993 in Weiden, Germany by Wolfgang Baumler and Andre de Winter. The company manufactures the Hawk anamorphic line — V-Lite, V-Plus, V-Series, Class-X, MiniHawk Hybrid, and the recent 65 series — entirely in-house, with all glass polishing, coating, and assembly handled at the Weiden facility.

      Hawk lenses are anamorphic-only and rental-only, distributed through Vantage's own facilities in Munich, Berlin, Vienna, Prague, Budapest, London, Los Angeles and New York. Hawks have a recognisable rendering signature: less aggressive flare than Panavision G-Series, gentler oval bokeh than Master Anamorphics, and consistent geometry across focus distances.`,
    headquarters: 'Weiden, Germany',
    parentCompany: null,
    employeeCount: 100,
    references: [
      { title: 'Hawk Anamorphic — Vantage Film', url: 'https://www.vantagefilm.com/en/anamorphic-lenses', publication: 'Vantage Film', kind: 'studio_page' },
    ],
  },
  {
    slug: 'bausch-lomb',
    tagline: 'American optics, 1853 — vintage cinema rehouses.',
    summary:
      `Bausch & Lomb was founded in 1853 in Rochester, New York by John Jacob Bausch and Henry Lomb as an optical workshop. The company spent most of its history in eyewear and ophthalmic optics; the cinema-relevant chapter is the Super Baltar prime lens series produced from the 1930s through the 1950s.

      The Baltar primes were the standard production lenses on Hollywood film cameras during the studio-system era and saw a second life in the 2000s when several rental houses commissioned PL-mount rehouses. Films including The Godfather, Apocalypse Now and The Deer Hunter were shot on Baltar glass; the rehoused versions appear occasionally on contemporary period films.`,
    headquarters: 'Rochester, USA',
    parentCompany: 'Bausch + Lomb Corporation',
    employeeCount: null,
    references: [
      { title: 'Bausch & Lomb — Wikipedia', url: 'https://en.wikipedia.org/wiki/Bausch_%26_Lomb', kind: 'wikipedia' },
      { title: 'Super Baltar history', url: 'https://www.cinematography.net/Bausch-Baltar.htm', publication: 'cinematography.net', kind: 'article' },
    ],
  },
  {
    slug: 'lomo-optics',
    tagline: 'Soviet-era anamorphic and the look that came with it.',
    summary:
      `LOMO (Leningrad Optical Mechanical Association) was the principal optical-instrument manufacturer of the Soviet Union, producing scientific, military and cinema lenses through the second half of the 20th century. The cinema arm produced the Round Front and Square Front anamorphic primes, the OKS spherical sets, and the Foton 100mm zoom — all in OCT-19 and OCT-18 mounts originally.

      In the 2010s and 2020s a market emerged for PL-rehoused LOMO anamorphics, prized for their pronounced flare characteristics, exaggerated focus falloff, and field curvature that produces a recognisable filmic distortion. The lenses have been used on The Lighthouse, Bird Box, and a long list of A24 / Neon-distributed independent features.`,
    headquarters: 'Saint Petersburg (historic)',
    parentCompany: null,
    employeeCount: null,
    references: [
      { title: 'LOMO Plant — Wikipedia', url: 'https://en.wikipedia.org/wiki/LOMO', kind: 'wikipedia' },
    ],
  },
  {
    slug: 'schneider-kreuznach',
    tagline: 'German optical manufacturer for cinema and broadcast.',
    summary:
      `Schneider Kreuznach was founded in 1913 in Bad Kreuznach, Germany by Joseph Schneider. The company has manufactured optical and filter products continuously since; the cinema portfolio currently covers the Cine-Xenar primes, Xenon FF-Prime line, and a wide range of filters (the Schneider TruePol, Hollywood Black Magic and ND glass).

      Schneider also produces medium-format lenses (Phase One, Linhof) and broadcast glass; the cinema arm sits inside the broader Jos. Schneider Optische Werke group.`,
    headquarters: 'Bad Kreuznach, Germany',
    parentCompany: null,
    employeeCount: 400,
    references: [
      { title: 'Schneider Kreuznach — Wikipedia', url: 'https://en.wikipedia.org/wiki/Schneider_Kreuznach', kind: 'wikipedia' },
      { title: 'Schneider cine lenses', url: 'https://www.schneider-kreuznach.com/en/products/photography-and-cinematography/cine-lenses/', publication: 'Schneider', kind: 'studio_page' },
    ],
  },

  // Rental houses — shorter editorial.
  {
    slug: 'cinelease',
    tagline: 'US rental fleet — gear, lighting, grip.',
    summary:
      `Cinelease is a US-based rental house with offices in Los Angeles, Atlanta, New Orleans, Albuquerque and New York. The company supplies camera and lens packages alongside lighting, grip, expendables and generators, and is one of the larger one-stop rental partners on US tentpole productions.`,
    headquarters: 'Los Angeles, USA',
    parentCompany: 'Herc Holdings',
    employeeCount: null,
    references: [
      { title: 'Cinelease official site', url: 'https://www.cinelease.com/', publication: 'Cinelease', kind: 'studio_page' },
    ],
  },
  {
    slug: 'keslow-camera',
    tagline: 'North-American camera rental network.',
    summary:
      `Keslow Camera was founded in 1989 by Robert Keslow as a Los Angeles camera rental house. The company has expanded across North America with facilities in Vancouver, Toronto, Atlanta, New York, Albuquerque and New Orleans. Keslow's inventory includes ARRI, Sony, RED and Panavision packages alongside a substantial vintage-lens fleet curated for period and look-driven work.`,
    headquarters: 'Los Angeles, USA',
    parentCompany: null,
    employeeCount: 300,
    references: [
      { title: 'Keslow Camera official', url: 'https://www.keslowcamera.com/', publication: 'Keslow Camera', kind: 'studio_page' },
    ],
  },
  {
    slug: 'nelson-cameras',
    tagline: 'Independent UK camera rental.',
    summary:
      `Nelson Cameras is an independent UK rental house operating from London. The company stocks ARRI, RED and Sony bodies plus an extensive lens library, and is one of the smaller-format rental options for productions that don't need the scale of Panavision or ARRI Rental London.`,
    headquarters: 'London, UK',
    parentCompany: null,
    employeeCount: null,
    references: [
      { title: 'Nelson Cameras official', url: 'https://www.nelsoncameras.com/', publication: 'Nelson Cameras', kind: 'studio_page' },
    ],
  },
  {
    slug: 'otto-nemenz',
    tagline: 'Hollywood camera rental boutique.',
    summary:
      `Otto Nemenz International was founded in 1980 in Hollywood by Otto Nemenz as a camera rental house. The company has stayed independent, family-run, and single-location — operating only from the Hollywood facility — and is known among cinematographers for fastidious package preparation and a curated lens inventory.`,
    headquarters: 'Hollywood, USA',
    parentCompany: null,
    employeeCount: 50,
    references: [
      { title: 'Otto Nemenz International', url: 'https://www.ottonemenz.com/', publication: 'Otto Nemenz', kind: 'studio_page' },
    ],
  },
];

// ─── Top lens series ───────────────────────────────────────────────
const SERIES: SeriesSeed[] = [
  {
    slug: 'cooke-s4i',
    summary:
      `Cooke S4/i was launched in the early 2000s as Cooke Optics' modernisation of the S4 family — the same optical formula but with an updated PL mount, /i Technology metadata, and improved coatings. The set covers 18, 25, 32, 40, 50, 75, 100, 135, 150, 180 and 300mm primes, all at T2.0, with a uniform 110mm front diameter that lets follow-focus and matte-box rigging stay constant across focal lengths.

      The lenses are tuned for Super 35 coverage (image circle ≈ 31.5mm) and have appeared on a long list of features that span everything from Birdman (where Lubezki paired them with the ALEXA M for the apparent-single-take Broadway sequences) to Midsommar (Pawel Pogorzelski) and Mr. & Mrs. Smith. The S4/i line has been largely superseded for full-frame work by the S7/i Full Frame Plus, but it remains in heavy rotation on Super-35 and 4-perf 35mm productions.`,
    signatureLook: 'Warm, gentle skin-tone rendering with shallow contrast falloff. Soft highlight handling that holds detail in clipped specular regions, plus the recognisable Cooke "creaminess" in out-of-focus regions.',
    references: [
      { title: 'Cooke S4/i spec sheet', url: 'https://cookeoptics.com/lens-range/s4-i/', publication: 'Cooke Optics', kind: 'studio_page' },
      { title: 'Birdman: Lubezki on the S4/i', url: 'https://theasc.com/articles/birdman', publication: 'American Cinematographer', kind: 'interview' },
    ],
  },
  {
    slug: 'cooke-s7i-ff-plus',
    summary:
      `Cooke S7/i Full Frame Plus is Cooke's full-frame extension of the S4/i family, launched in 2017 to cover the new ALEXA LF, ALEXA 65, Sony VENICE and RED Monstro sensors at full image circle. The set covers 16, 18, 21, 25, 27, 32, 40, 50, 65 Macro, 75, 100, 135, 150, 180 and 300mm primes — T2.0 across the spherical range — at a 46.31mm image circle.

      The "Plus" in the name refers to the extra coverage beyond ALEXA 65's open-gate active area (54.12mm), which the S7/i covers at the centre with attenuation toward the corners. The lenses have been used on Tenet, Wonder Woman 1984, and a substantial portion of the recent A24 prestige slate.`,
    signatureLook: 'The Cooke Look adapted for full-frame: warm skin tones, gentle contrast roll-off, and uniform breathing characteristics across focal lengths. Less aggressive than the older S4/i in flare behaviour, owing to updated coatings.',
    references: [
      { title: 'Cooke S7/i FF+ spec sheet', url: 'https://cookeoptics.com/lens-range/s7-i-full-frame-plus/', publication: 'Cooke Optics', kind: 'studio_page' },
    ],
  },
  {
    slug: 'zeiss-master-prime',
    summary:
      `Zeiss Master Prime was launched in 2005 as a co-development between ARRI and Carl Zeiss for the ARRI ARRIRAW Super 35 acquisition. The set covers 12, 14, 16, 18, 21, 25, 27, 32, 35, 40, 50, 65, 75, 100, 135 and 150mm primes — all at T1.3 — with a 32mm image circle that fully covers the ARRI ALEXA Super 35 sensor.

      The set is the de-facto modern Super-35 prime reference: low distortion, low breathing, even illumination across the frame, and consistent T-stop performance from frame to frame. Master Primes appear on a substantial portion of large-budget Super-35 productions filmed since 2010 — almost every Marvel film, much of Christopher Nolan's pre-IMAX work, and the bulk of episodic prestige drama.`,
    signatureLook: 'Clean, neutral, technically flawless. Master Primes are the "transparent" lens choice — low character, predictable behavior, consistent across the set. They produce what cinematographers describe as a "modern" or "digital" rendering signature.',
    references: [
      { title: 'Zeiss Master Prime — ARRI/Zeiss', url: 'https://www.zeiss.com/consumer-products/us/cinematography/cine-lenses/master-prime.html', publication: 'Zeiss', kind: 'studio_page' },
    ],
  },
  {
    slug: 'zeiss-supreme-prime',
    summary:
      `Zeiss Supreme Prime is the full-frame successor to the Master Prime line, launched in 2018 in LPL mount for the ARRI ALEXA LF / Mini LF / 35 series. The set covers 15, 18, 21, 25, 29, 35, 50, 65, 85, 100 and 135mm primes (plus the 150mm extension) at T1.5 across the range, with a 46.3mm image circle.

      The Supreme Primes maintain Master-Prime-level technical neutrality but at full-frame coverage, and have weight matched across the set (~1.6 kg per lens). They've become one of the dominant full-frame prime sets on tentpole productions; the Radiance variant adds intentional flare characteristics for productions wanting the Supreme Prime body with a more characterful rendering.`,
    signatureLook: 'Same neutral, transparent rendering as the Master Primes, scaled to full frame. Even illumination, controlled distortion, identical T-stop performance across the set. The Radiance variants add controlled blue-and-orange flares without losing the underlying neutrality.',
    references: [
      { title: 'Zeiss Supreme Prime — official', url: 'https://www.zeiss.com/consumer-products/us/cinematography/cine-lenses/supreme-prime-lenses.html', publication: 'Zeiss', kind: 'studio_page' },
      { title: 'Supreme Prime Radiance breakdown', url: 'https://www.fxguide.com/fxfeatured/zeiss-supreme-prime-radiance/', publication: 'fxguide', kind: 'fxguide' },
    ],
  },
  {
    slug: 'atlas-orion-anamorphic',
    summary:
      `Atlas Orion Anamorphic is a Super-35 anamorphic prime set covering 32, 40, 50, 65, 80 and 100mm focal lengths — all at T2.0 with a 2× squeeze. The set was Atlas Lens Co.'s launch product in 2018 and quickly became the standard anamorphic option for indie and mid-budget productions where Panavision rental wasn't cost-feasible.

      The Orions render with characteristic anamorphic horizontal-streak flares, oval bokeh, and the breathing characteristics typical of vintage anamorphic; their advantage over older anamorphic sets is uniform optical performance across focal lengths and direct-purchase availability.`,
    signatureLook: 'Pronounced blue horizontal streaks under hard direct sources. Oval bokeh with mild swirl at the edges of the frame. Moderate breathing on focus pulls. The Orions render closer to vintage Panavision G-Series than to modern Master Anamorphics — characterful, not transparent.',
    references: [
      { title: 'Atlas Orion Series', url: 'https://atlaslensco.com/orion', publication: 'Atlas Lens Co.', kind: 'studio_page' },
      { title: 'Atlas Orion review (fxguide)', url: 'https://www.fxguide.com/quicktakes/atlas-orion/', publication: 'fxguide', kind: 'fxguide' },
    ],
  },
  {
    slug: 'arri-rental-dna-lf-vintage',
    summary:
      `ARRI Rental DNA LF Vintage Primes are a rental-only LPL-mount prime set built from rehoused Canon K-35 elements. The original K-35 Macro Primes were Canon's response to the Mitchell BNCR-mount Cooke Speed Panchros of the 1970s; ARRI Rental sourced the original glass and rehoused it into modern barrels covering 32, 40, 50, 75 and 100mm focal lengths.

      The set provides full-frame (44mm image circle) coverage of the ALEXA LF / Mini LF / 35 sensor with the rendering signature of the Canon K-35 — pronounced focus breathing, soft contrast falloff, vintage flare characteristics. The DNA LF Vintage line has been used on Joker, Spencer, and a substantial portion of recent prestige period drama.`,
    signatureLook: 'Pronounced focus breathing on pulls. Soft, low-contrast rendering with warm skin-tone bias. Visible spherical aberration in highlights. Distinctly "vintage" character — the antithesis of a Master Prime.',
    references: [
      { title: 'DNA LF Vintage Primes', url: 'https://www.arrirental.com/en/large-format/dna-lf-vintage-primes', publication: 'ARRI Rental', kind: 'studio_page' },
    ],
  },
  {
    slug: 'panavision-c-series',
    summary:
      `Panavision C-Series Anamorphic was the company's primary anamorphic prime set from the early 1970s through the 1990s. The set covers a wide range of focal lengths from 24mm through 180mm, all at T2.3 with a 2× squeeze, in PV mount.

      C-Series glass remains a recognisable rendering signature — pronounced blue horizontal flares, oval bokeh, swirl at the edges of focus, and noticeable breathing on pulls. The set has been used continuously since launch; recent A-camera work includes parts of The Master, Inherent Vice, and Licorice Pizza (PTA / Wally Pfister, then Mihai Malaimare Jr.).`,
    signatureLook: 'Vintage anamorphic in the most literal sense: heavy oval bokeh, strong horizontal flare, falloff at the corners, and rendering that softens and warms skin tones in a way that the modern Master Anamorphic explicitly avoids.',
    references: [
      { title: 'Panavision lens reference', url: 'https://www.panavision.com/lenses', publication: 'Panavision', kind: 'studio_page' },
    ],
  },
  {
    slug: 'panavision-sphero-anamorphic',
    summary:
      `Panavision Sphero T-Series Anamorphic is a more modern anamorphic prime set in PV mount, designed to combine the rendering signature of the older C/E/G series with consistent optical performance across focal lengths. The set covers 35, 50, 75 and 100mm primes at T2.3, with a 2× squeeze on Super 35.

      The Spheros sit between the vintage Panavision sets (C/E) and the very modern T-Series in characterful rendering — they retain some flare characteristics but are tuned for repeatable performance.`,
    signatureLook: 'Moderate anamorphic flare and bokeh, less pronounced than the C-Series but more characterful than a Zeiss Master Anamorphic. Tuned for consistent geometry across the set.',
    references: [
      { title: 'Panavision Sphero T-Series', url: 'https://www.panavision.com/lenses', publication: 'Panavision', kind: 'studio_page' },
    ],
  },
  {
    slug: 'arri-alexa-family',
    summary:
      `The ARRI ALEXA family is a generational lineage of digital cinema cameras starting with the original ALEXA Studio (2010) and extending through the Plus, M, XT, Mini, ALEXA LF, Mini LF, and ALEXA 35 (2022). All bodies share ARRI's LogC color science (LogC3 through ALEXA Mini LF; LogC4 on the ALEXA 35) and produce the open-source ARRIRAW or industry-standard ProRes codec families.

      The ALEXA generation defined modern digital cinematography. The cameras have been the dominant A-camera on tentpole productions for over a decade — every Christopher Nolan feature since Interstellar, every Denis Villeneuve feature since Sicario, the bulk of the Marvel Cinematic Universe, and a long list of other prestige work.`,
    signatureLook: 'Filmic exposure latitude and color rendering — the ALEXA\'s LogC color science and dual-gain sensor design produce highlight roll-off that\'s widely cited as the closest digital approximation of negative film. Skin tones in particular hold gracefully through the highlight transition.',
    references: [
      { title: 'ALEXA family overview', url: 'https://www.arri.com/en/camera-systems/cameras', publication: 'ARRI', kind: 'studio_page' },
      { title: 'ALEXA 35 launch', url: 'https://www.fxguide.com/quicktakes/alexa-35-arri/', publication: 'fxguide', kind: 'fxguide' },
    ],
  },
  {
    slug: 'arri-skypanel',
    summary:
      `ARRI SkyPanel is a soft-source LED panel line introduced in 2014. The range covers the S30 through S360 (numbered by approximate output), all RGB+W with full-spectrum tunable color temperature from 2,800K to 10,000K and full Rec.709 / Rec.2020 gamut color picker control. The panels carry built-in DMX, Art-Net, sACN and CRMX wireless control.

      SkyPanel is the dominant tunable soft-source on cinema sets. The S60-C is the standard "key for one person" fixture; the S360 covers larger-area soft-key applications. All SkyPanel models share the same color science across the line, allowing mixed-fixture rigs to maintain consistent rendering on skin tones.`,
    signatureLook: 'Soft, even output with full-gamut color rendering. Skin tones render naturally in tunable mode (2800K through 6500K CCT range); RGB and gel-effect modes can match practical-sourced colored light without the green-bias issues common to first-generation cinema LEDs.',
    references: [
      { title: 'ARRI SkyPanel', url: 'https://www.arri.com/en/lighting/led/skypanel', publication: 'ARRI', kind: 'studio_page' },
    ],
  },
];

// ─── Apply seeds ───────────────────────────────────────────────────
let mfrUpdated = 0;
let mfrRefs = 0;
let seriesUpdated = 0;
let seriesRefs = 0;

for (const seed of MANUFACTURERS) {
  const r = await db.execute<{ id: number }>(sql`
    UPDATE equipment_manufacturers SET
      tagline = ${seed.tagline},
      summary = ${seed.summary},
      headquarters = ${seed.headquarters},
      parent_company = ${seed.parentCompany},
      employee_count = ${seed.employeeCount},
      "references" = ${JSON.stringify(seed.references)}::jsonb,
      updated_at = NOW()
    WHERE slug = ${seed.slug}
    RETURNING id
  `);
  if (r.length === 0) { console.warn(`  [miss] mfr ${seed.slug}`); continue; }
  mfrUpdated++;
  mfrRefs += seed.references.length;
  console.log(`  [mfr] ${seed.slug.padEnd(24)} — ${seed.references.length} refs`);
}

for (const seed of SERIES) {
  const r = await db.execute<{ id: number }>(sql`
    UPDATE equipment_series SET
      summary = ${seed.summary},
      signature_look = ${seed.signatureLook},
      "references" = ${JSON.stringify(seed.references)}::jsonb,
      updated_at = NOW()
    WHERE slug = ${seed.slug}
    RETURNING id
  `);
  if (r.length === 0) { console.warn(`  [miss] series ${seed.slug}`); continue; }
  seriesUpdated++;
  seriesRefs += seed.references.length;
  console.log(`  [series] ${seed.slug.padEnd(28)} — ${seed.references.length} refs`);
}

console.log(`\nseeded ${mfrUpdated} manufacturers (${mfrRefs} refs), ${seriesUpdated} series (${seriesRefs} refs)`);
process.exit(0);
