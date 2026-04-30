import { roles } from '../../schema/index.ts';
import type { SeedDb } from '../run.ts';

type RoleSeed = {
  slug: string;
  name: string;
  category:
    | 'camera' | 'grip' | 'electric' | 'sound' | 'art' | 'wardrobe' | 'makeup_hair'
    | 'production' | 'post' | 'vfx' | 'direction' | 'writing' | 'music' | 'stunts';
  aliases?: string[];
  description?: string;
};

export const rolesData: RoleSeed[] = [
  // CAMERA
  { slug: 'director-of-photography', name: 'Director of Photography',
    category: 'camera', aliases: ['DP', 'DOP', 'Cinematographer', 'Lighting Cameraman'] },
  { slug: 'second-unit-dp', name: 'Second Unit Director of Photography', category: 'camera', aliases: ['2nd Unit DP'] },
  { slug: 'underwater-dp', name: 'Underwater Director of Photography', category: 'camera' },
  { slug: 'aerial-dp', name: 'Aerial Director of Photography', category: 'camera' },
  { slug: 'camera-operator', name: 'Camera Operator', category: 'camera', aliases: ['Operator'] },
  { slug: 'a-camera-operator', name: 'A-Camera Operator', category: 'camera' },
  { slug: 'b-camera-operator', name: 'B-Camera Operator', category: 'camera' },
  { slug: 'steadicam-operator', name: 'Steadicam Operator', category: 'camera' },
  { slug: 'first-ac', name: 'First Assistant Camera', category: 'camera', aliases: ['1st AC', 'Focus Puller'] },
  { slug: 'second-ac', name: 'Second Assistant Camera', category: 'camera', aliases: ['2nd AC', 'Clapper-Loader'] },
  { slug: 'dit', name: 'Digital Imaging Technician', category: 'camera', aliases: ['DIT'] },
  { slug: 'loader', name: 'Loader', category: 'camera', aliases: ['Film Loader'] },
  { slug: 'still-photographer', name: 'Still Photographer', category: 'camera' },

  // ELECTRIC
  { slug: 'gaffer', name: 'Gaffer', category: 'electric', aliases: ['Chief Lighting Technician'] },
  { slug: 'best-boy-electric', name: 'Best Boy Electric', category: 'electric' },
  { slug: 'lamp-operator', name: 'Lamp Operator', category: 'electric', aliases: ['Electrician'] },
  { slug: 'rigging-gaffer', name: 'Rigging Gaffer', category: 'electric' },
  { slug: 'rigging-electric', name: 'Rigging Electrician', category: 'electric' },

  // GRIP
  { slug: 'key-grip', name: 'Key Grip', category: 'grip' },
  { slug: 'best-boy-grip', name: 'Best Boy Grip', category: 'grip' },
  { slug: 'dolly-grip', name: 'Dolly Grip', category: 'grip' },
  { slug: 'rigging-grip', name: 'Rigging Grip', category: 'grip' },
  { slug: 'crane-grip', name: 'Crane Grip', category: 'grip' },

  // SOUND
  { slug: 'production-sound-mixer', name: 'Production Sound Mixer', category: 'sound', aliases: ['Sound Mixer'] },
  { slug: 'boom-operator', name: 'Boom Operator', category: 'sound' },

  // DIRECTION
  { slug: 'director', name: 'Director', category: 'direction' },
  { slug: 'second-unit-director', name: 'Second Unit Director', category: 'direction' },

  // PRODUCTION
  { slug: 'producer', name: 'Producer', category: 'production' },
  { slug: 'line-producer', name: 'Line Producer', category: 'production' },
  { slug: 'first-ad', name: 'First Assistant Director', category: 'production', aliases: ['1st AD'] },
  { slug: 'upm', name: 'Unit Production Manager', category: 'production', aliases: ['UPM'] },

  // POST
  { slug: 'editor', name: 'Editor', category: 'post', aliases: ['Picture Editor'] },
  { slug: 'colorist', name: 'Colorist', category: 'post', aliases: ['Color Grading'] },
  { slug: 'sound-designer', name: 'Sound Designer', category: 'post' },
  { slug: 're-recording-mixer', name: 'Re-Recording Mixer', category: 'post', aliases: ['Dubbing Mixer'] },
  { slug: 'foley-artist', name: 'Foley Artist', category: 'post' },
  { slug: 'post-supervisor', name: 'Post-Production Supervisor', category: 'post' },
  { slug: 'dialog-editor', name: 'Dialog Editor', category: 'post' },
  { slug: 'music-editor', name: 'Music Editor', category: 'post' },

  // VFX
  { slug: 'vfx-supervisor', name: 'Visual Effects Supervisor', category: 'vfx', aliases: ['VFX Supervisor'] },
  { slug: 'vfx-producer', name: 'Visual Effects Producer', category: 'vfx' },
  { slug: 'compositing-supervisor', name: 'Compositing Supervisor', category: 'vfx' },

  // ART
  { slug: 'production-designer', name: 'Production Designer', category: 'art' },
  { slug: 'art-director', name: 'Art Director', category: 'art' },
  { slug: 'set-decorator', name: 'Set Decorator', category: 'art' },
  { slug: 'prop-master', name: 'Property Master', category: 'art', aliases: ['Prop Master'] },

  // WARDROBE
  { slug: 'costume-designer', name: 'Costume Designer', category: 'wardrobe' },

  // MAKEUP/HAIR
  { slug: 'makeup-dept-head', name: 'Department Head Makeup', category: 'makeup_hair' },
  { slug: 'hair-dept-head', name: 'Department Head Hair', category: 'makeup_hair' },
  { slug: 'makeup-effects-supervisor', name: 'Makeup Effects Supervisor', category: 'makeup_hair', aliases: ['SFX Makeup'] },

  // MUSIC
  { slug: 'composer', name: 'Composer', category: 'music' },
  { slug: 'music-supervisor', name: 'Music Supervisor', category: 'music' },

  // STUNTS
  { slug: 'stunt-coordinator', name: 'Stunt Coordinator', category: 'stunts' },
  { slug: 'special-effects-coordinator', name: 'Special Effects Coordinator', category: 'stunts', aliases: ['SFX Coordinator'] },

  // WRITING
  { slug: 'screenwriter', name: 'Screenwriter', category: 'writing', aliases: ['Writer', 'Screenplay'] },
];

export async function seedRoles(db: SeedDb) {
  for (const r of rolesData) {
    await db.insert(roles)
      .values({
        slug: r.slug, name: r.name, category: r.category,
        aliases: r.aliases ?? [], description: r.description ?? null,
      })
      .onConflictDoUpdate({
        target: roles.slug,
        set: {
          name: r.name,
          category: r.category,
          aliases: r.aliases ?? [],
          updatedAt: new Date(),
        },
      });
  }
}
