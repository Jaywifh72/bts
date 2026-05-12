// Tiny CLI runner so we can invoke the backfill via tsx without a flag plumbing layer.
import { backfillProfilePaths } from './backfill-profile-paths.ts';

const limit = process.argv.includes('--limit')
  ? Number(process.argv[process.argv.indexOf('--limit') + 1])
  : undefined;
const refresh = process.argv.includes('--refresh');

await backfillProfilePaths({ limit, refresh });
process.exit(0);
