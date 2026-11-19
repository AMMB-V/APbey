import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const migrationsDir = path.resolve('supabase', 'migrations');
const outputFile = path.resolve('supabase', 'bundle_migrations.sql');

const files = (await readdir(migrationsDir))
  .filter((file) => file.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.error('No migrations found in supabase/migrations.');
  process.exit(1);
}

const header = `-- =====================================================================
-- APbey Arena - Consolidated Migration Bundle
-- Total Migrations: ${files.length}
-- Generated automatically for Supabase SQL Editor execution
-- =====================================================================\n\n`;

const parts = [header];

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  const content = await readFile(filePath, 'utf8');
  parts.push(`-- ---------------------------------------------------------------------`);
  parts.push(`-- Migration: ${file}`);
  parts.push(`-- ---------------------------------------------------------------------`);
  parts.push(content.trim());
  parts.push('\n');
}

await writeFile(outputFile, parts.join('\n\n'), 'utf8');
console.log(`Successfully bundled ${files.length} migrations into ${outputFile}`);
