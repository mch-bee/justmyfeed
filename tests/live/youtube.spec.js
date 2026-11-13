// Tests on the REAL YouTube (needs internet, no account).
// They catch the case where YouTube changes its page and a rule breaks.
const { test, expect, getExtensionId, setEnabled, countVisible, settle, BLOCK_PAGE_RE } = require('../helpers');

const SHORTS_LINKS = 'a[href^="/shorts/"], a[href*="youtube.com/shorts/"]';
const SEARCH = 'https://www.youtube.com/results?search_query=funny+cats';

/** Opens a YouTube page; if the cookie page appears, chooses "Reject all". */
async function openYouTube(page, url, waitUntil = 'domcontentloaded') {
  await page.goto(url, { waitUntil });
  if (page.url().includes('consent.youtube.com')) {
    await page.getByRole('button', { name: /reject all/i }).first().click();
    // The return to YouTube may be cut short by the extension itself (if the page is a Short): that is fine.
    await page.waitForURL((u) => !u.href.includes('consent.youtube.com')).catch(() => {});
  }
}

test.describe('YouTube (live)', () => {
  test('search: Shorts exist on the page but none is visible', async ({ page }) => {
    await openYouTube(page, SEARCH);
    await page.waitForSelector('ytd-video-renderer', { timeout: 30_000 });
    // Canary: if YouTube stops showing Shorts here, the test says nothing, so it fails.
    await page.waitForSelector(SHORTS_LINKS, { state: 'attached', timeout: 30_000 });
    await settle(page, 1500);

    expect(await countVisible(page, SHORTS_LINKS), 'Visible links to Shorts').toBe(0);
    expect(await countVisible(page, 'ytd-video-renderer'), 'Regular videos should be visible').toBeGreaterThan(5);
    await expect(page.locator('yt-chip-cloud-chip-renderer:visible, chip-view-model:visible').filter({ hasText: /^\s*Shorts\s*$/ })).toHaveCount(0);
  });

  test('when off, Shorts appear (so the rules match real elements)', async ({ context, page }) => {
    const id = await getExtensionId(context);
    await setEnabled(context, id, false);
    await openYouTube(page, SEARCH);
    await page.waitForSelector(SHORTS_LINKS, { state: 'attached', timeout: 30_000 });
    await settle(page, 1500);
    expect(await countVisible(page, SHORTS_LINKS)).toBeGreaterThan(0);

    await setEnabled(context, id, true);
    await settle(page, 1000);
    expect(await countVisible(page, SHORTS_LINKS)).toBe(0);
  });

  test('clicking a Short inside the page → blocked', async ({ page }) => {
    await openYouTube(page, SEARCH);
    const short = page.locator('a[href^="/shorts/"]').first();
    await short.waitFor({ state: 'attached', timeout: 30_000 });
    // The Short is hidden, so the click is dispatched straight to the element.
    await short.dispatchEvent('click');
    await page.waitForURL(BLOCK_PAGE_RE, { timeout: 15_000 });
  });

  test('direct link to a Short → blocked', async ({ page }) => {
    await openYouTube(page, 'https://www.youtube.com/shorts/', 'commit');
    await page.waitForURL(BLOCK_PAGE_RE, { timeout: 15_000 });
  });

  test('channel: the Shorts tab is not visible, the other tabs are', async ({ page }) => {
    await openYouTube(page, 'https://www.youtube.com/@YouTube');
    await page.waitForSelector('yt-tab-shape, tp-yt-paper-tab', { timeout: 30_000 });
    await settle(page, 1500);
    const tabs = page.locator('yt-tab-shape:visible, tp-yt-paper-tab:visible');
    await expect(tabs.filter({ hasText: /^\s*Videos\s*$/ })).toHaveCount(1);
    await expect(tabs.filter({ hasText: /^\s*Shorts\s*$/ })).toHaveCount(0);
    expect(await countVisible(page, SHORTS_LINKS), 'Visible links to Shorts').toBe(0);
  });

  test('regular video: not blocked', async ({ page }) => {
    await openYouTube(page, SEARCH);
    const video = page.locator('ytd-video-renderer a#thumbnail[href^="/watch"]').first();
    const href = await video.getAttribute('href', { timeout: 30_000 });
    await openYouTube(page, 'https://www.youtube.com' + href);
    await settle(page, 1500);
    expect(page.url()).toContain('/watch');
  });
});
