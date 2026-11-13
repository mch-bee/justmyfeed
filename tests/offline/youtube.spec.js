const { test, expect, serveOffline, getExtensionId, setEnabled, settle, expectBlocked, expectNotBlocked, BLOCK_PAGE_RE } = require('../helpers');

const HOME = 'https://www.youtube.com/';
const COVERED = ['shorts-section', 'lone-short', 'search-shorts-grid', 'search-short-as-video'];
const HIDDEN = ['guide-shorts', 'mini-guide-shorts', 'chip-shorts', 'tab-shorts', 'description-short-link'];

test.describe('YouTube (offline)', () => {
  test.beforeEach(async ({ context }) => {
    await serveOffline(context, { [HOME]: 'youtube-home.html' });
  });

  test('covers Shorts shelves and cards, hides menu entries, filter chips and tabs', async ({ page }) => {
    await page.goto(HOME);
    await settle(page);
    for (const id of COVERED) {
      await expect(page.locator(`#${id}`), `#${id} should be covered`).toHaveAttribute('data-rb-covered', /^Short #\d+$/);
      await expect(page.locator(`#${id} a`).first()).toBeHidden();
    }
    for (const id of HIDDEN) {
      await expect(page.locator(`#${id}`), `#${id} should be hidden`).toBeHidden();
    }
  });

  test('leaves regular videos and the rest of the page alone', async ({ page }) => {
    await page.goto(HOME);
    await settle(page);
    for (const id of ['video-1', 'video-2', 'search-video', 'guide-home', 'guide-subs', 'mini-guide-home',
      'chip-all', 'chip-music', 'tab-videos', 'tab-live', 'description-text']) {
      await expect(page.locator(`#${id}`), `#${id} should be visible`).toBeVisible();
      await expect(page.locator(`#${id}`)).not.toHaveAttribute('data-rb-covered', /.*/);
    }
    await expect(page.locator('#video-1 a')).toBeVisible();
  });

  test('covers Shorts that load later (scrolling)', async ({ page }) => {
    await page.goto(HOME);
    await settle(page);
    await page.click('#add-late-shelf');
    await expect(page.locator('#late-shelf')).toHaveAttribute('data-rb-covered', `Short #${COVERED.length + 1}`);
    await expect(page.locator('#late-shelf a')).toBeHidden();
  });

  test('blocks when a Short is opened from inside the site (no page load)', async ({ page }) => {
    await page.goto(HOME);
    await settle(page);
    await page.click('#spa-nav');
    await page.waitForURL(BLOCK_PAGE_RE);
  });

  test('blocks Shorts URLs', async ({ page }) => {
    for (const url of [
      'https://www.youtube.com/shorts/abc123',
      'https://www.youtube.com/shorts/',
      'https://www.youtube.com/@somechannel/shorts',
      'https://m.youtube.com/shorts/abc123',
    ]) {
      await expectBlocked(page, url);
    }
  });

  test('does not block regular pages', async ({ page }) => {
    for (const url of [
      'https://www.youtube.com/watch?v=abc123',
      'https://www.youtube.com/results?search_query=shorts',
      'https://www.youtube.com/@somechannel/videos',
      'https://www.youtube.com/feed/subscriptions',
    ]) {
      await expectNotBlocked(page, url);
    }
  });

  test('switching off shows Shorts again without a reload; switching on covers them', async ({ context, page }) => {
    const id = await getExtensionId(context);
    await page.goto(HOME);
    await settle(page);
    await expect(page.locator('#shorts-section a').first()).toBeHidden();
    await expect(page.locator('#guide-shorts')).toBeHidden();

    await setEnabled(context, id, false);
    await expect(page.locator('#shorts-section a').first()).toBeVisible();
    await expect(page.locator('#guide-shorts')).toBeVisible();

    await setEnabled(context, id, true);
    await expect(page.locator('#shorts-section a').first()).toBeHidden();
    await expect(page.locator('#guide-shorts')).toBeHidden();
  });

  test('when off, Shorts URLs are not blocked', async ({ context, page }) => {
    const id = await getExtensionId(context);
    await setEnabled(context, id, false);
    await expectNotBlocked(page, 'https://www.youtube.com/shorts/abc123');
  });

  test('switching on while watching a Short blocks it immediately', async ({ context, page }) => {
    const id = await getExtensionId(context);
    await setEnabled(context, id, false);
    await expectNotBlocked(page, 'https://www.youtube.com/shorts/abc123');
    await setEnabled(context, id, true);
    await page.waitForURL(BLOCK_PAGE_RE);
  });
});
