import { vfxTechniques } from '../../schema/index.ts';
import type { SeedDb } from '../run.ts';

type TechniqueSeed = {
  slug: string;
  name: string;
  category:
    | 'creature' | 'environment' | 'character' | 'practical_enhancement'
    | 'simulation' | 'compositing' | 'other';
};

const techniquesData: TechniqueSeed[] = [
  // Creature
  { slug: 'cg-creature', name: 'CG Creature', category: 'creature' },
  { slug: 'creature-animation', name: 'Creature Animation', category: 'creature' },
  { slug: 'fur-simulation', name: 'Fur Simulation', category: 'creature' },

  // Environment
  { slug: 'cg-environment', name: 'CG Environment', category: 'environment' },
  { slug: 'environment-replacement', name: 'Environment Replacement', category: 'environment' },
  { slug: 'matte-painting', name: 'Matte Painting', category: 'environment' },
  { slug: 'virtual-production', name: 'Virtual Production', category: 'environment' },

  // Character
  { slug: 'de-aging', name: 'De-aging', category: 'character' },
  { slug: 'digital-double', name: 'Digital Double', category: 'character' },
  { slug: 'facial-capture', name: 'Facial Capture', category: 'character' },
  { slug: 'motion-capture', name: 'Motion Capture', category: 'character' },
  { slug: 'performance-capture', name: 'Performance Capture', category: 'character' },

  // Practical Enhancement
  { slug: 'wire-removal', name: 'Wire Removal', category: 'practical_enhancement' },
  { slug: 'crowd-replication', name: 'Crowd Replication', category: 'practical_enhancement' },
  { slug: 'set-extension', name: 'Set Extension', category: 'practical_enhancement' },

  // Simulation
  { slug: 'water-simulation', name: 'Water Simulation', category: 'simulation' },
  { slug: 'fire-simulation', name: 'Fire & Explosion Simulation', category: 'simulation' },
  { slug: 'cloth-simulation', name: 'Cloth Simulation', category: 'simulation' },
  { slug: 'destruction-simulation', name: 'Destruction Simulation', category: 'simulation' },
  { slug: 'particle-effects', name: 'Particle Effects', category: 'simulation' },

  // Compositing
  { slug: 'rotoscoping', name: 'Rotoscoping', category: 'compositing' },
  { slug: 'colour-grading-vfx', name: 'VFX Colour Grading', category: 'compositing' },
  { slug: 'cg-integration', name: 'CG Integration', category: 'compositing' },

  // Other
  { slug: 'title-sequence', name: 'Title Sequence', category: 'other' },
  { slug: 'miniatures', name: 'Miniatures & Scale Models', category: 'other' },
  { slug: 'previsualization', name: 'Previsualization', category: 'other' },
];

export async function seedVfxTechniques(db: SeedDb) {
  for (const t of techniquesData) {
    await db.insert(vfxTechniques)
      .values({ slug: t.slug, name: t.name, category: t.category })
      .onConflictDoUpdate({
        target: vfxTechniques.slug,
        set: { name: t.name, category: t.category },
      });
  }
}
