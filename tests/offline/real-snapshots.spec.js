// Tests on REAL pages you have saved (see tests/fixtures/real/README.md).
// If the folder is empty, these tests are simply skipped.
const fs = require('fs');
const path = require('path');
const { test, expect, serveOffline, countVisible, settle, FIXTURES_DIR } = require('../helpers');

const REAL_DIR = path.join(FIXTURES_DIR, 'real');

const SITES = {
  youtube: { origin: 'https://www.youtube.com', reelLinks: 'a[href*="/shorts/"]' },
  instagram: { origin: 'https://www.instagram.com', reelLinks: 'a[href*="/reel/"], a[href*="/reels/"]' },
  facebook: { origin: 'https://www.facebook.com', reelLinks: 'a[href*="/reel/"], a[href*="/reels/"]' },
};

// instagram-home.html → https://www.instagram.com/ , instagram-explore.html → https://www.instagram.com/explore/
function urlFor(site, file) {
  const rest = path.basename(file, '.html').slice(site.length + 1);
  return SITES[site].origin + (rest === 'home' || rest === '' ? '/' : `/${rest}/`);
}

// The site's scripts are stripped, so only the extension is tested against the page's structure.
const stripScripts = (html) =>
  html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<meta[^>]+http-equiv=["']?refresh[^>]*>/gi, '');

const snapshots = fs.existsSync(REAL_DIR)
  ? fs.readdirSync(REAL_DIR).filter((f) => f.endsWith('.html') && SITES[f.split('-')[0]])
  : [];

test.describe('Saved real pages', () => {
  test.skip(snapshots.length === 0, 'No saved pages in tests/fixtures/real');

  for (const file of snapshots) {
    const site = file.split('-')[0];
    const url = urlFor(site, file);

    test(`${file}: no visible Reel/Short, the rest of the content stays`, async ({ context, page }) => {
      await serveOffline(context, { [url]: path.join('real', file) }, { assetsDir: REAL_DIR, transform: stripScripts });
      await page.goto(url);
      await settle(page, 1500);

      const totalReelLinks = await page.locator(SITES[site].reelLinks).count();
      const visibleReelLinks = await countVisible(page, SITES[site].reelLinks);
      const visibleOtherLinks = await countVisible(page, `a[href]:not(${SITES[site].reelLinks.split(', ').join('):not(')})`);
      test.info().annotations.push({
        type: 'result',
        description: `${totalReelLinks} Reel links on the page, ${visibleReelLinks} visible, ${visibleOtherLinks} other visible links`,
      });

      expect(visibleReelLinks, 'Visible links to Reels/Shorts').toBe(0);
      expect(totalReelLinks, 'The page must contain Reels for the test to mean anything').toBeGreaterThan(0);
      expect(visibleOtherLinks, 'The page must not be emptied').toBeGreaterThan(5);
    });
  }
});
