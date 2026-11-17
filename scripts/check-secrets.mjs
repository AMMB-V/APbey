import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', 'dist', '.aistudio']);
const sensitiveName = /\.(env|pem|key|p12|pfx)$/i;
const patterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"`]?[A-Za-z0-9._-]{20,}/i,
  /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"`][^'"`\r\n]{12,}['"`]/i,
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else if (!sensitiveName.test(entry.name)) files.push(target);
  }
  return files;
}

const findings = [];
for (const file of await walk(root)) {
  let content;
  try {
    content = await readFile(file, 'utf8');
  } catch {
    continue;
  }
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (patterns.some((pattern) => pattern.test(line)) && !line.includes('process.env.')) {
      findings.push(`${path.relative(root, file)}:${index + 1}`);
    }
  });
}

if (findings.length > 0) {
  console.error(`Potential secrets found:\n${findings.join('\n')}`);
  process.exit(1);
}

console.log('No hard-coded secret patterns found.');
