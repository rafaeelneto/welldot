import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Returns the body of the `## <version>` section of a Changesets CHANGELOG,
 * or null when that version has no entry.
 */
export function extractReleaseNotes(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trimEnd() === `## ${version}`);
  if (start === -1) return null;
  let end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  if (end === -1) end = lines.length;
  return lines.slice(start + 1, end).join('\n').trim();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [packageDir, version] = process.argv.slice(2);
  if (!packageDir || !version) {
    console.error('Usage: node scripts/release-notes.mjs <packageDir> <version>');
    process.exit(2);
  }
  const file = join(packageDir, 'CHANGELOG.md');
  let notes = null;
  try {
    notes = extractReleaseNotes(readFileSync(file, 'utf8'), version);
  } catch {
    notes = null;
  }
  if (notes === null) {
    console.error(`No CHANGELOG entry for ${version} in ${file}`);
    process.exit(1);
  }
  console.log(notes);
}
