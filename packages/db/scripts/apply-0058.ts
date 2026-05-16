import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');
  const sql = postgres(url, { ssl: 'require', max: 1 });
  const text = fs.readFileSync(path.join(__dirname, '..', 'migrations', '0058_societies.sql'), 'utf8');
  await sql.unsafe(text);
  console.log('0058 applied');
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
