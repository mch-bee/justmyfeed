const { test, expect, serveOffline, settle, expectBlocked, BLOCK_PAGE_RE } = require('../helpers');

test.describe('Block page', () => {
  test.beforeEach(async ({ context }) => {
    await serveOffline(context, {
      'https://www.youtube.com/': 'youtube-home.html',
      'https://www.instagram.com/': 'instagram-home.html',
    });
  });

  test('shows only the cover, the note and a Back button', async ({ page }) => {
    await expectBlocked(page, 'https://www.youtube.com/shorts/abc');
    await expect(page.locator('#note')).toHaveText('Content blocked by JustMyFeed');
    await expect(page.locator('#back')).toHaveText('Back');
    await expect(page.locator('button, a')).toHaveCount(1);
    await expect(page.locator('body')).toHaveText(/^\s*Back\s*Content blocked by JustMyFeed\s*$/);
    // The same cover as on the feed: plain black unless the user chose an image.
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(0, 0, 0)');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundImage)).toBe('none');
  });

  test('"Back" returns to the page you were on', async ({ page }) => {
    await page.goto('https://www.youtube.com/');
    await settle(page);
    await page.click('#spa-nav');
    await page.waitForURL(BLOCK_PAGE_RE);
    await page.click('#back');
    await page.waitForURL('https://www.youtube.com/');
    await expect(page.locator('#video-1')).toBeVisible();
  });

  test('"Back" in a new tab with no history goes to the platform\'s home page', async ({ context, page }) => {
    // Like "Open in new tab": the tab starts straight on the Short.
    await page.goto('https://www.youtube.com/');
    const [tab] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => window.open('https://www.youtube.com/shorts/new-tab', '_blank', 'noopener')),
    ]);
    await tab.waitForURL(BLOCK_PAGE_RE);
    await tab.click('#back');
    await tab.waitForURL('https://www.youtube.com/');
  });
});
