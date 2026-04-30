import { sources } from '../../schema/index.ts';
import type { SeedDb } from '../run.ts';

type SourceSeed = {
  slug: string;
  kind: 'magazine_article' | 'press_release' | 'epk_document' | 'interview_transcript'
      | 'book' | 'podcast' | 'commentary_track' | 'documentary'
      | 'manufacturer_product_page' | 'social_media' | 'personal_communication'
      | 'forum_post' | 'wiki' | 'other';
  title: string;
  publication?: string;
  author?: string;
  publishedAt?: string; // YYYY-MM-DD
  url?: string;
  archiveUrl?: string;
  notes?: string;
};

export const sourcesData: SourceSeed[] = [
  // Dune: Part Two
  {
    slug: 'ac-fraser-dune-2024',
    kind: 'magazine_article',
    title: 'Sequel and Saga: Greig Fraser, ASC, ACS Returns to Arrakis for Dune: Part Two',
    publication: 'American Cinematographer',
    author: 'Iain Marcks',
    publishedAt: '2024-03-01',
    notes: 'Covers ARRI Rental DNA LF Vintage Primes, ALEXA 65, on-location Jordan/Abu Dhabi shooting.',
  },
  {
    slug: 'team-deakins-fraser-dune-2024',
    kind: 'podcast',
    title: 'Team Deakins — Greig Fraser on Dune Part Two',
    publication: 'Team Deakins Podcast',
    publishedAt: '2024-03-15',
    notes: 'Fraser discusses lens choices, lighting design, and working with Villeneuve again.',
  },
  {
    slug: 'ymcinema-dna-lf-vintage-2024',
    kind: 'magazine_article',
    title: 'How ARRI Rental DNA LF Vintage Primes Were Used on Dune Part Two',
    publication: 'Y.M.Cinema Magazine',
    publishedAt: '2024-03-10',
    notes: 'Technical breakdown of the Canon K-35 rehouse in LF coverage format.',
  },
  {
    slug: 'dune2-bts-warner',
    kind: 'documentary',
    title: 'Dune: Part Two — Behind the Scenes (Warner Bros. press kit)',
    publication: 'Warner Bros.',
    notes: 'EPK featurette covering production design, camera, and visual effects.',
  },
  {
    slug: 'villeneuve-dune2-interview-2024',
    kind: 'interview_transcript',
    title: 'Denis Villeneuve on the visual language of Dune Part Two',
    publication: 'Variety',
    publishedAt: '2024-02-25',
    notes: 'Director discusses thematic visual contrasts between Harkonnen and Fremen sequences.',
  },

  // Oppenheimer
  {
    slug: 'ac-hoytema-oppenheimer-2023',
    kind: 'magazine_article',
    title: 'Critical Mass: Shooting Christopher Nolan\'s Oppenheimer in IMAX 65mm',
    publication: 'American Cinematographer',
    publishedAt: '2023-08-01',
    notes: 'Covers IMAX 65mm and 15-perf 65mm, B&W sequence with custom Kodak stock.',
  },
  {
    slug: 'definition-mag-oppenheimer-2023',
    kind: 'magazine_article',
    title: 'Hoyte van Hoytema on Shooting Oppenheimer in IMAX 65mm',
    publication: 'Definition Magazine',
    publishedAt: '2023-07-21',
  },
  {
    slug: 'imax-blog-oppenheimer-2023',
    kind: 'manufacturer_product_page',
    title: 'IMAX Behind the Frame: Oppenheimer in 65mm and 70mm B&W',
    publication: 'IMAX',
    publishedAt: '2023-07-15',
    notes: 'IMAX-published explainer about the custom B&W 70mm stock made by Kodak for Oppenheimer.',
  },
  {
    slug: 'nolan-imax-interview-2023',
    kind: 'interview_transcript',
    title: 'Christopher Nolan on shooting Oppenheimer in IMAX',
    publication: 'IndieWire',
    publishedAt: '2023-07-19',
  },
  {
    slug: 'oppenheimer-bts-universal',
    kind: 'documentary',
    title: 'Building Oppenheimer (Universal press kit)',
    publication: 'Universal Pictures',
    notes: 'Press kit BTS featurette, covers practical Trinity sequence filming.',
  },

  // The Brutalist
  {
    slug: 'ac-crawley-brutalist-2024',
    kind: 'magazine_article',
    title: 'Lol Crawley, BSC on Reviving VistaVision for The Brutalist',
    publication: 'American Cinematographer',
    publishedAt: '2024-12-15',
    notes: 'Discusses sourcing and modifying VistaVision cameras, lenses, and shooting 1.33:1 for 2.39:1 optical horizontal squeeze output.',
  },
  {
    slug: 'film-comment-brutalist-vistavision',
    kind: 'magazine_article',
    title: 'The Brutalist and the VistaVision Revival',
    publication: 'Film Comment',
    publishedAt: '2024-12-01',
  },
  {
    slug: 'corbet-brutalist-interview-2024',
    kind: 'interview_transcript',
    title: 'Brady Corbet on shooting The Brutalist on VistaVision',
    publication: 'IndieWire',
    publishedAt: '2024-09-04',
    notes: 'Director discusses the decision to shoot on VistaVision at Venice Film Festival premiere.',
  },

  // Poor Things
  {
    slug: 'ac-ryan-poor-things-2023',
    kind: 'magazine_article',
    title: 'Robbie Ryan, ISC, BSC: Crafting the Bizarre Worlds of Poor Things',
    publication: 'American Cinematographer',
    publishedAt: '2023-12-01',
    notes: 'Covers fisheye lens choices, B&W intro sequences, and colour-grading approach.',
  },
  {
    slug: 'filmmaker-mag-poor-things-ryan',
    kind: 'magazine_article',
    title: 'Robbie Ryan on Poor Things',
    publication: 'Filmmaker Magazine',
    publishedAt: '2023-12-08',
  },

  // Killers of the Flower Moon
  {
    slug: 'ac-prieto-kotfm-2023',
    kind: 'magazine_article',
    title: 'Rodrigo Prieto, ASC, AMC on Killers of the Flower Moon',
    publication: 'American Cinematographer',
    publishedAt: '2023-10-01',
    notes: 'Discusses ALEXA 35, Panavision anamorphics, period lighting approach.',
  },

  // The Batman
  {
    slug: 'ac-fraser-batman-2022',
    kind: 'magazine_article',
    title: 'Greig Fraser, ASC, ACS on Shooting The Batman',
    publication: 'American Cinematographer',
    publishedAt: '2022-04-01',
    notes: 'Fraser explains RED V-RAPTOR, heavily underexposed look, and Tiffen Black Pro-Mist usage.',
  },

  // The Northman
  {
    slug: 'ac-blaschke-northman-2022',
    kind: 'magazine_article',
    title: 'Jarin Blaschke on The Northman',
    publication: 'American Cinematographer',
    publishedAt: '2022-05-01',
    notes: 'Discusses anamorphic lenses, long takes, natural-source lighting philosophy.',
  },
  {
    slug: 'filmmaker-mag-eggers-northman',
    kind: 'magazine_article',
    title: 'Robert Eggers and Jarin Blaschke on The Northman',
    publication: 'Filmmaker Magazine',
    publishedAt: '2022-04-22',
  },

  // 1917
  {
    slug: 'ac-deakins-1917-2020',
    kind: 'magazine_article',
    title: 'Roger Deakins, CBE, ASC, BSC: One Take, Multiple Takes — Shooting 1917',
    publication: 'American Cinematographer',
    publishedAt: '2020-01-01',
    notes: 'Discusses continuous-take illusion, ALEXA Mini LF, Hawk V-Series anamorphics.',
  },
  {
    slug: 'team-deakins-1917-podcast',
    kind: 'podcast',
    title: 'Team Deakins — 1917',
    publication: 'Team Deakins Podcast',
    publishedAt: '2020-01-15',
  },
  {
    slug: '1917-bts-universal',
    kind: 'documentary',
    title: '1917: The Weight of the World',
    publication: 'Universal Pictures',
    notes: 'Making-of documentary covering the single-take logistics and lighting rigs.',
  },

  // Blade Runner 2049
  {
    slug: 'ac-deakins-blade-runner-2049',
    kind: 'magazine_article',
    title: 'Future Shock: Roger Deakins, ASC, BSC on Blade Runner 2049',
    publication: 'American Cinematographer',
    publishedAt: '2017-10-01',
    notes: 'Discusses ALEXA 65, large-format practical lighting panels, colour palette.',
  },

  // Mad Max: Fury Road
  {
    slug: 'ac-seale-fury-road-2015',
    kind: 'magazine_article',
    title: 'John Seale, ASC, ACS on Mad Max: Fury Road',
    publication: 'American Cinematographer',
    publishedAt: '2015-05-01',
    notes: 'Covers Namibia desert shooting, ARRI ALEXA, crash-cam rigging.',
  },
  {
    slug: 'fury-road-bts-warner',
    kind: 'documentary',
    title: 'Mad Max: Fury Road — Maximum Fury (BTS doc)',
    publication: 'Warner Bros.',
    notes: 'Featurette detailing practical stunts, camera placements, and location logistics.',
  },

  // The Revenant
  {
    slug: 'ac-lubezki-revenant-2015',
    kind: 'magazine_article',
    title: 'Emmanuel Lubezki, ASC, AMC on Natural Light in The Revenant',
    publication: 'American Cinematographer',
    publishedAt: '2016-01-01',
    notes: 'Natural-light-only philosophy, ALEXA 65 in extreme cold, ultra-wide lenses.',
  },
  {
    slug: 'inarritu-revenant-vanity-fair-2015',
    kind: 'interview_transcript',
    title: 'Iñárritu and Lubezki on the natural-light philosophy of The Revenant',
    publication: 'Vanity Fair',
    publishedAt: '2015-12-01',
  },

  // Gravity
  {
    slug: 'ac-lubezki-gravity-2013',
    kind: 'magazine_article',
    title: 'Lubezki, Cuarón and the Long Take: Shooting Gravity',
    publication: 'American Cinematographer',
    publishedAt: '2013-11-01',
    notes: 'Discusses LED light box rig, previz-driven camera simulation, ALEXA.',
  },

  // Dunkirk
  {
    slug: 'ac-hoytema-dunkirk-2017',
    kind: 'magazine_article',
    title: 'Hoyte van Hoytema, FSF, NSC, ASC on Dunkirk',
    publication: 'American Cinematographer',
    publishedAt: '2017-08-01',
    notes: 'IMAX 65mm and 5-perf 65mm anamorphic on-location at Dunkirk beach.',
  },

  // Skyfall
  {
    slug: 'ac-deakins-skyfall-2012',
    kind: 'magazine_article',
    title: 'Roger Deakins on Going Digital: Skyfall',
    publication: 'American Cinematographer',
    publishedAt: '2012-12-01',
    notes: 'First Deakins digital-only Bond; discusses ALEXA, Shanghai building shoot.',
  },

  // Children of Men
  {
    slug: 'ac-lubezki-children-of-men',
    kind: 'magazine_article',
    title: 'Children of Men: Lubezki on the Long Takes',
    publication: 'American Cinematographer',
    publishedAt: '2007-01-01',
    notes: 'Covers extended handheld car sequence and Bexhill battle sequence.',
  },

  // Manufacturer / product pages
  {
    slug: 'arri-rental-dna-lf-vintage-page',
    kind: 'manufacturer_product_page',
    title: 'ARRI Rental DNA LF Vintage Primes',
    publication: 'ARRI Rental',
    notes: 'Manufacturer page describing the Canon K-35 rehouse in LF coverage.',
  },
  {
    slug: 'cooke-s7i-product-page',
    kind: 'manufacturer_product_page',
    title: 'Cooke S7/i Full Frame Plus Primes',
    publication: 'Cooke Optics',
    url: 'https://cookeoptics.com/s7i-full-frame-plus-primes/',
  },
  {
    slug: 'panavision-sphero-page',
    kind: 'manufacturer_product_page',
    title: 'Panavision Sphero T-Series Anamorphic',
    publication: 'Panavision',
    notes: 'Product page for Panavision Sphero T-Series; no public URL, sourced from Panavision rep materials.',
  },
  {
    slug: 'arri-skypanel-product-page',
    kind: 'manufacturer_product_page',
    title: 'ARRI SkyPanel LED Soft Lights',
    publication: 'ARRI',
    url: 'https://www.arri.com/en/lighting/led/skypanel',
  },
  {
    slug: 'arri-orbiter-product-page',
    kind: 'manufacturer_product_page',
    title: 'ARRI Orbiter LED Fresnel',
    publication: 'ARRI',
    url: 'https://www.arri.com/en/lighting/led/orbiter',
  },
  {
    slug: 'tiffen-pro-mist-page',
    kind: 'manufacturer_product_page',
    title: 'Tiffen Black Pro-Mist Filter',
    publication: 'Tiffen',
    url: 'https://tiffen.com/products/black-pro-mist',
  },
  {
    slug: 'atlas-orion-page',
    kind: 'manufacturer_product_page',
    title: 'Atlas Orion Series Anamorphic',
    publication: 'Atlas Lens Co',
    url: 'https://www.atlaslensco.com/orion',
  },
  {
    slug: 'zeiss-supreme-prime-page',
    kind: 'manufacturer_product_page',
    title: 'Zeiss Supreme Prime',
    publication: 'Carl Zeiss',
    url: 'https://www.zeiss.com/consumer-products/int/cinematography/lenses/supreme-prime.html',
  },

  // Books
  {
    slug: 'cinematography-book-deakins-byrne',
    kind: 'book',
    title: 'Conversations with Cinematographers',
    author: 'David Bordwell',
    publishedAt: '2018-04-01',
    notes: 'General reference on cinematographic practice; not specific to one production.',
  },
  {
    slug: 'asc-manual-11th-ed',
    kind: 'book',
    title: 'American Cinematographer Manual, 11th Edition',
    publication: 'ASC Press',
    author: 'Rod Ryan (ed.)',
    publishedAt: '2020-01-01',
    notes: 'Standard reference for exposure, formats, and film/digital workflow.',
  },

  // Wiki references (low-confidence)
  {
    slug: 'wikipedia-arri-alexa-65',
    kind: 'wiki',
    title: 'ARRI ALEXA 65 — Wikipedia',
    publication: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Arri_Alexa#ALEXA_65',
  },
  {
    slug: 'wikipedia-vistavision',
    kind: 'wiki',
    title: 'VistaVision — Wikipedia',
    publication: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/VistaVision',
  },
  {
    slug: 'wikipedia-imax-film-formats',
    kind: 'wiki',
    title: 'IMAX — Film Formats — Wikipedia',
    publication: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/IMAX#Film_formats',
  },

  // RedShark News
  {
    slug: 'redshark-supreme-prime-radiance',
    kind: 'magazine_article',
    title: 'Zeiss Supreme Prime Radiance: A Cinematographer\'s Take',
    publication: 'RedShark News',
    publishedAt: '2020-09-01',
  },
  {
    slug: 'redshark-alexa35-review-2022',
    kind: 'magazine_article',
    title: 'ARRI ALEXA 35 First Look: What Cinematographers Need to Know',
    publication: 'RedShark News',
    publishedAt: '2022-06-15',
    notes: 'First hands-on overview of ALEXA 35 sensor design and color science.',
  },

  // No Film School
  {
    slug: 'nfs-fraser-batman-lenses-2022',
    kind: 'magazine_article',
    title: 'Greig Fraser on the Lenses of The Batman',
    publication: 'No Film School',
    publishedAt: '2022-04-05',
    notes: 'Fraser explains how lens choice and diffusion filters created the gritty look.',
  },
  {
    slug: 'nfs-lubezki-revenant-natural-light',
    kind: 'magazine_article',
    title: 'Chivo on Natural Light: How Lubezki Shot The Revenant',
    publication: 'No Film School',
    publishedAt: '2016-01-20',
  },

  // ASC Podcast
  {
    slug: 'asc-podcast-prieto-kotfm-2023',
    kind: 'podcast',
    title: 'ASC Podcast — Rodrigo Prieto on Killers of the Flower Moon',
    publication: 'ASC Podcast',
    publishedAt: '2023-11-01',
    notes: 'Prieto discusses lens choices, aspect ratio, and Scorsese\'s directing style.',
  },
  {
    slug: 'asc-podcast-crawley-brutalist-2025',
    kind: 'podcast',
    title: 'ASC Podcast — Lol Crawley on The Brutalist',
    publication: 'ASC Podcast',
    publishedAt: '2025-01-10',
    notes: 'Crawley deep-dive on sourcing and adapting VistaVision cameras for modern use.',
  },

  // Imago
  {
    slug: 'imago-fraser-2022',
    kind: 'magazine_article',
    title: 'Greig Fraser: From Dune to The Batman',
    publication: 'Imago',
    publishedAt: '2022-06-01',
    notes: 'Imago biennial interview covering Fraser\'s back-to-back productions.',
  },
];

export async function seedSources(db: SeedDb) {
  for (const s of sourcesData) {
    await db.insert(sources)
      .values({
        slug: s.slug,
        kind: s.kind,
        title: s.title,
        publication: s.publication ?? null,
        author: s.author ?? null,
        publishedAt: s.publishedAt ?? null,
        url: s.url ?? null,
        archiveUrl: s.archiveUrl ?? null,
        notes: s.notes ?? null,
      })
      .onConflictDoUpdate({
        target: sources.slug,
        set: {
          kind: s.kind,
          title: s.title,
          publication: s.publication ?? null,
          author: s.author ?? null,
          publishedAt: s.publishedAt ?? null,
          url: s.url ?? null,
          archiveUrl: s.archiveUrl ?? null,
          notes: s.notes ?? null,
          updatedAt: new Date(),
        },
      });
  }
}
