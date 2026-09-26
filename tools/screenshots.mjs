// Visual check for the GE 213 site: captures every page at four widths in both themes
// and reports console errors, horizontal overflow and text smaller than 12px.
//
// Usage (from the repository root):
//   python3 -m http.server 8000 &
//   node tools/screenshots.mjs [baseUrl] [ISO date]
// Needs Playwright (npm i -D playwright) or a global install. Output: tools/out/
import fs from 'fs';

const base = process.argv[2] || 'http://127.0.0.1:8000/';
const date = process.argv[3] || null;          // e.g. 2026-09-27T09:00:00+03:00 to preview a given day
const routes = ['calendar', 'files', 'calculator', 'guide'];
const widths = [340, 390, 768, 1366];
const themes = ['dark', 'light'];
const out = new URL('./out/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });

let playwright;
try { playwright = await import('playwright'); }
catch { playwright = await import(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.mjs'); }
const { chromium } = playwright;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

let problems = 0;
for (const theme of themes) {
  for (const width of widths) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, colorScheme: theme });
    const page = await ctx.newPage();
    if (date) await page.clock.setFixedTime(new Date(date));
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    for (const route of routes) {
      await page.goto(`${base}#/${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const name = `${theme}-${width}-${route}`;
      await page.screenshot({ path: `${out}${name}.png`, fullPage: true });
      const m = await page.evaluate(() => {
        let min = 99;
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walk.nextNode()) {
          const el = walk.currentNode.parentElement;
          if (!walk.currentNode.textContent.trim() || !el || el.closest('.sr-only')) continue;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          min = Math.min(min, parseFloat(getComputedStyle(el).fontSize));
        }
        return { overflow: document.documentElement.scrollWidth - innerWidth, minFont: min };
      });
      const bad = m.overflow > 0 || m.minFont < 12;
      if (bad) problems++;
      console.log(`${bad ? '✗' : '✓'} ${name.padEnd(22)} overflow=${m.overflow} minFont=${m.minFont}`);
    }
    if (errors.length) { problems++; console.log(`✗ ${theme}-${width} console errors:\n  ${[...new Set(errors)].join('\n  ')}`); }
    await ctx.close();
  }
}
await browser.close();
console.log(problems ? `\n${problems} problem(s) found.` : '\nAll pages look clean.');
process.exit(problems ? 1 : 0);
