import { db, sql } from '../src/index.ts';
await db.execute(sql`
  UPDATE stunt_rigging_techniques
  SET tagline = 'A small angled mini-trampoline used as a launch aid for stunt jumps — the workhorse rig under any "long jump across a gap" frame.',
      updated_at = NOW()
  WHERE slug = 'spring-board'
`);
console.log('reverted');
process.exit(0);
