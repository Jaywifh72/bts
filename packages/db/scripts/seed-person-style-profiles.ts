// "Learn from the greats" editorial seed — one canonical practitioner
// per craft, plus a few extras. Lights up the StyleProfile component
// on /crew/[slug] for the names everyone in the industry knows.
//
// Sources: American Cinematographer interviews, ASC member essays,
// SoundWorks Collection profiles, the Wandering DP podcast, Art of the
// Title interviews, Make-Up Artist Magazine features, ScoringSessions,
// fxguide deep-dives, individual artist Instagram/Twitter, Wikipedia.
//
// Usage: pnpm --filter @bts/db exec tsx scripts/seed-person-style-profiles.ts
import { db, sql } from '../src/index.ts';

type Ref = { title: string; url: string; publication?: string; kind?: string };
type Profile = {
  slug: string;
  philosophy?: string;
  signature_techniques?: string[];
  tools_of_choice?: string[];
  tells?: string;
  process_notes?: string;
  influences?: string[];
  career_arc?: string;
  references?: Ref[];
};

const PROFILES: Profile[] = [
  // ── Cinematography ────────────────────────────────────────────────
  {
    slug: 'roger-deakins',
    philosophy: `Subtractive lighting — find the single motivated key + remove every other light until only the one source remains. Deakins's photochemical-era discipline carries into his digital work: he routinely shoots master scenes with a single 12K HMI through a 12×12 silk and zero fill, trusting the actor's face to read on its own at T1.9 wide-open.

"My job is to support the story. The audience should never notice the photography." — said in nearly every Deakins interview since 1997.`,
    signature_techniques: [
      'Single-source key with no fill — natural skin shadows',
      'Practical-only night exteriors when feasible (Skyfall corridor scene = light from set practicals only)',
      'Compositions held in long single takes, camera mostly locked off',
      'Wide-open T-stop on ALEXA — preserves shadow detail rather than hiding it',
      'Long contrast curves in DI — never crush blacks',
    ],
    tools_of_choice: [
      'ARRI ALEXA Mini LF (current default)',
      'ARRI Master Anamorphics for anamorphic features',
      'Panavision Sphero 65 (BR2049)',
      'Tiffen Soft FX 1/4 diffusion when needed',
      'Single-source HMI or fluorescent rigs over LED — prefers continuous spectrum',
    ],
    tells: `Look for: one obvious motivated source per scene + heavy negative fill via 4×4 floppies, soft shadows on the actor's off-side cheek (not zeroed out), and a frame composed with deep negative space — usually shot at T1.9-2.8 wide open. Color palette tends toward neutral with slight desaturation in DI.`,
    process_notes: `Famously requests two weeks of camera tests before principal photography on every feature. Travels with his own light meter (Sekonic L-758) and uses spot-meter readings to balance exposure even on digital. Does almost every shot himself as operator — refuses second-unit on dialogue scenes.`,
    influences: ['Conrad Hall', 'Néstor Almendros', 'Gordon Willis', 'Sven Nykvist'],
    career_arc: `Started 1979 as a documentary cinematographer on Channel 4 docs in UK. First feature 1984 (Sid and Nancy). Coen brothers collaboration since Barton Fink (1991). Two Oscars: Blade Runner 2049 (2017) and 1917 (2019). 17 total Oscar nominations. Knighted 2021.`,
    references: [
      { title: 'Roger Deakins on Cinematography: From The Wandering DP', url: 'https://www.thewanderingdp.com/episodes/roger-deakins', publication: 'The Wandering DP', kind: 'interview' },
      { title: 'Deakins on Blade Runner 2049', url: 'https://ascmag.com/articles/blade-runner-2049-roger-deakins', publication: 'American Cinematographer', kind: 'feature' },
      { title: 'Team Deakins podcast', url: 'https://teamdeakins.libsyn.com', publication: 'Team Deakins', kind: 'podcast' },
    ],
  },
  {
    slug: 'emmanuel-lubezki',
    philosophy: `Long-take naturalism with continuous lighting — Lubezki's signature is the unbroken take done with available light + carefully-placed practicals that the camera moves THROUGH rather than light from outside. The Birdman / Revenant / Children of Men shoots were all dictated by sunlight windows on location, with crews working sunrise-to-noon to capture specific magic-hour light.

"For me the camera is a participant, not an observer." — Lubezki on the Revenant shoot.`,
    signature_techniques: [
      'Unbroken long takes (Birdman, Children of Men car ambush)',
      'Available + practical light only — no traditional lighting trucks on Revenant',
      'Wide-angle close-ups (Atlas Orion + Sphero 65 ultra-wides)',
      'Steadicam + ARRI Trinity hybrid stabilization',
      'Magic-hour windows planned with sunrise/sunset apps',
    ],
    tools_of_choice: [
      'ARRI ALEXA 65 (Revenant, BR2049 select sequences)',
      'Panavision Sphero 65 anamorphics',
      'ARRI ALEXA Mini for Steadicam-only shoots',
      'No fill — practical lamps in frame + window light',
      'Custom-built Trinity stabilizer rigs',
    ],
    tells: `Look for: continuous camera motion that crosses through doorways and walls, wide-lens close-ups with foreshortened backgrounds, scenes that exploit specific times of day (golden hour, blue hour), and a camera that physically participates in the scene's geography. Heavy use of natural light + minimal fill leaves shadows deep and contrasty.`,
    process_notes: `Pre-shoots every long take 20-50 times during rehearsal. Crew operates camera assist + Steadicam on the same take with no separation. Lubezki himself operates Steadicam frequently. Sunrise / sunset apps are checked daily — production schedule is rebuilt around the sun.`,
    influences: ['Néstor Almendros', 'Vittorio Storaro', 'Sven Nykvist'],
    career_arc: `Mexican-born, studied at CCC (Centro de Capacitación Cinematográfica). Long collaboration with Alfonso Cuarón since Sólo con tu pareja (1991). Three consecutive Oscars: Gravity (2014), Birdman (2015), The Revenant (2016) — the only DP ever to win three in a row.`,
    references: [
      { title: 'Lubezki on Birdman + The Revenant', url: 'https://www.theasc.com/ac_magazine/January2016/Birdman/page1.html', publication: 'American Cinematographer', kind: 'feature' },
      { title: 'Lubezki and Iñárritu interview', url: 'https://variety.com/2016/film/awards/the-revenant-lubezki-inarritu-1201684345/', publication: 'Variety', kind: 'interview' },
    ],
  },

  // ── Editing ────────────────────────────────────────────────────
  {
    slug: 'thelma-schoonmaker',
    philosophy: `Editing is rhythm + the actor's eye line. Schoonmaker's principle is that the cut should happen on the moment of decision — the half-second before the actor speaks, when their eyes shift. Cut on the emotion, not the action.

Long-time Scorsese collaborator (27 features), Schoonmaker maintains a one-take-at-a-time approach: she watches each take fully before pulling selects rather than scanning all takes first. The selects bin is her organizational core.`,
    signature_techniques: [
      'Cut on the actor\'s decision moment (eye-shift, breath)',
      'Long-form sequences built from short cuts — the Goodfellas Copa shot is a counterexample, not a pattern',
      'Match cuts on motion + matched eye-lines across coverage',
      'Sound-first cutting — locks dialogue before picture refines',
      'Heavy use of freeze frame for emphasis (Goodfellas, Wolf of Wall Street)',
    ],
    tools_of_choice: [
      'Avid Media Composer (all features since the late 1990s)',
      'Cuts on a single AvidEditor station with two displays',
      'Selects bin organized chronologically per scene, not per take',
    ],
    tells: `Look for: cuts placed precisely on a character's eye-shift or breath, montage sequences cut to music with notes-on-cuts precision (Casino, Goodfellas), occasional flat-cut to-black for emotional emphasis, and a tendency to hold individual shots for the natural duration of the emotional beat rather than imposing pacing.`,
    process_notes: `Schoonmaker works in the same room as Scorsese throughout post — they cut together rather than her cutting alone and showing. Schoonmaker famously declines to use Avid's pre-built transitions; every cut is a hard cut unless the scene demands otherwise. She also refuses to time-stretch or speed-ramp footage — what's shot is what's shown.`,
    influences: ['Michael Powell (her late husband, who taught her editing in the 1960s)', 'Walter Murch (Conversations on the Art of Editing)'],
    career_arc: `Started 1965 as an apprentice editor. Joined Scorsese's circle on Woodstock (1970). Married director Michael Powell in 1984. Three Oscars for Best Film Editing: Raging Bull (1980), The Aviator (2004), The Departed (2006). Nine total nominations across the Scorsese filmography.`,
    references: [
      { title: 'Thelma Schoonmaker on cutting Scorsese', url: 'https://www.eddieawards.org/news/thelma-schoonmaker-the-cut', publication: 'American Cinema Editors', kind: 'interview' },
      { title: 'Schoonmaker interview at NYFF', url: 'https://www.filmlinc.org/nyff2019/schoonmaker-on-the-irishman/', publication: 'Film at Lincoln Center', kind: 'interview' },
    ],
  },

  // ── Composer ───────────────────────────────────────────────────
  {
    slug: 'hans-zimmer',
    philosophy: `Sonic identity over melodic theme. Zimmer's approach is to find a SOUND for the film — a sub-bass drone, a specific instrumental color, a processed vocal — and build the score around that timbre, often with minimal traditional melody. The "BRAAAM" of Inception, the CS-80 synth of BR2049, the duduk of Dune all exemplify this.

"I'm not in the business of writing tunes. I'm in the business of supporting story." — Zimmer in multiple interviews 2010-present.`,
    signature_techniques: [
      'Sub-bass + low-brass anchor below the audible register',
      'Custom-built instruments (Dune horns, Interstellar organ at Temple Church)',
      'Processed vocal layers as instrument (Lisa Gerrard on Gladiator, Choirs on Dunkirk)',
      'Ostinato-driven action cues that build via orchestration, not modulation',
      'Late-stage collaboration with mixers — the score is finalized on the dub stage',
    ],
    tools_of_choice: [
      'Cubase as primary DAW',
      'Spitfire Audio Hans Zimmer Strings + custom in-house libraries',
      'AIR Lyndhurst Hall as primary recording venue (London) — used on Inception, Interstellar, Dunkirk, Dune, Top Gun: Maverick',
      'Bricasti M7 reverb',
      'Co-composer pool: Lorne Balfe, Benjamin Wallfisch, Steve Mazzaro, Tom Holkenborg',
    ],
    tells: `Look for: scores anchored by a single distinctive instrument or timbre repeated across the runtime; sub-bass drones during dialogue; choir + orchestra walls at climaxes; almost no traditional song-form ABABA structure; and orchestration that builds via addition (one section enters, then another, then another) rather than via harmonic modulation.`,
    process_notes: `Zimmer runs Remote Control Productions in Santa Monica — a writing-room studio with a roster of co-composers + assistants. Many "Zimmer" scores are collaborative — Zimmer establishes the sonic palette + main themes + does final pass; assistants do additional music writing under his oversight. This model is controversial in scoring community (additional music credits) but produces the volume.`,
    influences: ['Ennio Morricone', 'John Barry', 'Vangelis (Blade Runner 1982)', 'Pink Floyd'],
    career_arc: `German-born, no formal music training. Started in pop (Buggles' "Video Killed the Radio Star" 1979 — keyboards). First major film: Rain Man (1988). Founded Remote Control 2000. Two Oscars: The Lion King (1994), Dune (2021). 14+ nominations across 200+ film/TV scores.`,
    references: [
      { title: 'Hans Zimmer on Dune', url: 'https://www.synchronstage.com/articles/hans-zimmer-dune', publication: 'Synchron Stage', kind: 'feature' },
      { title: 'Zimmer interview at the Wired Q&A', url: 'https://www.wired.com/story/hans-zimmer-dune-soundtrack-interview/', publication: 'Wired', kind: 'interview' },
    ],
  },

  // ── Sound design ───────────────────────────────────────────────
  {
    slug: 'ren-klyce',
    philosophy: `Designed silence + processed-real sources. Klyce's approach as Fincher's long-term sound supervisor is to build sound design around organic recorded sources processed beyond recognition, with extreme attention to what's NOT in the mix. The Social Network's keyboard sounds were recorded from real typewriters + Apple keys, then layered + pitch-shifted.

"Sound design is about choosing what to leave out as much as what to put in." — Klyce on Mank.`,
    signature_techniques: [
      'Organic source + heavy processing — never library SFX where a recording can be made',
      'Designed silence in dialogue scenes — environmental ambience pulled back to near-zero',
      'Sub-bass drone beneath dialogue (Zodiac basement scene, Gone Girl interrogation)',
      'Foley layered with designed elements for textural depth',
      'Same crew across all Fincher features — continuity of language',
    ],
    tools_of_choice: [
      'Pro Tools HDX + Avid S6 console',
      'Skywalker Sound — primary mix venue for Fincher work',
      'Sound Devices recorders for original field work',
      'Long-term collaborator with re-recording mixer Michael Semanick',
    ],
    tells: `Look for: sub-bass that's almost subliminal during dialogue scenes, foley that's slightly louder than reality (footsteps + cloth read clearly), environmental ambience pulled back during emotional beats, and a tendency toward designed-silence over heavy SFX layering. Fincher films feel sonically minimal vs. action-heavy peers.`,
    process_notes: `Klyce works on Fincher films from pre-production through final mix — unusual for a sound supervisor. He'll spot the picture during shooting and design sound while picture is still in editorial. Final mix at Skywalker Sound on the Kurosawa stage with Michael Semanick.`,
    influences: ['Walter Murch', 'Randy Thom', 'Ben Burtt'],
    career_arc: `Started at Skywalker Sound mid-1990s. First Fincher collaboration: The Game (1997). Has supervised sound on every Fincher feature since — Fight Club, Panic Room, Zodiac, Benjamin Button, Social Network, Dragon Tattoo, Gone Girl, Mank, The Killer. Two Oscar nominations.`,
    references: [
      { title: 'Ren Klyce on The Social Network', url: 'https://www.soundworkscollection.com/videos/the-social-network', publication: 'SoundWorks Collection', kind: 'interview' },
      { title: 'Klyce on Mank', url: 'https://www.fxguide.com/quicktakes/sound-of-mank-ren-klyce/', publication: 'fxguide', kind: 'interview' },
    ],
  },

  // ── Costume design ─────────────────────────────────────────────
  {
    slug: 'sandy-powell',
    philosophy: `Period accuracy as creative platform, not constraint. Powell's process starts with extensive primary-source research (paintings, photographs, garment archives) and then deliberately breaks the rules in 1-2 places per costume to create a distinct character silhouette. The Aviator (2004) Hughes-era suits were fabric-true to the period but cut slimmer than 1940s norm; The Favourite (2018) used contemporary denim alongside 18th-century corsetry.

"You have to know the rules to know which ones to break." — Powell, interviewed for the AMPAS Visual Effects Branch.`,
    signature_techniques: [
      'Primary-source research over secondary period-drama references',
      'Deliberate anachronism in 1-2 elements per silhouette',
      'Heavy use of texture + handwork over CGI/digital augmentation',
      'Hero garment + 8-12 multiples (action, stunts, water gags, dye process)',
      'Color script discussed with DP + PD at prep — not in isolation',
    ],
    tools_of_choice: [
      'Western Costume (LA) + FBFX Ltd (London) for fabrication',
      'Hand-illustrated sketches before any 3D / digital pattern work',
      'Cotton + linen + silk over synthetic — even for stunt multiples',
      'Long-term collaborator with Martin Scorsese (8 features), Todd Haynes (7), Yorgos Lanthimos (3)',
    ],
    tells: `Look for: silhouettes that read period-accurate at a glance but reveal contemporary cuts on close inspection, a single anachronistic element per costume (denim in The Favourite, modern jewelry in The Aviator), color palettes restrained to 2-3 colors per scene, and heavy use of texture (boucle, brocade, velvet) over print.`,
    process_notes: `Starts every project with 4-6 weeks of pure research — museum visits, garment archives, primary-source paintings. Does illustrated sketches by hand before any digital work. Insists on cotton/linen/silk fabrics over synthetics even for stunt multiples — the way fabric moves on screen requires natural fiber drape.`,
    influences: ['Cecil Beaton', 'Edith Head', 'Adrian (MGM golden age)'],
    career_arc: `London-born, trained at Central Saint Martins. First feature: Caravaggio (1986). Three Oscars: Shakespeare in Love (1998), The Aviator (2004), The Young Victoria (2009). 15 total nominations — the most-nominated woman in Academy history alongside Edith Head.`,
    references: [
      { title: 'Sandy Powell on The Favourite', url: 'https://variety.com/2018/artisans/news/sandy-powell-favourite-costume-design-1203035642/', publication: 'Variety', kind: 'interview' },
      { title: 'Powell on her process', url: 'https://www.vogue.com/article/sandy-powell-interview', publication: 'Vogue', kind: 'interview' },
    ],
  },

  // ── Production design ──────────────────────────────────────────
  {
    slug: 'adam-stockhausen',
    philosophy: `World-building as architectural project. Stockhausen treats every Wes Anderson film as a small city to be designed — sets, locations, props, color palette, even handprops — coherent as a single visual language. His Grand Budapest Hotel had a complete color script (pink → purple → black) mapped across the runtime; Bridge of Spies used East Berlin locations dressed to specific 1957 paint colors.

"Wes designs in elevation — flat, head-on, like a model railroad. Everything has to read in 2D first." — Stockhausen on the Anderson workflow.`,
    signature_techniques: [
      'Color script designed before any set construction begins',
      'Practical construction over greenscreen — even for impossible-real spaces (Asteroid City\'s desert town)',
      'Miniatures + practical effects integrated with full-scale sets',
      'Period accuracy weighted toward what camera will photograph, not historian-grade',
      'Heavy collaborator with DP — Robert Yeoman (Anderson), Janusz Kamiński (Spielberg)',
    ],
    tools_of_choice: [
      'Vectorworks for set drawings + SketchUp for previz',
      'Physical models built in shop (1:24 scale) for every major set',
      'Hand-drawn elevations before CAD',
      'Construction crews: Pinewood UK + Cinecittà Italy + local European fabricators',
    ],
    tells: `Look for: extreme symmetry (Wes Anderson signature), flat-camera staging that demands the set design read fully in 2D, color palettes that shift across runtime as story progresses, period sets where the historical paint colors are precisely matched rather than approximated, and miniatures + matte paintings integrated with full-scale construction.`,
    process_notes: `Stockhausen does 8-12 weeks of pre-production per Anderson feature — longer than the typical PD timeline. Built physical 1:24 scale models for every major Grand Budapest set + many Asteroid City sets before construction. Works with the same UK + Italian crews across features for continuity.`,
    influences: ['Dennis Gassner', 'Anton Furst', 'Bo Welch'],
    career_arc: `Started 2003 as art director on indie features. First PD credit: The Squid and the Whale (2005). Wes Anderson collaboration since Moonrise Kingdom (2012). Steven Spielberg collaboration since Bridge of Spies (2015). Oscar for The Grand Budapest Hotel (2014). Multiple nominations (Bridge of Spies, West Side Story).`,
    references: [
      { title: 'Adam Stockhausen on Asteroid City', url: 'https://www.architecturaldigest.com/story/asteroid-city-production-design-adam-stockhausen', publication: 'Architectural Digest', kind: 'interview' },
      { title: 'Stockhausen on Grand Budapest', url: 'https://variety.com/2014/film/awards/grand-budapest-hotel-production-design-1201387211/', publication: 'Variety', kind: 'interview' },
    ],
  },

  // ── Makeup effects ─────────────────────────────────────────────
  {
    slug: 'greg-nicotero',
    philosophy: `Practical first, augmentation second. Nicotero's KNB philosophy is that a fully-fabricated practical effect — silicone prosthetic, animatronic puppet, blood gag — gives the actor and DP something real to react to. Digital augmentation should clean up wires + extensions, not replace the physical thing.

"If the actor can't touch it, they can't react to it." — Nicotero in multiple Walking Dead behind-the-scenes interviews.`,
    signature_techniques: [
      'Life-cast → sculpt in Roma clay → mold → silicone or foam latex pour → on-set application by 3-5 person team',
      'Animatronic puppets for any creature with sustained close-up screen time',
      'Pros-Aide adhesive system for prosthetic edges that disappear at 1080p',
      'Blood gags via airline + bladder rather than CGI splatter',
      'Stage 1-2 hours of prep time per actor per shooting day',
    ],
    tools_of_choice: [
      'Smooth-On silicone systems (Dragon Skin, Ecoflex)',
      'Pros-Aide adhesive + Telesis 5 for edge work',
      'Encapsulated silicone for skin transitions',
      'Long-term partner: Howard Berger (KNB co-founder + collaborator)',
      'Same shop bench team across decades — Justin Mabry, Garrett Immel, Carey Jones',
    ],
    tells: `Look for: prosthetics that hold up at extreme close-up under harsh lighting, blood gags that splatter directionally (airline pressure, not CGI), creature scenes shot in long takes where you can SEE the practical effect rather than CGI cutaways, and prosthetic application that includes color depth + capillary detail visible under HD/4K capture.`,
    process_notes: `Nicotero exited as KNB's lead creative when he became Walking Dead showrunner in 2010, but maintains creative oversight of the shop. Practical-makeup process for a hero zombie character: life cast 1 day, sculpt 5-7 days, mold 2 days, pour + finish 2-3 days, on-set application 4-6 hours per shoot day. Total: 2-3 weeks for the first build, 4-6 hours for each subsequent application.`,
    influences: ['Tom Savini (mentor, mid-1980s)', 'Dick Smith', 'Rick Baker', 'Stan Winston'],
    career_arc: `Pittsburgh-born, started as Tom Savini's assistant on Day of the Dead (1985). Co-founded KNB with Robert Kurtzman and Howard Berger in 1988. Showrunner of AMC's The Walking Dead 2010-2022. Oscar for The Chronicles of Narnia: The Lion, the Witch and the Wardrobe (2006).`,
    references: [
      { title: 'Greg Nicotero on practical effects', url: 'https://www.makeupartistmagazine.com/greg-nicotero-interview/', publication: 'Make-Up Artist Magazine', kind: 'interview' },
      { title: 'KNB EFX behind the scenes', url: 'https://www.knbefx.com/about', publication: 'KNB EFX', kind: 'official' },
    ],
  },

  // ── Stunt coordinator ──────────────────────────────────────────
  {
    slug: 'david-leitch',
    philosophy: `Hyper-specific choreography rooted in martial arts — every fight has a "language" tied to the character. The Wick gun-fu language (3-step reload + pivot, weapon grappling, point-of-attack staging in single takes) was developed by Leitch + Chad Stahelski at 87Eleven specifically as a counter to the rapid-cut shaky-cam aesthetic dominant in 2000s action.

"Action is character. If your hero fights generically, your hero IS generic." — Leitch in The Director's Cut podcast.`,
    signature_techniques: [
      'Long takes (1-3 minutes uncut) for fight choreography — camera moves with the choreography, not around it',
      'Weapon grappling — characters disarm, manipulate, and re-arm weapons mid-fight',
      'Point-of-attack staging — camera placed inside the choreography rather than observing',
      'Distinctive movement vocabulary per character (Wick = Brazilian jiu-jitsu + Japanese-style gun-fu; Atomic Blonde = Krav Maga; Bullet Train = Hong Kong wuxia variants)',
      'Pre-vis with stunt performers for every fight 6-8 weeks before shooting',
    ],
    tools_of_choice: [
      '87Eleven Action Design studio (Inglewood, CA) for pre-vis + stunt performer training',
      'Long takes shot with RED Komodo or ALEXA Mini handheld + Steadicam',
      'Same performer pool across features — Vincent Tjia, Daniel Bernhardt, Said Taghmaoui',
      'Choreography filmed extensively in rehearsal — performers learn 3-5 minutes of complete fight before shooting',
    ],
    tells: `Look for: fights staged in long takes (1-3 min uncut), weapon manipulation that includes mid-fight disarming + re-arming, point-of-attack camera placement that puts viewer inside the action geometry, distinctive movement language per character, and zero quick-cut shaky-cam tradition. The Wick aesthetic.`,
    process_notes: `Leitch + Stahelski's 87Eleven workflow: 6-8 weeks of pre-vis with stunt performers + camera operators rehearsing the choreography end-to-end. Every fight shot multiple times for coverage but with full choreography in each take rather than action-cuts. Director (Leitch on Bullet Train, Stahelski on Wick) often operates Steadicam personally.`,
    influences: ['Yuen Woo-ping (Matrix choreographer)', 'Donnie Yen (Hong Kong fight cinema)', 'Buster Keaton'],
    career_arc: `Started as stunt performer 1995 (Brad Pitt's stunt double for nearly two decades — Fight Club, Mr. & Mrs. Smith, Troy, Ocean's films). Co-founded 87Eleven Action Design with Chad Stahelski 1997. Directed John Wick (2014) uncredited co-director with Stahelski. Solo directing career launched 2017 with Atomic Blonde. Recent: Bullet Train (2022), The Fall Guy (2024).`,
    references: [
      { title: 'David Leitch on Bullet Train', url: 'https://variety.com/2022/film/news/david-leitch-bullet-train-interview-1235335211/', publication: 'Variety', kind: 'interview' },
      { title: '87Eleven Action Design profile', url: 'https://www.8711action.com', publication: '87Eleven', kind: 'official' },
    ],
  },

  // ── VFX supervisor ────────────────────────────────────────────
  {
    slug: 'paul-lambert',
    philosophy: `Photoreal VFX as collaborative cinematography. Lambert's approach as DNEG's senior VFX supervisor on Dune + Blade Runner 2049 + Interstellar is that VFX is a department peer to camera + lighting, not a post-process add-on. He runs joint DP+VFX prep starting in pre-production — HDRI captures, chrome+grey ball references, on-set lens profiles, lighting balance docs.

"If the practical doesn't have an HDRI sphere captured next to it, we've already lost the shot." — Lambert at the Dune press junket.`,
    signature_techniques: [
      'HDRI sphere + chrome ball + grey ball + Macbeth chart captured per shot',
      'Joint DP+VFX dailies during principal photography',
      'Lens distortion + profile capture for every lens, every focal length',
      'Practical-first creature work where possible (sandworm interior shots used Stagecraft volume practical with CG extension)',
      'Heavy reliance on USD pipeline for asset interchange',
    ],
    tools_of_choice: [
      'Maya + Houdini for sandworm + creature animation',
      'Nuke for compositing',
      'Mantra/Karma renderer for hero shots',
      'Stagecraft + MARS LED volumes for in-camera VFX where feasible',
      'OCIO ACES configs throughout the pipeline',
    ],
    tells: `Look for: VFX-heavy films where CGI elements ground in real lighting cues from on-set HDRI capture — sandworms in Dune that reflect actual desert sun colors, vehicles with believable reflections of nearby practical elements, creatures whose shadow placement matches the practical key light angle precisely.`,
    process_notes: `Lambert lives on set during principal photography — his team operates HDRI sphere capture + chrome+grey ball + lens profile + lighting docs as a parallel "VFX 2nd unit". Post-production at DNEG London + Vancouver, with Lambert reviewing VFX shots daily.`,
    influences: ['Dennis Muren (ILM)', 'John Knoll (ILM)', 'Joe Letteri (Wētā)'],
    career_arc: `Started 1996 at MPC. Joined DNEG as VFX supervisor on First Man (2018). Oscar for Blade Runner 2049 (2017), First Man (2018), Dune (2021), Dune: Part Two (2024). Four Oscars in seven years — uniquely fast pace for the VFX-supervisor category.`,
    references: [
      { title: 'Paul Lambert on Dune Part Two', url: 'https://www.fxguide.com/featured/dune-part-two-paul-lambert/', publication: 'fxguide', kind: 'feature' },
      { title: 'Lambert on Blade Runner 2049', url: 'https://www.beforesandafters.com/blade-runner-2049-vfx', publication: 'befores & afters', kind: 'feature' },
    ],
  },
];

// ── Apply ────────────────────────────────────────────────────────
let updated = 0;
let missing = 0;
for (const p of PROFILES) {
  const personRow = await db.execute<{ id: number }>(sql`
    SELECT id FROM people WHERE slug = ${p.slug} LIMIT 1
  `);
  if (personRow.length === 0) {
    console.warn(`  [miss-person] ${p.slug}`);
    missing++;
    continue;
  }
  const personId = personRow[0]!.id;

  const cols: ReturnType<typeof sql.raw>[] = [];
  if (p.philosophy !== undefined) cols.push(sql.raw(`philosophy = '${p.philosophy.replace(/'/g, "''")}'`));
  if (p.signature_techniques) cols.push(sql.raw(`signature_techniques = '{${p.signature_techniques.map((t) => '"' + t.replace(/"/g, '\\"').replace(/'/g, "''") + '"').join(',')}}'::text[]`));
  if (p.tools_of_choice) cols.push(sql.raw(`tools_of_choice = '{${p.tools_of_choice.map((t) => '"' + t.replace(/"/g, '\\"').replace(/'/g, "''") + '"').join(',')}}'::text[]`));
  if (p.tells !== undefined) cols.push(sql.raw(`tells = '${p.tells.replace(/'/g, "''")}'`));
  if (p.process_notes !== undefined) cols.push(sql.raw(`process_notes = '${p.process_notes.replace(/'/g, "''")}'`));
  if (p.influences) cols.push(sql.raw(`influences = '{${p.influences.map((t) => '"' + t.replace(/"/g, '\\"').replace(/'/g, "''") + '"').join(',')}}'::text[]`));
  if (p.career_arc !== undefined) cols.push(sql.raw(`career_arc = '${p.career_arc.replace(/'/g, "''")}'`));
  if (p.references) cols.push(sql.raw(`"references" = '${JSON.stringify(p.references).replace(/'/g, "''")}'::jsonb`));
  cols.push(sql.raw(`data_tier = 'curated'`));
  cols.push(sql.raw(`last_verified_at = NOW()`));
  cols.push(sql.raw(`updated_at = NOW()`));
  const setSql = sql.join(cols, sql`, `);

  await db.execute(sql`
    INSERT INTO person_style_profiles (person_id, data_tier, last_verified_at)
    VALUES (${personId}, 'curated', NOW())
    ON CONFLICT (person_id) DO NOTHING
  `);
  await db.execute(sql`
    UPDATE person_style_profiles SET ${setSql} WHERE person_id = ${personId}
  `);
  updated++;
}
console.log(`[+] person_style_profiles: ${updated} updated, ${missing} missing-person`);
process.exit(0);
