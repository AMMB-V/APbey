import { readdir } from 'node:fs/promises';
import path from 'node:path';

const migrationsDir = path.resolve('supabase', 'migrations');
const files = (await readdir(migrationsDir))
  .filter((file) => file.endsWith('.sql'))
  .sort();
const versions = files.map((file) => file.split('_', 1)[0]);
const invalid = files.filter((file, index) => (
  !/^\d{14}_/.test(file) || versions.indexOf(versions[index]) !== index
));

if (invalid.length > 0) {
  console.error(`Invalid or duplicate Supabase migration versions:\n${invalid.join('\n')}`);
  process.exit(1);
}

console.log(`Validated ${files.length} unique Supabase migration versions.`);
