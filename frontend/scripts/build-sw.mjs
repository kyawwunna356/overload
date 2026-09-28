// Runs after `next build` (see package.json): lists every file of the exported site in out/,
// hashes them into a version, and writes out/sw.js from scripts/sw-template.js. A new build with
// any changed file gets a new version, which is what makes the phone pick up the update.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'out');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// Error pages are never navigated to on purpose; sw.js must not cache itself.
const SKIP = new Set(['sw.js', '404.html', '_not-found.html']);

const files = walk(out)
  .map((full) => relative(out, full).split(sep).join('/'))
  .filter((path) => !SKIP.has(path))
  .sort();

// Screens are cached under their clean address (/exercise, not /exercise.html): that's what the
// host serves, and what a navigation asks for.
const toUrl = (path) =>
  path === 'index.html' ? '/' : '/' + encodeURI(path.endsWith('.html') ? path.slice(0, -5) : path);

const urls = files.map(toUrl);
const pages = files.filter((path) => path.endsWith('.html')).map(toUrl);

const hash = createHash('sha256');
for (const path of files) {
  hash.update(path);
  hash.update(readFileSync(join(out, path)));
}
const version = hash.digest('hex').slice(0, 12);

const template = readFileSync(join(root, 'scripts', 'sw-template.js'), 'utf8');
const sw = template
  .replace("'__VERSION__'", JSON.stringify(version))
  .replace('__FILES__', JSON.stringify(urls))
  .replace('__PAGES__', JSON.stringify(pages));
writeFileSync(join(out, 'sw.js'), sw);

console.log(`sw.js: version ${version}, ${urls.length} files, pages ${pages.join(' ')}`);
