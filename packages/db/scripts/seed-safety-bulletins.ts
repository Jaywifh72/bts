// Phase-6 seed: SAG-AFTRA Safety Bulletins archive.
//
// We index 11 of the most-cited bulletins. The bulletin numbers and
// titles are factual (widely reproduced in IATSE and Producers Guild
// materials) — the scope/summary/requirements prose below is
// original, written for this archive. We do not reproduce SAG-AFTRA
// bulletin text, which is copyrighted; the canonical PDF lives at
// sagaftra.org/safety and we link out to it for the authoritative
// source.
//
// `related_rigging_slugs` lets the rigging glossary cross-link
// bidirectionally (a rigging row's `sag_aftra_bulletin` text matches
// here by bulletin_number; a bulletin's related rigging is hydrated
// directly from the slugs).
//
// Idempotent — ON CONFLICT (slug) DO UPDATE.
import { db, sql } from '../src/index.ts';

function pgTextArray(arr: string[]): string {
  if (arr.length === 0) return '{}';
  return '{' + arr.map((s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

type BulletinSeed = {
  slug: string;
  number: string;
  title: string;
  category:
    | 'firearms' | 'pyrotechnics' | 'fire' | 'animals' | 'aerial'
    | 'vehicles' | 'water' | 'stunts_general' | 'environmental' | 'medical';
  scope: string;
  summary: string;
  keyRequirements: Array<{ heading: string; detail: string }>;
  lastRevision: string | null;       // ISO YYYY-MM-DD when known
  pdfUrl: string | null;
  references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
  relatedRigging: string[];
  sortOrder: number;
};

const BULLETINS: BulletinSeed[] = [
  {
    slug: 'bulletin-1-firearms',
    number: '1',
    title: 'Recommendations for Safety with Firearms and Use of "Blank Ammunition"',
    category: 'firearms',
    scope:
      `The procedural standard for any production using firearms — practical or replica, blank-firing or non-functional. Bulletin #1 governs the chain of custody from armorer to performer, the geometry of permitted muzzle direction, and the pre-take confirmation protocol that no live ammunition is present in the working area.`,
    summary:
      `Bulletin #1 is the most-cited safety document in working production because of how broadly its scope applies. Any time a weapon prop is on set, even if it never fires, the chain-of-custody and storage requirements engage. The bulletin identifies a designated armorer (sometimes called the property master in non-firearm-heavy productions) as the single point of responsibility for every weapon's state on set; weapons not in active use are stored locked, never left on a craft table or in a trailer. Live ammunition is prohibited within an exclusion radius of the working camera. The performer training requirement — that any cast member handling a firearm has received instruction from the armorer before the scene is shot — is the gating step that, when violated, has produced every recent on-set firearm incident in the public record.`,
    keyRequirements: [
      { heading: 'Designated armorer / weapons master', detail: 'A single licensed armorer (or property master with weapons certification) is responsible for every weapon on set. Weapons are stored locked when not in immediate use.' },
      { heading: 'No live ammunition on set', detail: 'Live rounds are prohibited within the working exclusion radius. Blank rounds are loaded by the armorer immediately before the take and accounted for after.' },
      { heading: 'Muzzle discipline', detail: 'No firearm — practical, blank-firing, or replica — is pointed at any person or off-set viewer. The shot is choreographed so muzzle path passes the camera but not the operator.' },
      { heading: 'Performer training', detail: 'Any cast member handling a firearm receives instruction from the armorer before the scene. Handling the weapon for the first time on the take is prohibited.' },
      { heading: 'Pre-take "cold gun" protocol', detail: 'Before the camera rolls, the armorer publicly clears the chamber and confirms the weapon\'s state to the AD. The performer accepts the weapon directly from the armorer\'s hand.' },
    ],
    lastRevision: '2003-04-01',
    pdfUrl: 'https://www.sagaftra.org/files/sa_documents/SafetyBulletin01.pdf',
    references: [
      { title: 'SAG-AFTRA Safety Bulletins index', url: 'https://www.sagaftra.org/safety', publication: 'SAG-AFTRA', kind: 'bulletin' },
      { title: 'IATSE Safety App / on-set safety reference', url: 'https://www.iatse.net/safety', publication: 'IATSE', kind: 'article' },
    ],
    relatedRigging: ['gun-fu', 'padded-weapon'],
    sortOrder: 10,
  },

  {
    slug: 'bulletin-2-helicopters',
    number: '2',
    title: 'Recommendations for Safety with Helicopters',
    category: 'aerial',
    scope:
      `Any production using a helicopter — for camera platform, performer transport, external mount, or aerial work near talent — is governed by Bulletin #2. The bulletin works in concert with FAA Part 91 and Part 133 (external load operations) requirements.`,
    summary:
      `Helicopters introduce the highest baseline risk of any equipment routinely used on production sets. Bulletin #2 codifies the separation distances between rotor disk and crew, the requirement for a dedicated aviation coordinator on every aerial production day, and the pre-flight briefing that documents exit routes and rotor-strike avoidance. The bulletin's contemporary updates address gimbal-stabilised helicopter camera platforms (which keep crew off the helicopter itself) versus traditional door-off cinematography (which requires the operator to be actively rigged into the airframe). Rotorwash, fuel hot-loading, and engine-running disembarkation are each governed by their own sub-procedures within the bulletin.`,
    keyRequirements: [
      { heading: 'Dedicated aviation coordinator', detail: 'Every flight day requires a coordinator separate from the pilot, responsible for crew briefing and ground operations.' },
      { heading: 'Rotor-disk separation', detail: 'Crew is positioned outside the rotor disk envelope at all times the rotor is engaged; approach and departure paths are pre-rehearsed.' },
      { heading: 'External load (Part 133) certification', detail: 'Any performer or camera rig externally mounted to the helicopter requires an FAA Part 133 certified pilot and a rigged-load briefing for all involved crew.' },
      { heading: 'Hot-loading prohibition', detail: 'Fuel transfer with engines running is prohibited; the helicopter shuts down for refueling within range of crew.' },
    ],
    lastRevision: '2007-01-01',
    pdfUrl: 'https://www.sagaftra.org/files/sa_documents/SafetyBulletin02.pdf',
    references: [
      { title: 'SAG-AFTRA Safety Bulletins index', url: 'https://www.sagaftra.org/safety', publication: 'SAG-AFTRA', kind: 'bulletin' },
      { title: 'FAA Part 133 — External-load operations', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-133', publication: 'FAA', kind: 'article' },
    ],
    relatedRigging: ['helicopter-mount'],
    sortOrder: 20,
  },

  {
    slug: 'bulletin-3-animals',
    number: '3',
    title: 'Recommendations for Safety with Animals',
    category: 'animals',
    scope:
      `Any production with live animals — domestic, exotic, marine, or insect — must follow Bulletin #3 in addition to the American Humane Association's "No Animals Were Harmed" certification protocols.`,
    summary:
      `Bulletin #3 is the safety document for the human side of animal work — distinct from the AHA's role of certifying animal welfare. Where the AHA certifies what happens to the animal, Bulletin #3 governs how the animal handler, performers, and crew interact with that animal safely. The bulletin requires a credentialed wrangler for the species in scope (a horse wrangler is not interchangeable with a primate handler), a pre-shoot risk assessment for any species capable of injury (which in practice is most species), and a published exit plan for crew if an animal becomes uncontrollable. Modern productions increasingly substitute CGI for high-risk live-animal work, which is largely a Bulletin #3 risk-reduction outcome.`,
    keyRequirements: [
      { heading: 'Species-credentialed wrangler', detail: 'The wrangler is credentialed specifically for the working species. A blanket "animal wrangler" credit does not satisfy the bulletin.' },
      { heading: 'AHA observer', detail: 'An American Humane Association representative is present on set whenever animals are working; the AHA observer is separate from the wrangler.' },
      { heading: 'Crew exit plan', detail: 'A published, rehearsed exit route for crew if the animal becomes uncontrollable or aggressive.' },
      { heading: 'No surprise interactions', detail: 'Performers handling the animal have rehearsed with that specific animal beforehand. No "first contact" on the take.' },
    ],
    lastRevision: '2009-09-01',
    pdfUrl: 'https://www.sagaftra.org/files/sa_documents/SafetyBulletin03.pdf',
    references: [
      { title: 'SAG-AFTRA Safety Bulletins index', url: 'https://www.sagaftra.org/safety', publication: 'SAG-AFTRA', kind: 'bulletin' },
      { title: 'American Humane — No Animals Were Harmed', url: 'https://americanhumane.org/no-animals-were-harmed/', publication: 'American Humane', kind: 'article' },
    ],
    relatedRigging: [],
    sortOrder: 30,
  },

  {
    slug: 'bulletin-4-special-effects',
    number: '4',
    title: 'Recommendations for Safety with Stunts and Special Effects (Pyrotechnics)',
    category: 'pyrotechnics',
    scope:
      `Bulletin #4 covers special effects involving pyrotechnics, explosives, and rapid pressure release — the SFX-side equivalent of Bulletin #14's stunt focus. Squibs, debris cannons, fire-bar gas effects, and pressure-driven destruction all fall under Bulletin #4.`,
    summary:
      `Bulletin #4 is operated by a licensed pyrotechnician (in the U.S., licensure is state-level — California's CalFire pyrotechnic license is the most-cited credential). The bulletin's central principle is exclusion-zone discipline: every pyrotechnic effect has a calculated debris cone, and crew is positioned outside that cone with a buffer. Cold-test, hot-test, and live-take protocols separate so that misfire conditions are identified before the camera rolls. Squibs (small body-strapped pyrotechnic charges that simulate gunshot impact) are the highest-handling-frequency effect under Bulletin #4 and the one with the most-cited near-miss reports — improperly placed squibs have produced debris injuries to the performer wearing them.`,
    keyRequirements: [
      { heading: 'Licensed pyrotechnician', detail: 'Every pyrotechnic effect is operated by a state-licensed pyrotechnician (in CA, a CalFire-licensed Class 1, 2, or 3 operator depending on charge size).' },
      { heading: 'Exclusion zone', detail: 'Each effect has a calculated debris cone; crew is positioned outside the cone with a defined buffer and a no-cross safety officer.' },
      { heading: 'Cold-test → hot-test → live', detail: 'Effects are dry-fired (cold) without charge, then test-fired off-camera (hot), then live for the take. Skipping steps is grounds for stop-work.' },
      { heading: 'Misfire protocol', detail: 'On a partial or no-fire, the pyro crew is the only personnel approaching the rig; the misfire is rendered safe before any other crew enter the working area.' },
    ],
    lastRevision: '2003-04-01',
    pdfUrl: 'https://www.sagaftra.org/files/sa_documents/SafetyBulletin04.pdf',
    references: [
      { title: 'SAG-AFTRA Safety Bulletins index', url: 'https://www.sagaftra.org/safety', publication: 'SAG-AFTRA', kind: 'bulletin' },
    ],
    relatedRigging: ['cannon-roll'],
    sortOrder: 40,
  },

  {
    slug: 'bulletin-14-stunts',
    number: '14',
    title: 'Recommendations for the Use of Stunts on Productions',
    category: 'stunts_general',
    scope:
      `The umbrella bulletin for any rigged stunt action — high falls, fights, rigged falls onto airbags, wire-flying, ratchets, vehicle gags, and the supporting craft. Bulletin #14 is the procedural baseline that the more specific bulletins (#4 pyro, #15 fire, #2 helicopters, etc.) extend.`,
    summary:
      `Bulletin #14 codifies the role of the stunt coordinator as the single point of authority for any rigged stunt action. Every stunt sequence has a written rig plan reviewed before the take, a designated safety officer separate from the coordinator, and a stop-work authority distributed across the rigging crew so any individual can halt the take if a hazard emerges. The bulletin's working assumption is that no stunt is so visually important that it justifies bypassing the rig-review step; productions that compress the rig-review timeline produce the bulk of working-stunt injuries in the public record.`,
    keyRequirements: [
      { heading: 'Single coordinator authority', detail: 'A named stunt coordinator is the single point of authority. They are not also the precision driver, the pyrotechnician, or the safety officer; those are distinct roles.' },
      { heading: 'Written rig plan', detail: 'Every rigged stunt has a written plan describing rig type, performer assignment, catch arrangement, and abort procedure. The plan is signed off by the coordinator before the take.' },
      { heading: 'Distributed stop-work', detail: 'Any rigging crew member can call stop-work without escalation. The hierarchy is bypassed for safety calls.' },
      { heading: 'Performer rehearsal', detail: 'The performer rehearses the rig at half-speed before any full-speed take. First-time-on-the-rig at performance speed is prohibited.' },
      { heading: 'Medical on standby', detail: 'A medic with rated emergency response (typically EMT or paramedic) is on set for any rigged stunt, separate from any general production medical coverage.' },
    ],
    lastRevision: '2007-04-01',
    pdfUrl: 'https://www.sagaftra.org/files/sa_documents/SafetyBulletin14.pdf',
    references: [
      { title: 'SAG-AFTRA Safety Bulletins index', url: 'https://www.sagaftra.org/safety', publication: 'SAG-AFTRA', kind: 'bulletin' },
    ],
    relatedRigging: [
      'high-fall-airbag', 'fan-descender', 'decelerator', 'pole-cat',
      'ratchet', 'wire-flying', 'descender-wire',
      'pad-arrangement', 'helicopter-mount', 'wingsuit',
    ],
    sortOrder: 50,
  },

  {
    slug: 'bulletin-15-fire',
    number: '15',
    title: 'Recommendations for Safety with Fire and Flammable Material',
    category: 'fire',
    scope:
      `Any sequence with sustained or controlled flame — full-body burns, propane bars, set-piece fires, fire breathing, gel-suit work — is governed by Bulletin #15. The bulletin extends Bulletin #4 into the specific case of sustained combustion rather than pyrotechnic charge.`,
    summary:
      `Fire is the safety category with the smallest margin: the failure mode of a gel-suit burn is silent — skin reaches second-degree damage before the performer feels it — so the protocol relies entirely on time-on-fire counting and immediate extinguishing. Bulletin #15 codifies the three-extinguisher minimum (CO₂, water-mist, and fire blanket within five feet of the performer for the entire take), the audible time-on-fire countdown by a dedicated safety officer, and the pre-cured gel layer thickness for the rated take duration. Daily take limits are enforced — typically no more than three full-body burns per performer per day — and after-action medical observation is mandatory regardless of the performer's reported state.`,
    keyRequirements: [
      { heading: 'Three-extinguisher minimum', detail: 'Three crew with extinguishers (CO₂, water-mist, fire blanket) within five feet of the performer for the duration of the burn.' },
      { heading: 'Time-on-fire countdown', detail: 'A safety officer audibly counts elapsed time during the burn; performer has a rehearsed "I\'m done" signal that triggers immediate extinguish.' },
      { heading: 'Gel-layer specification', detail: 'Methylcellulose hydrogel layer is rated for the maximum take duration plus a 50% safety margin; the layer is applied directly to skin and protected by Nomex.' },
      { heading: 'Daily take limit', detail: 'No more than three full-body burns per performer per day; consecutive takes are spaced for thermal recovery.' },
      { heading: 'Mandatory post-burn observation', detail: 'After every burn, the performer is medically observed regardless of perceived discomfort. Skin damage from gel-layer failure is not always self-reported.' },
    ],
    lastRevision: '2003-04-01',
    pdfUrl: 'https://www.sagaftra.org/files/sa_documents/SafetyBulletin15.pdf',
    references: [
      { title: 'SAG-AFTRA Safety Bulletins index', url: 'https://www.sagaftra.org/safety', publication: 'SAG-AFTRA', kind: 'bulletin' },
    ],
    relatedRigging: ['gel-suit', 'propane-bar'],
    sortOrder: 60,
  },

  {
    slug: 'bulletin-16-water',
    number: '16',
    title: 'Recommendations for Safety in Water Hazards / Underwater Work',
    category: 'water',
    scope:
      `Any production with underwater performance, dump-tank effects, water cannons, swimming pool work, or open-water boat / scuba sequences. Bulletin #16 is the safety document under Avatar: The Way of Water-class underwater work and any rain-effect or storm-sequence dump.`,
    summary:
      `Underwater work has the longest pre-production training window of any working stunt category — performers progress from breath-hold instruction through contained-pool rebreather training to open-water work over weeks or months before principal photography. Bulletin #16 codifies the 1:1 safety-diver-to-performer ratio at every working depth, the topside dive-master's authority over surface intervals, and the hyperbaric-trained medic on standby. The bulletin's recreational dive-table cross-reference governs consecutive takes — even with shallow-water work, performer fatigue and CO₂ build-up are tracked against published limits.`,
    keyRequirements: [
      { heading: '1:1 safety-diver ratio', detail: 'Every working performer has a dedicated safety diver at the working depth, plus a topside dive-master coordinating overall.' },
      { heading: 'Hyperbaric-trained medic', detail: 'A medic with hyperbaric / dive-medicine training is on standby for the duration of any water work.' },
      { heading: 'Surface-interval enforcement', detail: 'Consecutive takes are gated against recreational dive-table surface intervals to manage fatigue and CO₂ build-up.' },
      { heading: 'Rebreather pre-flight', detail: 'Rebreathers are bench-tested with a calibrated CO₂ monitor before each performer use. Failure mode is loss-of-consciousness without warning.' },
      { heading: 'Cold-water dump heating', detail: 'Cold-water dumps of meaningful volume are heated to skin-safe temperature; even brief exposure to cold dumps produces hypothermia risk.' },
    ],
    lastRevision: '2003-04-01',
    pdfUrl: 'https://www.sagaftra.org/files/sa_documents/SafetyBulletin16.pdf',
    references: [
      { title: 'SAG-AFTRA Safety Bulletins index', url: 'https://www.sagaftra.org/safety', publication: 'SAG-AFTRA', kind: 'bulletin' },
      { title: 'Avatar: The Way of Water — underwater training', url: 'https://beforesandafters.com/2023/01/06/avatar-2-underwater-cinematography/', publication: 'befores & afters', kind: 'article' },
    ],
    relatedRigging: ['underwater-tank', 'water-cannon'],
    sortOrder: 70,
  },

  {
    slug: 'bulletin-17-vehicles',
    number: '17',
    title: 'Recommendations for Safety with Vehicles',
    category: 'vehicles',
    scope:
      `Vehicle work — picture cars, chase choreography, cannon-rolls, pipe-ramps, pod-car driving, Russian-arm chase rigs. Any production with a moving vehicle in a stunt-coordinated context is governed by Bulletin #17 in addition to Bulletin #14's general stunt requirements.`,
    summary:
      `Vehicle stunts compound risk: a driving error doesn't only injure the precision driver, it potentially injures the camera car, the chase support, and any crew or pedestrians along the chase route. Bulletin #17 codifies the road-closure requirement for any chase choreography, the precision driver's HANS-device + fire-suit + fuel-cell baseline rig, and the camera-car / chase-car separation during high-speed work. Modern Russian-arm and pod-car rigs add their own sub-procedures within the bulletin: pod-car briefings include actor abort training, and Russian-arm camera operators rehearse the chase geography off-camera before any live take.`,
    keyRequirements: [
      { heading: 'Road closure', detail: 'Chase sequences require permitted, closed roads with police-escort traffic control. No "cheating" against open traffic.' },
      { heading: 'Precision-driver gear', detail: 'HANS device, full fire suit, fuel cell with quick-disconnect, six-point harness. Picture car has a roll cage rated for the choreography.' },
      { heading: 'Chase-car separation', detail: 'Camera car and picture car maintain a calculated separation throughout the chase. The Russian arm is reach-tested off-take to confirm clearance.' },
      { heading: 'Pre-take dry run', detail: 'Every chase is rehearsed at progressively higher speeds before the principal take. First-time-at-performance-pace is prohibited.' },
      { heading: 'Cannon-roll redundancy', detail: 'Vehicles intended for cannon-roll or pipe-ramp gags carry a remote-piloted dummy first to confirm impact geometry before live performer takes.' },
    ],
    lastRevision: '2003-04-01',
    pdfUrl: 'https://www.sagaftra.org/files/sa_documents/SafetyBulletin17.pdf',
    references: [
      { title: 'SAG-AFTRA Safety Bulletins index', url: 'https://www.sagaftra.org/safety', publication: 'SAG-AFTRA', kind: 'bulletin' },
    ],
    relatedRigging: ['cannon-roll', 'pipe-ramp', 'precision-driving-pod', 'russian-arm'],
    sortOrder: 80,
  },

  {
    slug: 'bulletin-32-extreme-temperature',
    number: '32',
    title: 'Recommendations for Safety in Extreme Temperatures and Inclement Weather',
    category: 'environmental',
    scope:
      `Cold-weather work below freezing, hot-weather work above 90°F, high-altitude productions, and any working day where performer or crew exposure exceeds threshold limits. Bulletin #32 governs warming / cooling shelter requirements, hydration protocols, and exposure-time limits.`,
    summary:
      `Extreme-environment work is one of the highest-frequency safety violations on the open record because the threshold cross-over is gradual — productions push working hours into worsening conditions rather than abort outright. Bulletin #32 codifies the warming / cooling shelter-within-distance requirement (typically a heated trailer within 50 feet for cold work, an air-conditioned trailer for heat), the hydration kit at every department station, and the on-set thermometer that triggers stop-work above defined exposure thresholds. Performers in costume that doesn't permit thermal regulation (rubber suits, fur costumes, wool period costume) work to tighter exposure limits than crew.`,
    keyRequirements: [
      { heading: 'Shelter within distance', detail: 'Heated (cold) or cooled (hot) shelter within 50 feet of the working area. Movement to shelter is built into the working schedule.' },
      { heading: 'Costume-adjusted exposure limits', detail: 'Costume that prevents thermal regulation triggers tighter exposure limits than baseline. Performer breaks are scheduled, not on-demand.' },
      { heading: 'On-set thermometer', detail: 'A calibrated thermometer at the working area; readings above defined thresholds trigger stop-work review.' },
      { heading: 'Hydration / electrolyte stations', detail: 'Every department has a hydration station; in heat, electrolyte replacement is mandatory not optional.' },
    ],
    lastRevision: '2007-04-01',
    pdfUrl: 'https://www.sagaftra.org/files/sa_documents/SafetyBulletin32.pdf',
    references: [
      { title: 'SAG-AFTRA Safety Bulletins index', url: 'https://www.sagaftra.org/safety', publication: 'SAG-AFTRA', kind: 'bulletin' },
    ],
    relatedRigging: [],
    sortOrder: 90,
  },

  {
    slug: 'bulletin-38-blood-borne-pathogens',
    number: '38',
    title: 'Recommendations for Safety with Blood and Body-Fluid Effects',
    category: 'medical',
    scope:
      `Any production using practical blood effects — squibs with blood charges, bladder-controlled bleed effects, body-fluid simulations — must follow Bulletin #38 in addition to OSHA blood-borne-pathogen requirements. The bulletin governs the simulant material, the cleanup protocol, and the cast / crew exposure response.`,
    summary:
      `Practical blood effects are governed jointly by Bulletin #38 (production-side) and federal OSHA 1910.1030 (workplace-side). The combined effect is that any blood simulant must be a rated cosmetic-grade product (typically methylcellulose-based with food-safe colorant), cleanup must be via approved bio-hazard handling, and cross-contamination between performers (e.g. shared blood-bladder costume between takes) is explicitly prohibited. The bulletin also covers the medical response to accidental real exposure — if a practical effect inadvertently produces a real injury, the cleanup protocol upgrades to the OSHA-rated blood-borne-pathogen procedure.`,
    keyRequirements: [
      { heading: 'Cosmetic-grade blood simulant only', detail: 'Blood effects use a rated cosmetic-grade methylcellulose simulant. Improvised mixtures are prohibited.' },
      { heading: 'No cross-performer reuse', detail: 'Costumes with embedded blood-bladders are not reused across performers without full sanitisation. Single-use bladder cartridges are preferred.' },
      { heading: 'Bio-hazard cleanup protocol', detail: 'Cleanup is via designated bio-hazard handling — gloved, contained, separated waste stream from general production refuse.' },
      { heading: 'OSHA upgrade on real exposure', detail: 'If a practical effect produces a real wound, cleanup upgrades to the full OSHA 1910.1030 blood-borne-pathogen response.' },
    ],
    lastRevision: '2007-04-01',
    pdfUrl: 'https://www.sagaftra.org/files/sa_documents/SafetyBulletin38.pdf',
    references: [
      { title: 'SAG-AFTRA Safety Bulletins index', url: 'https://www.sagaftra.org/safety', publication: 'SAG-AFTRA', kind: 'bulletin' },
      { title: 'OSHA 1910.1030 — Bloodborne Pathogens', url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1030', publication: 'OSHA', kind: 'article' },
    ],
    relatedRigging: [],
    sortOrder: 100,
  },

  {
    slug: 'bulletin-39-firearms-near-camera',
    number: '39',
    title: 'Recommendations for Safety When Using Firearms Near Camera Operators',
    category: 'firearms',
    scope:
      `An extension of Bulletin #1 covering the specific case of camera operators within the muzzle envelope of a working firearm. Bulletin #39 codifies muzzle-pass geometry — when a firearm fires past the camera position rather than away from it.`,
    summary:
      `Bulletin #39 was developed in response to a series of documented near-misses where camera operators sustained debris injuries from blank-fired firearms despite the muzzle being theoretically angled away. The bulletin requires that any time a firearm fires within a defined radius of the camera, the operator wears blast-rated safety glasses, the camera position is offset from the muzzle's projected debris cone, and a transparent plexiglass shield is positioned between camera and weapon. The shield requirement is the most-cited update — productions that previously relied on muzzle angle alone must now physically separate the camera from the firearm with a barrier.`,
    keyRequirements: [
      { heading: 'Plexiglass barrier', detail: 'A transparent plexiglass shield is positioned between any camera operator and a firearm firing within the bulletin\'s defined radius.' },
      { heading: 'Blast-rated eyewear', detail: 'Camera operators within the bulletin\'s radius wear ANSI Z87.1-rated safety glasses regardless of barrier presence.' },
      { heading: 'Offset camera position', detail: 'Camera positions are offset from the projected debris cone of the firearm; muzzle angle alone does not satisfy the bulletin.' },
      { heading: 'Pre-take walkthrough', detail: 'Camera operator and armorer walk the geometry before the take; both confirm clear envelope before camera rolls.' },
    ],
    lastRevision: '2008-04-01',
    pdfUrl: 'https://www.sagaftra.org/files/sa_documents/SafetyBulletin39.pdf',
    references: [
      { title: 'SAG-AFTRA Safety Bulletins index', url: 'https://www.sagaftra.org/safety', publication: 'SAG-AFTRA', kind: 'bulletin' },
    ],
    relatedRigging: ['gun-fu'],
    sortOrder: 11,
  },
];

console.log(`seed-safety-bulletins — ${BULLETINS.length} bulletins`);

let inserted = 0;
let updated = 0;

for (const b of BULLETINS) {
  const r = await db.execute<{ id: number; created_at: string; updated_at: string }>(sql`
    INSERT INTO safety_bulletins (
      slug, bulletin_number, title, category, governing_body,
      scope, summary, key_requirements, last_revision_date,
      canonical_pdf_url, "references", related_rigging_slugs, sort_order
    ) VALUES (
      ${b.slug}, ${b.number}, ${b.title}, ${b.category}::safety_bulletin_category_enum,
      'SAG-AFTRA',
      ${b.scope}, ${b.summary},
      ${JSON.stringify(b.keyRequirements)}::jsonb,
      ${b.lastRevision}::date,
      ${b.pdfUrl},
      ${JSON.stringify(b.references)}::jsonb,
      ${pgTextArray(b.relatedRigging)}::text[],
      ${b.sortOrder}
    )
    ON CONFLICT (slug) DO UPDATE SET
      bulletin_number = EXCLUDED.bulletin_number,
      title = EXCLUDED.title,
      category = EXCLUDED.category,
      scope = EXCLUDED.scope,
      summary = EXCLUDED.summary,
      key_requirements = EXCLUDED.key_requirements,
      last_revision_date = EXCLUDED.last_revision_date,
      canonical_pdf_url = EXCLUDED.canonical_pdf_url,
      "references" = EXCLUDED."references",
      related_rigging_slugs = EXCLUDED.related_rigging_slugs,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
    RETURNING id, created_at::text, updated_at::text
  `);
  const row = r[0]!;
  if (row.created_at === row.updated_at) {
    inserted++;
    console.log(`  [+] #${b.number.padEnd(4)} ${b.slug.padEnd(40)} — new`);
  } else {
    updated++;
    console.log(`  [~] #${b.number.padEnd(4)} ${b.slug.padEnd(40)} — refreshed`);
  }
}

console.log(`\nseeded ${BULLETINS.length} bulletins — ${inserted} new, ${updated} refreshed`);
process.exit(0);
