// Checks that sw.js precaches exactly the site's files, so an offline visit never misses one.
//   node tools/check-sw.mjs
// Fails when CORE lists a file that does not exist, or when a file under assets/js, css, data
// or fonts is missing from CORE. Remember to bump VERSION in sw.js when fonts, icons or vendor change.
import fs from 'fs';
import path from 'path';

const root = new URL('..', import.meta.url).pathname;
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const core = [...sw.match(/const CORE = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const version = (sw.match(/const VERSION = '([^']+)'/) || [])[1];

const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .flatMap(e => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
const expected = ['assets/js', 'assets/css', 'assets/data', 'assets/fonts'].flatMap(walk);

let bad = 0;
for (const f of core) {
  if (f === './') continue;
  if (!fs.existsSync(path.join(root, f))) { console.log(`✗ CORE lists a missing file: ${f}`); bad++; }
}
for (const f of expected) {
  if (!core.includes(f)) { console.log(`✗ Not precached (add it to CORE in sw.js): ${f}`); bad++; }
}
console.log(bad ? `\n${bad} problem(s). VERSION is ${version}.` : `✓ sw.js CORE matches the files on disk (${core.length} entries, VERSION ${version}).`);
process.exit(bad ? 1 : 0);
