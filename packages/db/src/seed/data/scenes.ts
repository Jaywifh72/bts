import { eq } from 'drizzle-orm';
import { scenes, productions } from '../../schema/index.ts';
import type { SeedDb } from '../run.ts';

type SceneSeed = {
  productionSlug: string;
  slug: string;
  title: string;
  sceneNumber?: string;
  synopsis?: string;
  positionInRuntimeSeconds?: number;
  interiorExterior?: 'int' | 'ext' | 'int_ext';
  timeOfDay?: 'dawn' | 'day' | 'dusk' | 'night' | 'magic_hour';
  location?: string;
};

export const scenesData: SceneSeed[] = [
  // ===== Dune: Part Two (3 scenes) =====
  { productionSlug: 'dune-part-two-2024', slug: 'arrakis-walking-sequence',
    title: 'Arrakis Walking Sequence', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Wadi Rum, Jordan' },
  { productionSlug: 'dune-part-two-2024', slug: 'sandworm-ride',
    title: 'Sandworm Ride', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Abu Dhabi' },
  { productionSlug: 'dune-part-two-2024', slug: 'imax-bw-arena',
    title: 'IMAX B&W Arena Sequence', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Abu Dhabi (IR-converted ALEXA)' },

  // ===== Oppenheimer (3 scenes) =====
  { productionSlug: 'oppenheimer-2023', slug: 'trinity-test',
    title: 'Trinity Test', interiorExterior: 'ext', timeOfDay: 'dawn',
    location: 'Los Alamos (re-creation, NM)' },
  { productionSlug: 'oppenheimer-2023', slug: 'fission-visions',
    title: 'Fission Visions (B&W)', interiorExterior: 'int', timeOfDay: 'night',
    location: 'IMAX 70mm B&W (Kodak custom stock)' },
  { productionSlug: 'oppenheimer-2023', slug: 'lab-meeting',
    title: 'Los Alamos Laboratory Meeting', interiorExterior: 'int', timeOfDay: 'day',
    location: 'Los Alamos (re-creation, NM)' },

  // ===== The Brutalist (2 scenes) =====
  { productionSlug: 'the-brutalist-2024', slug: 'arrival-at-ellis-island',
    title: 'Arrival at Ellis Island', interiorExterior: 'ext', timeOfDay: 'dawn',
    location: 'Ellis Island (re-creation)' },
  { productionSlug: 'the-brutalist-2024', slug: 'institute-construction',
    title: 'The Institute under Construction', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Pennsylvania' },

  // ===== Poor Things (3 scenes; one magic-hour exterior for Q3) =====
  { productionSlug: 'poor-things-2023', slug: 'lisbon-tile-rooftops',
    title: 'Lisbon Tile Rooftops', interiorExterior: 'ext', timeOfDay: 'magic_hour',
    location: 'Lisbon (set re-creation, Hungary)' },
  { productionSlug: 'poor-things-2023', slug: 'paris-brothel-interior',
    title: 'Paris Brothel Interior', interiorExterior: 'int', timeOfDay: 'night' },
  { productionSlug: 'poor-things-2023', slug: 'baxter-house-interior',
    title: 'Godwin Baxter\'s House', interiorExterior: 'int', timeOfDay: 'day' },

  // ===== Killers of the Flower Moon (3 scenes; magic-hour exterior for Q3) =====
  { productionSlug: 'killers-of-the-flower-moon-2023', slug: 'osage-prairie-dawn',
    title: 'Osage Prairie at Dawn', interiorExterior: 'ext', timeOfDay: 'magic_hour',
    location: 'Pawhuska, Oklahoma' },
  { productionSlug: 'killers-of-the-flower-moon-2023', slug: 'oil-strike',
    title: 'The Oil Strike', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Pawhuska, Oklahoma' },
  { productionSlug: 'killers-of-the-flower-moon-2023', slug: 'mollie-kitchen',
    title: 'Mollie\'s Kitchen', interiorExterior: 'int', timeOfDay: 'day' },

  // ===== The Batman (3 scenes) =====
  { productionSlug: 'the-batman-2022', slug: 'opening-rooftop',
    title: 'Opening Rooftop Surveillance', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Gotham (London exteriors)' },
  { productionSlug: 'the-batman-2022', slug: 'iceberg-lounge-club',
    title: 'Iceberg Lounge', interiorExterior: 'int', timeOfDay: 'night' },
  { productionSlug: 'the-batman-2022', slug: 'batmobile-chase',
    title: 'Batmobile Highway Chase', interiorExterior: 'ext', timeOfDay: 'night' },

  // ===== The Northman (2 scenes) =====
  { productionSlug: 'the-northman-2022', slug: 'volcano-duel',
    title: 'Volcano Duel', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Iceland' },
  { productionSlug: 'the-northman-2022', slug: 'hofgardr-feast',
    title: 'Feast at Hofgardr', interiorExterior: 'int', timeOfDay: 'night' },

  // ===== 1917 (2 scenes including the trench-to-poppy-field oner) =====
  { productionSlug: '1917-2019', slug: 'trench-to-poppy-field-oner',
    title: 'Trench to Poppy Field Oner', interiorExterior: 'ext', timeOfDay: 'magic_hour',
    location: 'Salisbury Plain, UK' },
  { productionSlug: '1917-2019', slug: 'flare-night-running',
    title: 'Flare Night Running', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Govan, UK (set)' },

  // ===== Blade Runner 2049 (3 scenes) =====
  { productionSlug: 'blade-runner-2049-2017', slug: 'las-vegas-orange',
    title: 'Las Vegas Orange Storm', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Hungary (sound stage with VFX)' },
  { productionSlug: 'blade-runner-2049-2017', slug: 'sea-wall-confrontation',
    title: 'Sea Wall Confrontation', interiorExterior: 'ext', timeOfDay: 'magic_hour',
    location: 'Budapest (set with VFX)' },
  { productionSlug: 'blade-runner-2049-2017', slug: 'wallace-corp-interior',
    title: 'Wallace Corporation Interior', interiorExterior: 'int', timeOfDay: 'day' },

  // ===== Mad Max: Fury Road (2 scenes) =====
  { productionSlug: 'mad-max-fury-road-2015', slug: 'opening-chase',
    title: 'Opening Chase', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Namibia (Namib Desert)' },
  { productionSlug: 'mad-max-fury-road-2015', slug: 'sandstorm',
    title: 'Sandstorm', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Namib Desert' },

  // ===== The Revenant (3 scenes; bear attack + glacial wakeup) =====
  { productionSlug: 'the-revenant-2015', slug: 'bear-attack',
    title: 'Grizzly Bear Attack', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'British Columbia' },
  { productionSlug: 'the-revenant-2015', slug: 'glacial-rebirth',
    title: 'Glacial Rebirth', interiorExterior: 'ext', timeOfDay: 'magic_hour',
    location: 'British Columbia' },
  { productionSlug: 'the-revenant-2015', slug: 'fitzgerald-final-fight',
    title: 'Fitzgerald Final Fight', interiorExterior: 'ext', timeOfDay: 'day' },

  // ===== Gravity (2 scenes) =====
  { productionSlug: 'gravity-2013', slug: 'space-debris-strike',
    title: 'Space Debris Strike', interiorExterior: 'ext', timeOfDay: 'day' },
  { productionSlug: 'gravity-2013', slug: 'iss-interior',
    title: 'ISS Interior Refuge', interiorExterior: 'int', timeOfDay: 'day' },

  // ===== Dunkirk (2 scenes) =====
  { productionSlug: 'dunkirk-2017', slug: 'mole-aerial',
    title: 'The Mole — Aerial', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Dunkirk Beach, France' },
  { productionSlug: 'dunkirk-2017', slug: 'spitfire-cockpit',
    title: 'Spitfire Cockpit', interiorExterior: 'int', timeOfDay: 'day' },

  // ===== Skyfall (2 scenes) =====
  { productionSlug: 'skyfall-2012', slug: 'shanghai-skyline-fight',
    title: 'Shanghai Skyline Fight', interiorExterior: 'int', timeOfDay: 'night',
    location: 'Shanghai (sound stage with LED backdrop)' },
  { productionSlug: 'skyfall-2012', slug: 'skyfall-estate-final',
    title: 'Skyfall Estate Final Stand', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Glen Coe, Scotland' },

  // ===== Children of Men (2 scenes) =====
  { productionSlug: 'children-of-men-2006', slug: 'cafe-explosion',
    title: 'Café Explosion', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'London' },
  { productionSlug: 'children-of-men-2006', slug: 'bexhill-final-oner',
    title: 'Bexhill Final Oner', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Bexhill (set)' },

  // ===== Classic Era =====
  // Lawrence of Arabia
  { productionSlug: 'lawrence-of-arabia-1962', slug: 'desert-mirage',
    title: 'Desert Mirage — Omar Sharif Approach', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Wadi Rum, Jordan' },
  { productionSlug: 'lawrence-of-arabia-1962', slug: 'attack-on-aqaba',
    title: 'Attack on Aqaba', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Almería, Spain' },

  // The Godfather
  { productionSlug: 'the-godfather-1972', slug: 'godfather-wedding',
    title: 'Connie\'s Wedding', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Staten Island, NY' },
  { productionSlug: 'the-godfather-1972', slug: 'don-corleone-garden',
    title: 'Don Corleone in the Garden', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Staten Island, NY' },

  // Barry Lyndon
  { productionSlug: 'barry-lyndon-1975', slug: 'candlelit-dinner',
    title: 'Candlelit Dinner Scene', interiorExterior: 'int', timeOfDay: 'night',
    location: 'Powerscourt House, Ireland' },
  { productionSlug: 'barry-lyndon-1975', slug: 'duel-in-the-garden',
    title: 'Duel in the Garden', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Waterford, Ireland' },

  // Apocalypse Now
  { productionSlug: 'apocalypse-now-1979', slug: 'helicopter-attack',
    title: '"Ride of the Valkyries" Helicopter Attack', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Philippines' },
  { productionSlug: 'apocalypse-now-1979', slug: 'kurtz-compound',
    title: 'Kurtz Compound', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Philippines' },

  // Days of Heaven
  { productionSlug: 'days-of-heaven-1978', slug: 'wheat-fire-magic-hour',
    title: 'Wheat Field Fire', interiorExterior: 'ext', timeOfDay: 'magic_hour',
    location: 'Alberta, Canada' },
  { productionSlug: 'days-of-heaven-1978', slug: 'locust-plague',
    title: 'Locust Plague', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Alberta, Canada' },

  // Blade Runner (1982)
  { productionSlug: 'blade-runner-1982', slug: 'spinner-city-night',
    title: 'Spinner Over Night City', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Burbank, CA (miniature)' },
  { productionSlug: 'blade-runner-1982', slug: 'roy-batty-rooftop',
    title: '"Tears in Rain" — Rooftop Monologue', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Los Angeles (set)' },

  // Schindler's List
  { productionSlug: 'schindlers-list-1993', slug: 'liquidation-ghetto',
    title: 'Liquidation of the Kraków Ghetto', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Kraków, Poland' },
  { productionSlug: 'schindlers-list-1993', slug: 'girl-in-red-coat',
    title: 'Girl in the Red Coat', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Kraków, Poland' },

  // ===== 2000s =====
  // Collateral
  { productionSlug: 'collateral-2004', slug: 'nighttime-la-drive',
    title: 'Nighttime LA Drive', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Los Angeles' },
  { productionSlug: 'collateral-2004', slug: 'jazz-club-encounter',
    title: 'Jazz Club Encounter', interiorExterior: 'int', timeOfDay: 'night',
    location: 'Los Angeles' },

  // No Country for Old Men
  { productionSlug: 'no-country-for-old-men-2007', slug: 'desert-pursuit',
    title: 'Desert Pursuit', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'West Texas' },
  { productionSlug: 'no-country-for-old-men-2007', slug: 'hotel-room-showdown',
    title: 'Hotel Room Showdown', interiorExterior: 'int', timeOfDay: 'night' },

  // There Will Be Blood
  { productionSlug: 'there-will-be-blood-2007', slug: 'plainview-oil-fire',
    title: 'Little Boston Oil Fire', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Marfa, Texas' },
  { productionSlug: 'there-will-be-blood-2007', slug: 'i-drink-your-milkshake',
    title: '"I Drink Your Milkshake" Bowling Alley', interiorExterior: 'int', timeOfDay: 'day' },

  // The Dark Knight
  { productionSlug: 'the-dark-knight-2008', slug: 'bank-heist-opening',
    title: 'Bank Heist Opening', interiorExterior: 'int', timeOfDay: 'day',
    location: 'Chicago' },
  { productionSlug: 'the-dark-knight-2008', slug: 'chicago-truck-flip',
    title: 'Truck Flip on LaSalle Street', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'LaSalle St, Chicago' },

  // ===== 2010s =====
  // Inception
  { productionSlug: 'inception-2010', slug: 'paris-fold',
    title: 'Paris Fold Dream', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Paris' },
  { productionSlug: 'inception-2010', slug: 'zero-gravity-hotel',
    title: 'Zero-Gravity Hotel Corridor Fight', interiorExterior: 'int', timeOfDay: 'day',
    location: 'London (set)' },

  // The Social Network
  { productionSlug: 'the-social-network-2010', slug: 'deposition-opening',
    title: 'Opening Deposition', interiorExterior: 'int', timeOfDay: 'day' },
  { productionSlug: 'the-social-network-2010', slug: 'henley-regatta',
    title: 'Henley Royal Regatta', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Thames, UK' },

  // Birdman
  { productionSlug: 'birdman-2014', slug: 'theatre-one-take',
    title: 'Backstage Continuous Shot', interiorExterior: 'int', timeOfDay: 'night',
    location: 'St. James Theatre, NYC' },
  { productionSlug: 'birdman-2014', slug: 'times-square-rooftop',
    title: 'Times Square in Underwear', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Times Square, NYC' },

  // Ex Machina
  { productionSlug: 'ex-machina-2014', slug: 'ava-first-reveal',
    title: 'Ava — First Reveal', interiorExterior: 'int', timeOfDay: 'day' },
  { productionSlug: 'ex-machina-2014', slug: 'disco-dance-sequence',
    title: 'Disco Dance Sequence', interiorExterior: 'int', timeOfDay: 'night' },

  // Carol
  { productionSlug: 'carol-2015', slug: 'toy-department-meeting',
    title: 'Toy Department First Meeting', interiorExterior: 'int', timeOfDay: 'day',
    location: 'Cincinnati (set)' },
  { productionSlug: 'carol-2015', slug: 'road-trip-hotel',
    title: 'Road Trip Hotel Room', interiorExterior: 'int', timeOfDay: 'night' },

  // Son of Saul
  { productionSlug: 'son-of-saul-2015', slug: 'sonderkommando-work',
    title: 'Sonderkommando Duties', interiorExterior: 'int', timeOfDay: 'day',
    location: 'Budapest (set reconstruction)' },
  { productionSlug: 'son-of-saul-2015', slug: 'forest-burial',
    title: 'Forest Burial Attempt', interiorExterior: 'ext', timeOfDay: 'day' },

  // Moonlight
  { productionSlug: 'moonlight-2016', slug: 'beach-swimming-lesson',
    title: 'Beach Swimming Lesson', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Miami Beach' },
  { productionSlug: 'moonlight-2016', slug: 'diner-reunion',
    title: 'Diner Reunion', interiorExterior: 'int', timeOfDay: 'night',
    location: 'Atlanta' },

  // La La Land
  { productionSlug: 'la-la-land-2016', slug: 'griffith-observatory-dance',
    title: 'Griffith Observatory Dance', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Griffith Observatory, LA' },
  { productionSlug: 'la-la-land-2016', slug: 'freeway-opening',
    title: 'Freeway Opening Number', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'I-105 Freeway, LA' },

  // Arrival
  { productionSlug: 'arrival-2016', slug: 'heptapod-first-contact',
    title: 'First Contact in the Shell', interiorExterior: 'int', timeOfDay: 'day' },
  { productionSlug: 'arrival-2016', slug: 'memory-walk-montage',
    title: 'Memory Walk Montage', interiorExterior: 'ext', timeOfDay: 'day' },

  // Cold War
  { productionSlug: 'cold-war-2018', slug: 'polish-folk-concert',
    title: 'Polish Folk Ensemble Concert', interiorExterior: 'int', timeOfDay: 'night',
    location: 'Poland' },
  { productionSlug: 'cold-war-2018', slug: 'paris-jazz-club',
    title: 'Paris Jazz Club', interiorExterior: 'int', timeOfDay: 'night',
    location: 'Paris' },

  // First Man
  { productionSlug: 'first-man-2018', slug: 'lunar-landing',
    title: 'Lunar Surface Landing', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'IMAX — Moon (set)' },
  { productionSlug: 'first-man-2018', slug: 'x15-test-flight',
    title: 'X-15 Test Flight', interiorExterior: 'int', timeOfDay: 'day' },

  // The Favourite
  { productionSlug: 'the-favourite-2018', slug: 'queen-duck-races',
    title: 'Queen Anne\'s Duck Races', interiorExterior: 'int', timeOfDay: 'day',
    location: 'Hatfield House, UK' },
  { productionSlug: 'the-favourite-2018', slug: 'wide-angle-throne-room',
    title: 'Fish-Eye Throne Room', interiorExterior: 'int', timeOfDay: 'day',
    location: 'Hatfield House, UK' },

  // Midsommar
  { productionSlug: 'midsommar-2019', slug: 'maypole-dance',
    title: 'Maypole Dance', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Älvdalen, Sweden' },
  { productionSlug: 'midsommar-2019', slug: 'ättestupa-cliff',
    title: 'Cliff Ceremony', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Götene, Sweden' },

  // Once Upon a Time in Hollywood
  { productionSlug: 'once-upon-a-time-in-hollywood-2019', slug: 'sunset-strip-cruise',
    title: 'Sunset Strip Cruise', interiorExterior: 'ext', timeOfDay: 'magic_hour',
    location: 'Hollywood, LA' },
  { productionSlug: 'once-upon-a-time-in-hollywood-2019', slug: 'spahn-ranch-visit',
    title: 'Spahn Ranch Visit', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Simi Valley, CA (set)' },

  // Portrait of a Lady on Fire
  { productionSlug: 'portrait-of-a-lady-on-fire-2019', slug: 'bonfire-cliffs',
    title: 'Bonfire on the Cliffs', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Brittany coast, France' },
  { productionSlug: 'portrait-of-a-lady-on-fire-2019', slug: 'portrait-session',
    title: 'The Portrait Session', interiorExterior: 'int', timeOfDay: 'day' },

  // The Lighthouse
  { productionSlug: 'the-lighthouse-2019', slug: 'storm-confrontation',
    title: 'Storm Confrontation', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Cape Forchu, Nova Scotia' },
  { productionSlug: 'the-lighthouse-2019', slug: 'lighthouse-interior-night',
    title: 'Lighthouse Interior — Night', interiorExterior: 'int', timeOfDay: 'night' },

  // Joker
  { productionSlug: 'joker-2019', slug: 'subway-vigilante',
    title: 'Subway Vigilante Scene', interiorExterior: 'int', timeOfDay: 'night',
    location: 'New York / Newark subway' },
  { productionSlug: 'joker-2019', slug: 'stairs-dance',
    title: 'Steps Dance', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Bronx, New York' },

  // Marriage Story
  { productionSlug: 'marriage-story-2019', slug: 'apartment-argument',
    title: 'Apartment Argument', interiorExterior: 'int', timeOfDay: 'night',
    location: 'Los Angeles' },
  { productionSlug: 'marriage-story-2019', slug: 'being-alive-performance',
    title: '"Being Alive" Performance', interiorExterior: 'int', timeOfDay: 'night',
    location: 'Los Angeles bar' },

  // ===== 2020–2024 =====
  // Mank
  { productionSlug: 'mank-2020', slug: 'san-simeon-party',
    title: 'San Simeon Party', interiorExterior: 'int', timeOfDay: 'night',
    location: 'Hearst Castle recreation' },
  { productionSlug: 'mank-2020', slug: 'mank-dictates-citizen-kane',
    title: 'Mank Dictates Citizen Kane', interiorExterior: 'int', timeOfDay: 'day' },

  // The Power of the Dog
  { productionSlug: 'the-power-of-the-dog-2021', slug: 'smoke-ring-saddle',
    title: 'Phil Smoke Ring in the Saddle', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Otago, New Zealand' },
  { productionSlug: 'the-power-of-the-dog-2021', slug: 'river-swimming',
    title: 'River Swimming', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Otago, New Zealand' },

  // Nightmare Alley
  { productionSlug: 'nightmare-alley-2021', slug: 'carnival-night',
    title: 'Carnival at Night', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Toronto (period set)' },
  { productionSlug: 'nightmare-alley-2021', slug: 'geek-pit',
    title: 'The Geek Pit', interiorExterior: 'int', timeOfDay: 'night' },

  // Spencer
  { productionSlug: 'spencer-2021', slug: 'balmoral-breakfast',
    title: 'Balmoral Breakfast', interiorExterior: 'int', timeOfDay: 'day',
    location: 'Balmoral Estate recreation, Germany' },
  { productionSlug: 'spencer-2021', slug: 'diana-scarecrow-walk',
    title: 'Diana Walks to the Scarecrow', interiorExterior: 'ext', timeOfDay: 'magic_hour',
    location: 'Norfolk, UK' },

  // Babylon
  { productionSlug: 'babylon-2022', slug: 'opening-party',
    title: 'Hollywood Mansion Opening Party', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Biltmore Estate, Asheville NC' },
  { productionSlug: 'babylon-2022', slug: 'silent-film-shoot',
    title: 'Silent Film Shoot on the Hill', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Los Angeles (period set)' },

  // Elvis
  { productionSlug: 'elvis-2022', slug: 'beale-street-discovery',
    title: 'Beale Street Discovery', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Gold Coast, Australia (period set)' },
  { productionSlug: 'elvis-2022', slug: 'international-hotel-concert',
    title: 'International Hotel Concert', interiorExterior: 'int', timeOfDay: 'night',
    location: 'Gold Coast, Australia (set)' },

  // Tár
  { productionSlug: 'tar-2022', slug: 'juilliard-masterclass',
    title: 'Juilliard Masterclass', interiorExterior: 'int', timeOfDay: 'day',
    location: 'Berlin (set)' },
  { productionSlug: 'tar-2022', slug: 'conducting-rehearsal',
    title: 'Berlin Philharmonic Rehearsal', interiorExterior: 'int', timeOfDay: 'day',
    location: 'Berlin Philharmonie' },

  // All Quiet on the Western Front
  { productionSlug: 'all-quiet-on-the-western-front-2022', slug: 'trench-night-assault',
    title: 'Night Trench Assault', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Czech Republic (set)' },
  { productionSlug: 'all-quiet-on-the-western-front-2022', slug: 'armistice-morning',
    title: 'Armistice Morning Final Attack', interiorExterior: 'ext', timeOfDay: 'dawn',
    location: 'Czech Republic (set)' },

  // The Substance
  { productionSlug: 'the-substance-2024', slug: 'transformation-sequence',
    title: 'First Transformation', interiorExterior: 'int', timeOfDay: 'night' },
  { productionSlug: 'the-substance-2024', slug: 'tv-studio-performance',
    title: 'TV Studio Performance', interiorExterior: 'int', timeOfDay: 'day' },

  // Anora
  { productionSlug: 'anora-2024', slug: 'night-club-dance',
    title: 'Night Club Dance', interiorExterior: 'int', timeOfDay: 'night',
    location: 'New York City' },
  { productionSlug: 'anora-2024', slug: 'brighton-beach-winter',
    title: 'Brighton Beach in Winter', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Coney Island / Brighton Beach, NYC' },

  // Conclave
  { productionSlug: 'conclave-2024', slug: 'sistine-chapel-ballot',
    title: 'Sistine Chapel Ballot', interiorExterior: 'int', timeOfDay: 'day',
    location: 'Vatican (recreation)' },
  { productionSlug: 'conclave-2024', slug: 'opening-360-steadicam',
    title: 'Opening 360° Steadicam', interiorExterior: 'int', timeOfDay: 'day' },
];

export async function seedScenes(db: SeedDb) {
  for (const s of scenesData) {
    const [production] = await db.select({ id: productions.id })
      .from(productions)
      .where(eq(productions.slug, s.productionSlug));
    if (!production) throw new Error(`unknown production slug: ${s.productionSlug}`);
    const prodId = production.id;
    await db.insert(scenes)
      .values({
        productionId: prodId,
        slug: s.slug,
        title: s.title,
        sceneNumber: s.sceneNumber ?? null,
        synopsis: s.synopsis ?? null,
        positionInRuntimeSeconds: s.positionInRuntimeSeconds ?? null,
        interiorExterior: s.interiorExterior ?? null,
        timeOfDay: s.timeOfDay ?? null,
        location: s.location ?? null,
      })
      .onConflictDoUpdate({
        target: [scenes.productionId, scenes.slug],
        set: {
          title: s.title,
          sceneNumber: s.sceneNumber ?? null,
          synopsis: s.synopsis ?? null,
          positionInRuntimeSeconds: s.positionInRuntimeSeconds ?? null,
          interiorExterior: s.interiorExterior ?? null,
          timeOfDay: s.timeOfDay ?? null,
          location: s.location ?? null,
          updatedAt: new Date(),
        },
      });
  }
}
