const path = require('node:path');
const Module = require('node:module');

const bundledNodeModules = path.join(
  process.env.USERPROFILE,
  '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
);
process.env.NODE_PATH = [
  path.join(bundledNodeModules, '.pnpm/node_modules'),
  process.env.NODE_PATH,
].filter(Boolean).join(path.delimiter);
Module._initPaths();

let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require(path.join(
    bundledNodeModules,
    'playwright'
  ));
}

const pages = [
  'index.html',
  'diagnosis.html',
  'result.html?type=helpful-guidance',
  'plans.html',
  'services.html',
  'process.html',
  'management.html',
  'contact.html',
];

(async () => {
  const browser = await playwright.chromium.launch({ channel: 'msedge', headless: true });
  const failures = [];
  let checked = 0;

  for (const width of [390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    for (const pagePath of pages) {
      const separator = pagePath.includes('?') ? '&' : '?';
      await page.goto(`http://127.0.0.1:8766/${pagePath}${separator}mobile=${width}`, { waitUntil: 'networkidle' });
      const metrics = await page.evaluate(() => ({
        width: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        missingImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).length,
      }));
      checked += 1;
      if (metrics.scrollWidth > metrics.width || metrics.missingImages > 0) {
        failures.push({ width, page: pagePath, ...metrics });
      }
    }
    await page.close();
  }

  await browser.close();
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exit(1);
  }
  console.log(`PASS: ${checked} mobile page checks at 390px and 320px`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
