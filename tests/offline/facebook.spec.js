const { test, expect, serveOffline, setEnabled, getExtensionId, paintedGaps, settle, expectBlocked, expectNotBlocked } = require('../helpers');

test.describe('Facebook, feed rewritten by another extension (offline)', () => {
  // F.B. Purity and similar extensions strip role="feed"; Facebook then marks each unit
  // with aria-posinset. Without this the Reels row was left uncovered.
  test.beforeEach(async ({ context }) => {
    await serveOffline(context, { 'https://www.facebook.com/': 'facebook-posinset.html' });
  });

  test('covers the Reels, suggested and sponsored units; keeps the rest and the spacing', async ({ context, page }) => {
    const id = await getExtensionId(context);
    await page.goto('https://www.facebook.com/');
    await settle(page);

    await expect(page.locator('#unit-reels')).toHaveAttribute('data-rb-covered', /^Reel #\d+$/);
    await expect(page.locator('#unit-suggested')).toHaveAttribute('data-rb-covered', 'Suggested #1');
    await expect(page.locator('#unit-sponsored')).toHaveAttribute('data-rb-covered', 'Sponsored #1');
    await expect(page.locator('#unit-reels a').first()).toBeHidden();
    await expect(page.locator('#nav-reels')).toBeHidden();

    for (const id2 of ['unit-normal', 'unit-video', 'unit-normal-2']) {
      await expect(page.locator(`#${id2}`), `#${id2} should be visible`).toBeVisible();
      await expect(page.locator(`#${id2} a`).first()).toBeVisible();
      await expect(page.locator(`#${id2}`)).not.toHaveAttribute('data-rb-covered', /.*/);
    }

    const full = await paintedGaps(page, '.unit');
    await setEnabled(context, id, false);
    const off = await paintedGaps(page, '.unit');
    expect(full, 'covering must not change the spacing between units').toEqual(off);
  });
});

test.describe('Facebook (offline)', () => {
  test.beforeEach(async ({ context }) => {
    await serveOffline(context, { 'https://www.facebook.com/': 'facebook-home.html' });
  });

  test('feed: covers the Reels unit, Reel posts, suggested and sponsored posts; hides the menu entry; keeps the rest', async ({ page }) => {
    await page.goto('https://www.facebook.com/');
    await settle(page);
    for (const id of ['reels-unit', 'post-shared-reel', 'group-post']) {
      await expect(page.locator(`#${id}`), `#${id} should be covered`).toHaveAttribute('data-rb-covered', /^Reel #\d+$/);
      await expect(page.locator(`#${id} a`).first()).toBeHidden();
    }
    await expect(page.locator('#post-suggested')).toHaveAttribute('data-rb-covered', 'Suggested #1');
    await expect(page.locator('#post-sponsored')).toHaveAttribute('data-rb-covered', 'Sponsored #1');
    await expect(page.locator('#post-suggested a')).toBeHidden();
    await expect(page.locator('#nav-reels')).toBeHidden();
    for (const id of ['post-normal', 'post-video', 'group-post-ok', 'nav-friends', 'nav-watch']) {
      await expect(page.locator(`#${id}`), `#${id} should be visible`).toBeVisible();
      await expect(page.locator(`#${id} a`).first()).toBeVisible();
    }
  });

  test('blocks Reels URLs', async ({ page }) => {
    for (const url of [
      'https://www.facebook.com/reel/123456789',
      'https://www.facebook.com/reel/',
      'https://www.facebook.com/reels/',
      'https://www.facebook.com/watch/reels/',
      'https://www.facebook.com/SomePage/reels/',
      'https://web.facebook.com/reel/123456789',
      'https://m.facebook.com/reel/123456789',
    ]) {
      await expectBlocked(page, url);
    }
  });

  test('does not block regular pages', async ({ page }) => {
    for (const url of [
      'https://www.facebook.com/watch/?v=123',
      'https://www.facebook.com/groups/1/posts/2',
      'https://www.facebook.com/messages/t/123',
      'https://www.facebook.com/SomePage',
    ]) {
      await expectNotBlocked(page, url);
    }
  });
});
