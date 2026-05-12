// Phase-5 seed for the stunt-rigging glossary.
//
// 25 canonical techniques across the eight category buckets. Each
// entry is original prose synthesizing publicly-known mechanism
// detail (the rigs themselves are not copyrightable; the descriptions
// are written for this archive) plus references to SAG-AFTRA safety
// bulletins where applicable.
//
// `related_discipline_tags` are the strings used on stunt_sequences
// rows so cross-linking works via array overlap on both directions.
//
// Idempotent — ON CONFLICT (slug) DO UPDATE so a re-run merely
// refreshes the editorial pass.
import { db, sql } from '../src/index.ts';

function pgTextArray(arr: string[]): string {
  if (arr.length === 0) return '{}';
  return '{' + arr.map((s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

type RiggingSeed = {
  slug: string;
  name: string;
  category:
    | 'descender' | 'wire' | 'vehicle' | 'fire' | 'fall' | 'fight' | 'aerial' | 'water';
  tagline: string;
  mechanism: string;
  safety: string | null;
  bulletin: string | null;
  variants: Array<{ name: string; description: string }>;
  references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
  photos: Array<{ url: string; caption: string; credit?: string }>;
  tags: string[];
  sortOrder: number;
};

const TECHNIQUES: RiggingSeed[] = [
  // ── descender ────────────────────────────────────────────────────
  {
    slug: 'high-fall-airbag',
    name: 'High-fall airbag',
    category: 'descender',
    tagline:
      'The standard catch for free-falls above roughly 25 feet. A pneumatic bag whose deflation curve absorbs vertical energy progressively rather than abruptly.',
    mechanism:
      `A high-fall airbag is an open-top inflatable mattress sized to the working height of the fall. Compressed air keeps the bag firm during deployment and standby; on impact, the performer sinks into the upper foam layer while the inflation air vents through controlled relief panels (commonly six to twelve panels around the perimeter). The vent geometry is what produces a survivable deceleration curve rather than a hard rebound. Bags are sized in feet of working height — 12-foot, 20-foot, 30-foot are the standard sizes — and rated against drop tests with weighted dummies before each production. The performer must land on their back, dispersing energy across the largest possible surface area; head-first or side-on landings exceed the bag's vent design and produce concussive deceleration.`,
    safety:
      `The bag must be re-pressurised between each take and visually inspected for vent-panel damage. A second performer ("airbag spotter") watches the inflation pressure and flags any partial collapse before the next take. Wind shear above two-storey heights deflects the trajectory enough that a horizontal safety line is run from the launch platform; performers above 60 feet typically wear a back-mounted ratchet that decelerates the last 10 feet, halving the bag's energy load. Bags are not rated for performer recoveries from helicopter heights — that work moves to fan descender or twin-line ratchet rigs.`,
    bulletin: 'SAG-AFTRA Safety Bulletin #14 — Recommendations for the Use of Stunts on Productions',
    variants: [
      { name: 'Open-cell foam catcher', description: 'Used for falls below 12 ft where the airbag is overkill and a foam pad is faster to reset between takes.' },
      { name: 'Twin-bag stack', description: 'Two airbags inflated to different pressures, used when the impact has horizontal travel — the upper bag absorbs the angle, the lower the vertical.' },
    ],
    references: [
      { title: 'High Falls — SAG-AFTRA Stunt & Safety Committee', url: 'https://www.sagaftra.org/safety', publication: 'SAG-AFTRA', kind: 'bulletin' },
      { title: 'How stunt performers do high falls', url: 'https://en.wikipedia.org/wiki/Stunt_double', publication: 'Wikipedia', kind: 'wikipedia' },
    ],
    photos: [],
    tags: ['high-fall', 'fall', 'airbag'],
    sortOrder: 10,
  },
  {
    slug: 'fan-descender',
    name: 'Fan descender',
    category: 'descender',
    tagline:
      'A controlled vertical descent rig where a centrifugal fan brake regulates rope payout. The reference rig for the Burj Khalifa work in Mission: Impossible — Ghost Protocol.',
    mechanism:
      `A fan descender is a fixed-rate descender mounted at the top anchor that pays out steel cable through a centrifugal-fan brake. The fan blades are calibrated to spin against air resistance at the descent rate — typically 6 to 12 feet per second — so the cable feeds smoothly without shock loads. The performer wears a full-body harness clipped through a load-distributing screamer and the cable terminates at a swaged thimble. Unlike a free-rappel where the operator controls speed manually, the fan descender's rate is mechanical and identical on every take, which is why coordinators use it for repeatable visual-effect frames where the descent must hit a mark.`,
    safety:
      `The fan brake must be tested at the daily rated load before talent is rigged. A redundant secondary line — typically a dedicated arrest ratchet — runs in parallel so any single-point failure on the descender cable is caught within 18 inches. The performer must not be placed on the rig until both lines are pretensioned and the catch crew is in position. Cold-weather operation derates the fan's air resistance (denser air = faster descent), so winter work uses a slightly higher-rated brake than the calibrated nominal.`,
    bulletin: 'SAG-AFTRA Safety Bulletin #14',
    variants: [
      { name: 'Magnetic descender', description: 'Same principle but with eddy-current braking via permanent magnets — more compact, no air-density sensitivity, but less heat tolerance for long descents.' },
    ],
    references: [
      { title: 'How Tom Cruise scaled the Burj Khalifa', url: 'https://www.fxguide.com/featured/mission-impossible-ghost-protocol-the-burj-khalifa-stunt/', publication: 'fxguide', kind: 'article' },
    ],
    photos: [],
    tags: ['descender', 'aerial', 'climbing'],
    sortOrder: 20,
  },
  {
    slug: 'decelerator',
    name: 'Decelerator',
    category: 'descender',
    tagline:
      'The hydraulic ratchet rig used to arrest a high-fall in the last 6 to 10 feet, replacing or augmenting an airbag for daylight exterior work where the bag would be visible to camera.',
    mechanism:
      `A decelerator is a hydraulic cylinder that pays out cable under spring tension and arrests it under hydraulic damping. The performer wears a back-mounted carabiner clipped to the cable; on jump, the cable pays out freely through the spring-loaded reel, then transitions into the hydraulic chamber for the last meter or two of travel, producing a controlled negative-acceleration profile rather than the abrupt arrest of a static rope. The decelerator's payout length and damping rate are pre-tuned to the performer's mass and the fall height. Visually, the cable can be wire-rigged below the harness so it disappears against complex backgrounds or is removed in post.`,
    safety:
      `Hydraulic decelerators must be bench-tested at the daily working load and the cable inspected for kink or strand failure before each take. The rig is not safe for falls greater than 60 feet without a parallel airbag underneath as a tertiary catch; the hydraulic chamber's heat dissipation degrades over consecutive takes. After three takes within ten minutes, the chamber temperature is checked and the rig is rested if it exceeds 140°F.`,
    bulletin: 'SAG-AFTRA Safety Bulletin #14',
    variants: [
      { name: 'Twin-line decelerator', description: 'Two parallel hydraulic chambers used for performers above 200 lb or when the fall has horizontal momentum.' },
      { name: 'Spring decelerator', description: 'Lower-precision variant for falls under 25 feet — no hydraulics, just a long spring-loaded cable on a friction reel.' },
    ],
    references: [],
    photos: [],
    tags: ['high-fall', 'fall', 'decelerator'],
    sortOrder: 30,
  },
  {
    slug: 'pole-cat',
    name: 'Pole-cat (telescoping ejector pole)',
    category: 'descender',
    tagline:
      'A pneumatically-actuated telescoping pole used to launch a performer or stunt dummy through a window, off a rooftop, or into a fall in a controllable arc.',
    mechanism:
      `A pole-cat is a multi-stage telescoping pole driven by a high-pressure air cannon at its base. On firing, compressed air drives the inner stages of the pole upward and outward in a tuned arc, carrying the performer (or articulated dummy) through a precisely-calibrated trajectory before the harness release point. The pole's firing-pressure curve and stroke length determine peak velocity and exit angle; coordinators tune both before the take using ballistic-spreadsheet calculations against the performer's mass. The pole is typically rigged behind a practical wall, vehicle, or set element so it remains off-camera; only the exiting performer is seen.`,
    safety:
      `Air-cannon pole-cats are pressure vessels and require the same daily certifications as any rated pneumatic. The launch cone — the vertical arc the performer exits — must be cleared of crew, lighting stands, and camera tracks. A pole-cat firing imparts a 4-to-6-G axial load to the performer; back and neck-injury history disqualifies talent from this rig. Misfires (partial pressurisation) produce a low-velocity launch that drops the performer into the firing zone; a redundant catch crew is positioned regardless of expected trajectory.`,
    bulletin: 'SAG-AFTRA Safety Bulletin #14',
    variants: [
      { name: 'Hydraulic pole-cat', description: 'Slower, more repeatable variant for narrative falls where the launch is on-camera and the air-cannon report would be heard.' },
      { name: 'Lateral pole-cat', description: 'Mounted horizontally to launch a performer or vehicle component sideways — used for window breaches and side-impact car gags.' },
    ],
    references: [],
    photos: [],
    tags: ['pole-cat', 'pneumatic', 'high-fall'],
    sortOrder: 40,
  },

  // ── wire ─────────────────────────────────────────────────────────
  {
    slug: 'ratchet',
    name: 'Ratchet (jerk vest)',
    category: 'wire',
    tagline:
      'The pneumatic-pull rig that yanks a performer backwards or sideways at high speed to sell an explosion, gunshot, or vehicle impact.',
    mechanism:
      `A ratchet is a high-pressure pneumatic cylinder anchored to set with a steel cable terminating in a quick-release shackle on the performer's harness or jerk-vest. On firing, the cylinder rapidly retracts the cable — typically 12 to 20 feet of travel in under a second — yanking the performer in the direction of the anchor. The harness distributes the load across the chest and back so the impulse doesn't concentrate at any single attachment point. Cable speed and pull length are tuned to the desired trajectory: a short, explosive pull simulates a gunshot impact; a longer, smoother pull sells a blast wave. The cable is usually 1/8" or 3/16" aircraft-grade, with the shackle release point landing on a foam pad or airbag rather than a hard surface.`,
    safety:
      `The pull must be calibrated to the performer's mass — over-rated pulls produce whiplash and rib injuries; under-rated pulls dump the performer short of the catch. The harness is fitted before each take and checked for cable kink or fray. The performer's exit trajectory cone is cleared of camera assists, set elements, and crew; the pull operator confirms a clear cone before initiating. A backup quick-release on the vest lets the performer abort if disorientation occurs after the pull.`,
    bulletin: 'SAG-AFTRA Safety Bulletin #14',
    variants: [
      { name: 'Reverse-arc ratchet', description: 'Two ratchets fired in rapid sequence to simulate a body tumbling through an arc, used for blast-wave gags.' },
      { name: 'Air ram', description: 'Low-pressure variant used to pop a performer into the air rather than pull them horizontally.' },
    ],
    references: [
      { title: 'Stunt rigging — practical effects', url: 'https://en.wikipedia.org/wiki/Stunt_double', publication: 'Wikipedia', kind: 'wikipedia' },
    ],
    photos: [],
    tags: ['ratchet', 'jerk-vest', 'pneumatic', 'wire'],
    sortOrder: 10,
  },
  {
    slug: 'wire-flying',
    name: 'Wire-flying rig',
    category: 'wire',
    tagline:
      'The harness-and-pulley system that lifts a performer through prolonged airborne action — the workhorse rig of the post-Crouching Tiger martial-arts era.',
    mechanism:
      `A wire-flying rig consists of a load-bearing harness (typically a sit-harness with thigh and chest reinforcement), one or more 1/8"–3/16" aircraft cables, and a multi-axis pulley system anchored to set or to a portable A-frame above the action. Two-axis rigs use a horizontal track plus a vertical cable to give planar motion; three-axis rigs add a second horizontal cable for full 3D positioning. A team of riggers — usually two to four — hauls or releases cable to control the performer's trajectory in real time, coordinating through hand signals or a single rigger calling timing. Cable visibility is the post-production concern: cables are matched in colour to the background and removed in compositing for any frame where the rig is visible.`,
    safety:
      `Every wire-flying rig requires a redundant safety line carrying the full performer load; the working line is usually rated to twice the performer's mass plus dynamic load, the redundant line to four times. Riggers wear gloves and operate from a fixed station with a clear sightline to the performer; communication is via a single caller who can abort the rig at any point. The performer practices the rigged action at half-speed in a low-load setup before going to full speed. Rotational rigs require a swivel above the harness to prevent twist-up of the cable.`,
    bulletin: 'SAG-AFTRA Safety Bulletin #14',
    variants: [
      { name: 'Pendulum rig', description: 'Single-cable rig where the performer swings through an arc — used for the classic "fall through a window" frame.' },
      { name: 'Track-and-trolley', description: 'Horizontal monorail with motorised trolley, used for sustained flying motion across long distances (Spider-Man swing work).' },
      { name: 'Yoyo rig', description: 'Vertical-only rig for repeated up/down motion — used for hovering and impact-rebound frames.' },
    ],
    references: [
      { title: 'The wire-flying tradition from Hong Kong action cinema', url: 'https://en.wikipedia.org/wiki/Wirework', publication: 'Wikipedia', kind: 'wikipedia' },
    ],
    photos: [],
    tags: ['wirework', 'fly-rig', 'harness'],
    sortOrder: 20,
  },
  {
    slug: 'descender-wire',
    name: 'Descender wire (controlled rappel)',
    category: 'wire',
    tagline:
      'The single-line rig used for sustained vertical descents at narrative speed — the rig under most "elevator shaft" and "skyscraper window" frames.',
    mechanism:
      `A descender wire is a single-line rig with a friction-controlled descender device at the top anchor. Unlike the fan descender's mechanical rate, this rig is operated by a rigger who modulates friction in real time, allowing the performer to start, stop, and accelerate during the descent — useful for narrative beats where the performer pauses to fight or react. The cable is steel-core for fall arrest with a polymer jacket for the rigger's grip. A backup ratchet line runs parallel and locks if the working cable fails. For long descents, the cable is reeved through a multi-stage pulley to give the rigger mechanical advantage so the descent rate stays controllable under high load.`,
    safety:
      `Friction-controlled descenders demand a continuous-attention operator — there is no fail-safe rate built into the device. A second rigger watches the operator and can take over the line if the primary loses focus. Cable temperature rises over consecutive descents; on the third descent within ten minutes the rigger inspects the cable for sheath wear and cycles to a fresh line. Descents above 100 feet move to the fan-descender or twin-line rig family.`,
    bulletin: 'SAG-AFTRA Safety Bulletin #14',
    variants: [],
    references: [],
    photos: [],
    tags: ['descender', 'wirework'],
    sortOrder: 30,
  },

  // ── vehicle ──────────────────────────────────────────────────────
  {
    slug: 'cannon-roll',
    name: 'Cannon-roll',
    category: 'vehicle',
    tagline:
      'The pyrotechnic-driven barrel roll that sends a picture-car flipping end-over-end. The signature shot of the Bond and Mission: Impossible chase tradition.',
    mechanism:
      `A cannon-roll uses a vertical air-cannon (or smaller pyrotechnic charge) mounted in the floor of the picture-car, firing downward through a steel ram-plate pre-positioned on the road surface. On firing, the cannon's reaction force lifts and rotates the vehicle around its longitudinal axis. The roll's geometry is determined by the cannon's mounting position relative to the centre of mass — offset slightly toward the rear lifts the back end into rotation, while a centred cannon produces a flatter spin. The ram-plate is buried just below the road surface so the impact is invisible to camera; the cannon itself fires through a hole cut in the vehicle's floor and is camouflaged. The picture-car is heavily reinforced — full roll cage, six-point belts on the precision driver, fuel cell rather than tank — and stripped of glass on the camera-side windows.`,
    safety:
      `The precision driver wears a HANS device, full fire suit, and uses a fuel cell with a quick-disconnect fitting. The vehicle's roll cage is engineered to maintain occupant survival space through three full rotations even if the roof crumples. Pyrotechnic and pneumatic cannon rolls use different debrief protocols; the pyrotechnic charge requires a 30-second clearance after misfire before approach. Every cannon-roll is preceded by a non-firing dry run with the precision driver and the firing crew rehearsing abort signalling.`,
    bulletin: 'SAG-AFTRA Safety Bulletin #4 — Special Effects',
    variants: [
      { name: 'Pneumatic cannon-roll', description: 'Uses compressed air rather than a pyrotechnic charge — quieter, no pyro-operator licensing, more repeatable but less violent in the visual.' },
      { name: 'Pipe-ramp roll', description: 'Uses a buried steel ramp rather than a cannon — cheaper but less controllable, the roll geometry depends on the impact angle and speed.' },
    ],
    references: [],
    photos: [],
    tags: ['cannon-roll', 'vehicle', 'driving', 'pyrotechnic'],
    sortOrder: 10,
  },
  {
    slug: 'pipe-ramp',
    name: 'Pipe-ramp',
    category: 'vehicle',
    tagline:
      'The buried steel-ramp gag that lifts a moving vehicle into a barrel-roll without a cannon. Lower-budget cousin of the cannon-roll, used for chases where the rotation is less violent.',
    mechanism:
      `A pipe-ramp is a steel ramp — typically a length of large-diameter pipe welded to a baseplate — buried in the road surface so only a few inches of the ramp protrude. On contact at the precision driver's calibrated speed and angle, the leading wheel of the picture-car climbs the ramp and the vehicle is rotated into a roll. The geometry of the roll depends entirely on the impact: too slow and the vehicle simply pops up and lands flat; too fast and it over-rotates. Coordinators run the gag at progressively higher speeds with a remote-piloted dummy car before committing to the principal take. The pipe is buried at a calculated angle relative to the road centreline so the roll axis stays predictable.`,
    safety:
      `Precision driver setup is identical to a cannon-roll — full cage, HANS device, fire suit, fuel cell. Camera-side windows are removed; tow-rig recovery is staged at the predicted landing zone. The biggest risk is mis-impact: hitting the ramp at the wrong angle redirects the rotation toward the camera or crew. The ramp position is surveyed in pre-vis and confirmed against the camera position before each take.`,
    bulletin: 'SAG-AFTRA Safety Bulletin #4',
    variants: [
      { name: 'Lateral pipe-ramp', description: 'Mounted across the lane to flip a vehicle sideways rather than end-over-end.' },
    ],
    references: [],
    photos: [],
    tags: ['pipe-ramp', 'vehicle', 'driving'],
    sortOrder: 20,
  },
  {
    slug: 'precision-driving-pod',
    name: 'Pod-car (precision driving rig)',
    category: 'vehicle',
    tagline:
      'A picture-car driven from a roof-mounted pod by a precision driver while the actor sits inside, free to perform without operating the controls.',
    mechanism:
      `A pod-car (also "buggy" or "biscuit rig") moves the driving controls from the cab of the picture-car to a steel pod welded to the roof. The pod contains a full driver's station — wheel, pedals, gearshift, instrumentation — operated by a precision stunt driver. The pod's steering and throttle are mechanically linked through the roof to the original controls; modern rigs use electronic drive-by-wire actuators on the pedals so the precision driver has the same feel as if seated in the cab. The camera sees only the actor through the windshield, with the pod removed in post-production or shot from below the roofline. The actor performs the entire scene — dialogue, reactions, looking out the window — without operating the vehicle.`,
    safety:
      `The pod position is calibrated so the actor's sightlines to camera don't show pod hardware reflection in the windshield. Two-way intercom between actor and precision driver allows real-time abort. The picture-car retains its original braking system as a redundant safety, operable by the actor in case the pod-driver loses control. Pod-cars increase the vehicle's centre of gravity by 18–24 inches; chase choreography is rehearsed with this in mind to avoid roll-over in cornering.`,
    bulletin: null,
    variants: [
      { name: 'Tow-rig', description: 'No pod — the picture-car is towed by a camera car with the actor in the driver seat reacting to the choreography. Lower budget, less dynamic motion.' },
      { name: 'Russian arm', description: 'Camera-car-mounted gyro-stabilised crane that follows the picture-car at speed — see russian-arm entry.' },
    ],
    references: [
      { title: 'Pod-car driving rigs in modern action', url: 'https://en.wikipedia.org/wiki/Picture_car', publication: 'Wikipedia', kind: 'wikipedia' },
    ],
    photos: [],
    tags: ['precision-driving', 'pod-car', 'vehicle'],
    sortOrder: 30,
  },
  {
    slug: 'russian-arm',
    name: 'Russian arm',
    category: 'vehicle',
    tagline:
      'The gyro-stabilised camera crane mounted on a fast camera-car. The standard tracking rig for vehicle chases since the early 2000s.',
    mechanism:
      `A Russian arm (also "U-Crane" or simply "the arm") is a 4-to-6-metre telescoping crane mounted on the chassis of a heavy chase car. The crane head carries a gyro-stabilised remote head with the camera, electronically isolated from the chase car's motion. The crane operator and head operator sit inside the chase car, working from monitors. The arm extends, retracts, and articulates while the chase car moves at full chase speed alongside the picture-car, allowing the camera to circle, dive, and rise around the action without ever cutting. The crane's hydraulics are tuned to the chase car's suspension so the head-end stays smooth at speeds up to 100 mph.`,
    safety:
      `The chase car requires a trained Russian-arm driver — the dynamic load of the extended arm changes the vehicle's handling envelope significantly. Crew separation between chase and picture cars is calculated for the failure mode of the arm fully extended; in a worst case the arm must not strike the picture-car if the chase car loses traction. Maintenance is intensive — hydraulic seals are replaced after each production and the gyro head is recalibrated daily.`,
    bulletin: null,
    variants: [
      { name: 'Black Bird (BB)', description: 'A specific high-speed tracking vehicle (the Mercedes-AMG-based "Black Bird" by Filmotechnic) that pairs with the Russian arm for the fastest chase work.' },
    ],
    references: [],
    photos: [],
    tags: ['russian-arm', 'camera-car', 'vehicle'],
    sortOrder: 40,
  },

  // ── fire ─────────────────────────────────────────────────────────
  {
    slug: 'gel-suit',
    name: 'Gel suit (full-body burn rig)',
    category: 'fire',
    tagline:
      'The protective layer worn under flammable garments for full-body burn gags. The standard rig for any "stunt performer engulfed in flame" frame.',
    mechanism:
      `A gel suit is a multi-layer rig: an inner Nomex base layer, a layer of fire-retardant gel (typically a methylcellulose-based hydrogel) applied directly to skin, then a second Nomex layer, then the visible costume. The visible costume is treated with a controlled flammable accelerant — historically alcohol-based, increasingly propane-fed — that produces a tall, photogenic flame while the gel layer keeps skin temperatures under 60°C for the rated duration (typically 30 to 60 seconds). The performer breathes through a fire-rated hood and works to a strict choreography: they have a fixed time on fire, after which the safety crew extinguishes them with a fire blanket and CO₂.`,
    safety:
      `A full-body burn requires three crew with extinguishers within five feet of the performer for the entire take, plus a safety officer counting down audible time-on-fire. The performer rehearses an "I'm done" hand signal that triggers immediate extinguish. After-action protocol includes immediate cooling water and medical observation regardless of perceived discomfort — the gel layer's failure mode is silent (skin reaches second-degree burn before the performer feels it). The number of consecutive takes is gated by the safety officer; typically no more than three full burns per performer per day.`,
    bulletin: 'SAG-AFTRA Safety Bulletin #15 — Recommendations for Safety with Fire',
    variants: [
      { name: 'Partial burn', description: 'Lower-risk version where only a sleeve, leg, or back is on fire — gel layer is local rather than full-body.' },
      { name: 'Propane bar', description: 'Costume seams hide propane delivery tubing for a longer, controllable burn — see propane-bar entry.' },
    ],
    references: [
      { title: 'SAG-AFTRA Safety Bulletin #15 — Fire', url: 'https://www.sagaftra.org/safety', publication: 'SAG-AFTRA', kind: 'bulletin' },
    ],
    photos: [],
    tags: ['fire', 'burn', 'gel-suit'],
    sortOrder: 10,
  },
  {
    slug: 'propane-bar',
    name: 'Propane bar / fuel-fed burn',
    category: 'fire',
    tagline:
      'Costume-routed propane tubing that produces a sustained, controllable flame for shots where the performer must remain on-camera and burning for more than 30 seconds.',
    mechanism:
      `A propane bar runs flexible high-pressure propane tubing through hidden seams in the performer's costume, terminating in a row of small jet apertures along the back, arms, or sleeves. A safety operator off-camera controls the propane valve and can cut flame instantly at any frame. The performer wears the same gel-suit layering as a full-body burn underneath; the propane jets feed a more sustained, evenly-distributed flame than alcohol baste, allowing longer takes with cleaner visuals (no flame flicker between alcohol washes). Modern rigs use electronic solenoid valves so the operator can pulse the flame to specific beats in the choreography.`,
    safety:
      `The propane line must be inspected end-to-end before every take and pressure-tested at twice working pressure. The safety operator's valve is a "deadman" type — releasing it cuts flame regardless of any other state. Three extinguisher crew + medic on standby. The performer's gel layer is rated for the maximum take duration plus 50% safety margin. Propane bars are not used in confined spaces (the propane gas pools at floor level if the flame extinguishes before the propane shuts off, creating a flash hazard).`,
    bulletin: 'SAG-AFTRA Safety Bulletin #15',
    variants: [],
    references: [],
    photos: [],
    tags: ['fire', 'burn', 'propane'],
    sortOrder: 20,
  },

  // ── fall ─────────────────────────────────────────────────────────
  {
    slug: 'pad-arrangement',
    name: 'Pad arrangement (catch-pad layout)',
    category: 'fall',
    tagline:
      'The choreographed layering of foam, airbag, and pad elements behind set walls and props that catches a performer hitting an unrehearsed surface during fight choreography.',
    mechanism:
      `A pad arrangement is a multi-layer catch system positioned behind every prop and set wall the performer might be thrown into during a fight take. The outer layer is typically a soft foam mat dressed in matching set scenic so the performer's impact reads as the visual surface; the second layer is a denser closed-cell foam (or an airbag for higher impact); deeper layers absorb the residual energy. For glass impacts, the pad arrangement is positioned beyond the candy-glass break point so the performer fully passes through the breakaway material before hitting the catch. Pad layouts are walked through in real time by the stunt coordinator with the performer before the take; every potential trajectory is matched to a catch.`,
    safety:
      `Every fight rehearsal updates the pad arrangement as choreography evolves. Pad-out checks are conducted before every take, with the stunt coordinator confirming each catch is in position. The performer rehearses the fall onto each catch at quarter speed before going to full speed. Hidden hardware (lighting stands, dolly tracks) within the fall envelope is removed or padded.`,
    bulletin: 'SAG-AFTRA Safety Bulletin #14',
    variants: [],
    references: [],
    photos: [],
    tags: ['fall', 'pad-out', 'fight'],
    sortOrder: 10,
  },
  {
    slug: 'breakaway-glass',
    name: 'Breakaway glass / candy glass',
    category: 'fall',
    tagline:
      'The sugar-resin glass substitute that shatters dramatically without lacerating, used for window-breach falls and bottle-strike fights.',
    mechanism:
      `Breakaway glass is a sugar-and-resin compound (historically true sugar-glass, now typically a polyurethane or proprietary resin) cast into window panes, bottles, lampshades, and other glass props. On impact, the material fractures into chunks too soft to lacerate skin while producing the visual appearance of shattered glass. Modern formulations behave more realistically — clean fracture lines, rotational shard distribution, and scattering on the floor that matches real glass for camera. Any prop that the performer's body passes through, lands on, or strikes is breakaway; everything that's just dressed in the background can be real glass.`,
    safety:
      `The performer wears a long-sleeved Nomex base layer or similar abrasion-resistant garment under the visible costume. After every take, the floor is cleared of breakaway debris before the next take or before any other crew enter the working area; some breakaway formulas absorb moisture and become slippery underfoot. Performers and crew never touch breakaway material until coordinator confirms it has cured; freshly-cast resin glass can produce splinters before full cure.`,
    bulletin: null,
    variants: [
      { name: 'Sugar-glass', description: 'The original formulation — true cooked sugar resin. Cheaper, but absorbs moisture and degrades quickly under hot lights.' },
      { name: 'Resin breakaway', description: 'Modern polyurethane formulation — colour-stable, less moisture-sensitive, cleaner fracture pattern.' },
    ],
    references: [
      { title: 'Sugar glass — props history', url: 'https://en.wikipedia.org/wiki/Sugar_glass', publication: 'Wikipedia', kind: 'wikipedia' },
    ],
    photos: [],
    tags: ['breakaway', 'glass', 'props'],
    sortOrder: 20,
  },
  {
    slug: 'stair-fall',
    name: 'Stair fall',
    category: 'fall',
    tagline:
      'The choreographed multi-step tumble that sells a violent fall down a staircase. Performed by trained tumblers, not improvised — every contact is rehearsed.',
    mechanism:
      `A stair-fall is a sequence of pre-choreographed contacts between the performer and the staircase. Each step's impact is taken on a specific body part — typically alternating shoulder and hip — with rotational momentum carrying the performer to the next step rather than letting the body strike a step head- or back-first. The stair surface is padded with thin closed-cell foam dressed to match the visual of bare stairs (the foam is invisible at camera distance and is tuned in thickness so the performer doesn't bottom out on hard step edges). The fall is choreographed to land at a specific bottom-of-stairs position where a deeper pad arrangement catches the final impact.`,
    safety:
      `Stair-falls are classified higher-risk than horizontal-surface tumbling because of the cumulative impacts. Performers wear rib protectors, hip pads, and a back-supporting belt under costume. Take counts are limited — typically two or three per shoot day — and a medic checks the performer between takes. Newer rigs use a thin energy-absorbing carpet (essentially a structured-foam runner) over the stair tread that's invisible to camera but raises the effective compliance.`,
    bulletin: null,
    variants: [],
    references: [],
    photos: [],
    tags: ['fall', 'stair-fall', 'tumbling'],
    sortOrder: 30,
  },

  // ── fight ────────────────────────────────────────────────────────
  {
    slug: 'reactive-camera',
    name: 'Reactive-camera fight choreography',
    category: 'fight',
    tagline:
      'The post-Bourne / post-John Wick choreography style where camera motion is choreographed alongside the fight itself, so impact reads through camera shake and proximity rather than wide framing.',
    mechanism:
      `Reactive-camera choreography integrates the camera's motion into the fight beat sheet. Rather than blocking a wide shot and letting actors play the fight at speed, every punch, throw, and reposition is paired with a specific camera move — a push-in, a tilt, a hard whip-pan — that times to the contact frame. The fight choreographer and operator work together from the rehearsal stage; the choreography document includes camera notes alongside performer notes. Modern variants use multi-camera coverage with a dedicated "react cam" handheld operator who's choreographed into the geography of the fight, sometimes within arm's reach of the performers.`,
    safety:
      `Reactive cameras within the fight envelope create a contact risk: the operator becomes part of the choreography but doesn't have stunt training. Coordinators run the fight at half-speed for the camera team to learn their geography before going to performance speed. A fixed-position safety operator monitors for any deviation that would put the camera or operator into a contact path.`,
    bulletin: null,
    variants: [
      { name: 'Snorricam', description: 'Camera mounted to the performer\'s body so the performer is fixed in frame while the world moves around them — the inverse of the reactive cam.' },
      { name: 'Subject-locked telephoto', description: 'Long-lens setup where the operator manually keeps the subject framed during high-speed action; produces compressed-perspective hits without crew in the action envelope.' },
    ],
    references: [
      { title: 'Every Frame a Painting — In Praise of Chairs', url: 'https://www.youtube.com/c/everyframeapainting', publication: 'Every Frame a Painting', kind: 'video' },
    ],
    photos: [],
    tags: ['fight', 'choreography', 'camera-style'],
    sortOrder: 10,
  },
  {
    slug: 'gun-fu',
    name: 'Gun-fu (close-quarter firearm choreography)',
    category: 'fight',
    tagline:
      'The combat-shooting choreography style codified by 87Eleven on the John Wick franchise: extended one-take sequences blending firearm handling with martial-arts striking and grappling.',
    mechanism:
      `Gun-fu choreography integrates firearm clearance, magazine changes, and weapon transitions into the same beat structure as a martial-arts fight. Performers train with rubber and resin-cast weighted weapons through choreography, then transition to non-firing replicas for full-speed rehearsal, then to functional firearms loaded with quarter-load blank rounds (or full-load blanks for muzzle flash) for the take. The choreography emphasises functional gun-handling — proper grip, sight alignment, controlled trigger pull — even when the gunfire is blank, so the performer's movement reads as practiced rather than theatrical. Reload moments are choreographed beats; the tactical reload, magazine drop, and re-engagement all happen at specific story moments.`,
    safety:
      `Blank-fired firearms are firearms — every SAG-AFTRA Bulletin #1 firearm-safety protocol applies (no live rounds within 50 feet of a working camera, no firearm pointed at any person, propmaster controls all weapons not in a performer's hand). Performers train with a firearms instructor before the production; coordinators verify weapon-handling competency during rehearsal. The choreography includes "muzzle aware" beats where the performer's weapon is angled away from the lens and crew during reset.`,
    bulletin: 'SAG-AFTRA Safety Bulletin #1 — Recommendations for Safety with Firearms',
    variants: [],
    references: [
      { title: 'How John Wick redefined action choreography', url: 'https://variety.com/2019/film/news/john-wick-stunt-choreography-1203221056/', publication: 'Variety', kind: 'article' },
    ],
    photos: [],
    tags: ['gun-fu', 'fight', 'firearms', 'martial-arts'],
    sortOrder: 20,
  },
  {
    slug: 'padded-weapon',
    name: 'Padded / breakaway weapon',
    category: 'fight',
    tagline:
      'The non-functional fight weapons — foam cores under skinned costume, balsa-and-resin breakaways — that allow contact strikes without injury.',
    mechanism:
      `Padded weapons substitute foam, gel, or balsa-and-resin construction for the metal, glass, or hardwood of a "real" weapon. A foam-core sword has a flexible inner spine wrapped in dense closed-cell foam shaped and skinned to match the prop. A breakaway bottle is balsa-and-resin in the strike zone with a real bottle base for handling shots. Coordinators carry multiple variants of each prop for different contact requirements: hero (real, for handling), padded (for strikes against a person), breakaway (for impact-against-prop strikes that destroy the weapon).`,
    safety:
      `Even padded weapons can produce concussive impact at full strike speed. Choreography limits direct head contact regardless of pad rating; throat, eye, and groin contact is blocked out of choreography. After each take, weapons are inspected for foam compression or balsa damage that would change the next take's behaviour.`,
    bulletin: null,
    variants: [
      { name: 'Resin-cast firearm', description: 'Non-functional weighted resin cast of a working firearm — used for grappling and strike beats where a real firearm couldn\'t be safely handled.' },
      { name: 'Rubber knife', description: 'Flexible-core rubber knife — the standard for close-quarters edged-weapon choreography.' },
    ],
    references: [],
    photos: [],
    tags: ['fight', 'props', 'padded-weapon'],
    sortOrder: 30,
  },

  // ── aerial ───────────────────────────────────────────────────────
  {
    slug: 'helicopter-mount',
    name: 'Helicopter mount (external stunt platform)',
    category: 'aerial',
    tagline:
      'External hard-mount platform on a stunt-rated helicopter, used for sustained aerial performance work — Tom Cruise\'s helicopter chase in Fallout, every modern airbase boarding sequence.',
    mechanism:
      `A helicopter stunt mount is an external steel platform welded to the airframe at FAA-certified hardpoints, typically on the skid struts or fuselage side. The performer wears a redundant fall-arrest system: working harness clipped to the platform, plus a separate emergency line clipped to a different hardpoint. The platform's geometry is designed to keep the performer outside the rotor disk and outside the tail-rotor envelope at all flight regimes the production will fly. Production aviation coordinators clear the rig with the FAA and run progressively-higher-speed rehearsals — hover, low forward flight, full forward flight — before the camera-ready take.`,
    safety:
      `Every stunt aviation rig is FAA Part 91 / 133 inspected and the pilot is rated for external load. Performer training includes ditching procedure (immediate water egress with the harness) and rotor-strike avoidance. Maximum airspeed for an externally-rigged performer is typically 80–100 kts depending on platform; above that the wind shear exceeds the performer's harness control. Cold-weather aerial work uses thermal layering since exposure on an external platform at 100 kts produces 3-to-4-minute hypothermic windows.`,
    bulletin: 'SAG-AFTRA Safety Bulletin #14',
    variants: [
      { name: 'Helicopter-to-vehicle transfer', description: 'Performer descends from helicopter to a moving vehicle on a fast-rope or ratchet; rehearsed extensively at low speed before performance pace.' },
      { name: 'Hovering platform', description: 'Helicopter holds a stationary hover above set; performer drops via fast-rope rather than the helicopter performing forward flight.' },
    ],
    references: [
      { title: 'Mission: Impossible — Fallout helicopter sequence', url: 'https://www.fxguide.com/featured/inside-the-mission-impossible-fallout-helicopter-stunt/', publication: 'fxguide', kind: 'article' },
    ],
    photos: [],
    tags: ['aerial', 'helicopter', 'mount'],
    sortOrder: 10,
  },
  {
    slug: 'wingsuit',
    name: 'Wingsuit BASE',
    category: 'aerial',
    tagline:
      'High-altitude wingsuit performance — Mission: Impossible has used it; almost no other narrative production has.',
    mechanism:
      `A wingsuit BASE jump is performed by a wingsuit-rated stunt performer wearing a multi-cell tracking suit and a specialised low-altitude parachute. The performer exits from a fixed object (cliff, antenna, building) or from a helicopter at altitude. The wingsuit converts vertical speed into horizontal glide — modern suits achieve glide ratios above 3:1 — letting the performer track a controlled flight path past terrain or set features before deploying the parachute at safe altitude. For narrative work, the camera rig is a forward-facing or rear-facing helmet-mount on either the performing wingsuiter or a chase wingsuiter flying in formation.`,
    safety:
      `Wingsuit performance is one of the highest-risk rigs in the working stunt envelope. Only multi-thousand-jump wingsuit pilots are rated for narrative work; the production carries dedicated aviation insurance separate from the SAG-AFTRA stunt rider. Weather and altitude windows are extremely narrow (no precipitation, no above-threshold turbulence, visibility above the deployment-altitude minimum). The production has a rescue helicopter on standby for the duration of any jump.`,
    bulletin: 'SAG-AFTRA Safety Bulletin #14',
    variants: [],
    references: [],
    photos: [],
    tags: ['aerial', 'wingsuit', 'parachute'],
    sortOrder: 20,
  },

  // ── water ────────────────────────────────────────────────────────
  {
    slug: 'underwater-tank',
    name: 'Underwater performance tank',
    category: 'water',
    tagline:
      'Purpose-built underwater shooting tank — the rig under Avatar: The Way of Water and Wakanda Forever\'s underwater work.',
    mechanism:
      `An underwater performance tank is a heated freshwater pool engineered for camera and performer access at multiple depths, typically 15–40 feet. The tank includes underwater camera mounts on tracks, performer-rated breath training and rebreather support, and a multi-station safety-diver crew positioned at every working depth. Performers train for breath-hold (typically progressing to 3–5 minute working capacity) before production; for sequences that require longer continuous shots, performers use compact open-circuit regulators hidden in costume seams or, for bigger productions, full-face rebreathers integrated into character makeup. Lighting is via underwater HMI fixtures rated for full submersion plus surface-mounted bounce arrays directing light through the surface.`,
    safety:
      `Every underwater performance crew includes safety divers at a 1:1 ratio with performers, plus a topside dive-master and a hyperbaric-trained medic on standby. Performers are checked for ear-pressure equalisation between every take; consecutive takes are gated by surface-interval rules borrowed from recreational dive tables. Rebreather rigs are bench-tested daily with a calibrated CO₂ monitor; the failure mode of an undetected CO₂ build-up is loss of consciousness without warning.`,
    bulletin: 'SAG-AFTRA Safety Bulletin #16 — Recommendations for Safety with Animals & Underwater',
    variants: [
      { name: 'Open ocean', description: 'Performance moves to the open ocean — adds current, wildlife, and visibility variability; usually paired with a tank for primary coverage and ocean for inserts.' },
      { name: 'Wave tank', description: 'Tank with a paddle-wave generator simulating sea-state — used for surface-fight and capsizing sequences.' },
    ],
    references: [
      { title: 'How Avatar: The Way of Water filmed underwater', url: 'https://beforesandafters.com/2023/01/06/avatar-2-underwater-cinematography/', publication: 'befores & afters', kind: 'article' },
    ],
    photos: [],
    tags: ['water', 'underwater', 'tank'],
    sortOrder: 10,
  },
  {
    slug: 'water-cannon',
    name: 'Water cannon / dump-tank',
    category: 'water',
    tagline:
      'Large-volume controlled water release used for storm sequences, hull breaches, and engineered tidal moments — see Master and Commander, Kon-Tiki.',
    mechanism:
      `A dump-tank is a large overhead reservoir (typically thousands of gallons) released through a programmable valve onto the performance area. A water cannon is the same volume routed through a directional nozzle for horizontal impact. Both rigs are calibrated to deliver a specific volume at a specific velocity for a specific duration — the choreography document specifies the dump in cubic-feet-per-second at each beat. Performers wear life vests under costume, take their performance positions on safety-line tethers anchored to the floor outside the dump cone, and the take begins on the safety officer's clearance.`,
    safety:
      `A dump of significant volume is fundamentally an industrial hazard. Performer separation from the dump-cone center is calculated against worst-case overshoot from the valve. Tethers are inspected before every take. After a dump, the working area is checked for displaced set elements, injured performers, and any dewatering issues that would affect subsequent takes. Cold-water dumps use heated water raised to skin-safe temperature; even a brief exposure to unheated water above 80 lb-volume can produce hypothermia risk.`,
    bulletin: 'SAG-AFTRA Safety Bulletin #16',
    variants: [],
    references: [],
    photos: [],
    tags: ['water', 'dump-tank', 'water-cannon'],
    sortOrder: 20,
  },
];

console.log(`seed-stunt-rigging — ${TECHNIQUES.length} techniques`);

let inserted = 0;
let updated = 0;

for (const t of TECHNIQUES) {
  const r = await db.execute<{ id: number; created_at: string; updated_at: string }>(sql`
    INSERT INTO stunt_rigging_techniques (
      slug, name, category, tagline, mechanism,
      safety_considerations, sag_aftra_bulletin,
      common_variants, "references", photos,
      related_discipline_tags, sort_order
    ) VALUES (
      ${t.slug}, ${t.name}, ${t.category}::stunt_rigging_category_enum,
      ${t.tagline}, ${t.mechanism},
      ${t.safety}, ${t.bulletin},
      ${JSON.stringify(t.variants)}::jsonb,
      ${JSON.stringify(t.references)}::jsonb,
      ${JSON.stringify(t.photos)}::jsonb,
      ${pgTextArray(t.tags)}::text[],
      ${t.sortOrder}
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      tagline = EXCLUDED.tagline,
      mechanism = EXCLUDED.mechanism,
      safety_considerations = EXCLUDED.safety_considerations,
      sag_aftra_bulletin = EXCLUDED.sag_aftra_bulletin,
      common_variants = EXCLUDED.common_variants,
      "references" = EXCLUDED."references",
      photos = EXCLUDED.photos,
      related_discipline_tags = EXCLUDED.related_discipline_tags,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
    RETURNING id, created_at::text, updated_at::text
  `);
  const row = r[0]!;
  if (row.created_at === row.updated_at) {
    inserted++;
    console.log(`  [+] ${t.slug.padEnd(28)} — new`);
  } else {
    updated++;
    console.log(`  [~] ${t.slug.padEnd(28)} — refreshed`);
  }
}

console.log(`\nseeded ${TECHNIQUES.length} rigging techniques — ${inserted} new, ${updated} refreshed`);
process.exit(0);
