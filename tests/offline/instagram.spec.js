const { test, expect, serveOffline, setSettings, setEnabled, getExtensionId, paintedGaps, settle, expectBlocked, expectNotBlocked, TINY_PNG } = require('../helpers');

const HOME = 'https://www.instagram.com/';

test.describe('Instagram (offline)', () => {
  test.beforeEach(async ({ context }) => {
    await serveOffline(context, {
      [HOME]: 'instagram-home.html',
      'https://www.instagram.com/explore/': 'instagram-explore.html',
      'https://www.instagram.com/someone/': 'instagram-profile.html',
    });
  });

  test('home: covers Reel posts, hides the Reels button, keeps the rest', async ({ page }) => {
    await page.goto(HOME);
    await settle(page);
    await expect(page.locator('#post-reel')).toHaveAttribute('data-rb-covered', 'Reel #1');
    await expect(page.locator('#post-reel-2')).toHaveAttribute('data-rb-covered', 'Reel #2');
    await expect(page.locator('#post-user-reel')).toHaveAttribute('data-rb-covered', 'Reel #3');
    // The cover is visible, the content underneath is not.
    await expect(page.locator('#post-reel')).toBeVisible();
    await expect(page.locator('#post-reel header')).toBeHidden();
    await expect(page.locator('#post-reel a')).toBeHidden();
    await expect(page.locator('#nav-reels')).toBeHidden();
    for (const id of ['nav-home', 'nav-explore', 'nav-messages', 'post-photo', 'post-carousel']) {
      await expect(page.locator(`#${id}`), `#${id} should be visible`).toBeVisible();
    }
    await expect(page.locator('#post-photo header')).toBeVisible();
  });

  test('home: covers suggested and sponsored posts, not a caption that merely mentions the phrase', async ({ page }) => {
    await page.goto(HOME);
    await settle(page);
    await expect(page.locator('#post-suggested')).toHaveAttribute('data-rb-covered', 'Suggested #1');
    await expect(page.locator('#post-suggested-el')).toHaveAttribute('data-rb-covered', 'Suggested #2');
    await expect(page.locator('#post-sponsored')).toHaveAttribute('data-rb-covered', 'Sponsored #1');
    await expect(page.locator('#post-suggested header')).toBeHidden();
    await expect(page.locator('#post-caption-mention')).not.toHaveAttribute('data-rb-covered', /.*/);
    await expect(page.locator('#post-caption-mention header')).toBeVisible();
  });

  test('the cover keeps the post\'s own size, so the page does not move', async ({ context, page }) => {
    const id = await getExtensionId(context);
    await page.goto(HOME);
    await settle(page);
    // Measured against the post above it, because hiding the Reels button in the menu
    // legitimately shortens the nav and shifts the whole feed up.
    const offsetInFeed = () => page.evaluate(() =>
      Math.round(document.getElementById('post-reel').getBoundingClientRect().top
        - document.getElementById('post-photo').getBoundingClientRect().top));

    await setEnabled(context, id, false);
    const natural = await page.locator('#post-reel').boundingBox();
    const naturalOffset = await offsetInFeed();

    await setEnabled(context, id, true);
    const covered = await page.locator('#post-reel').boundingBox();
    expect(Math.round(covered.height)).toBe(Math.round(natural.height)); // the post keeps its size
    expect(await offsetInFeed()).toBe(naturalOffset); // and its place in the feed
    await expect(page.locator('#post-reel header')).toBeHidden();
  });

  test('the gap between posts survives covering', async ({ context, page }) => {
    // The spacing between Instagram posts lives inside the post, so a cover painted over the whole
    // box would swallow it and leave posts touching. This is the regression test for that.
    const id = await getExtensionId(context);
    await page.goto(HOME);
    await settle(page);

    await setEnabled(context, id, false);
    const off = await paintedGaps(page, 'article');

    await setEnabled(context, id, true);
    await expect(page.locator('#post-reel')).toHaveAttribute('data-rb-covered', /.+/);
    const on = await paintedGaps(page, 'article');

    expect(off.length).toBeGreaterThan(4);
    expect(new Set(off).size).toBe(1); // every post is spaced the same in the untouched feed
    expect(on, 'covering must not change the spacing').toEqual(off);
  });

  test('the Reel\'s video is paused and muted, and again if the site restarts it', async ({ page }) => {
    await page.goto(HOME);
    await page.click('body'); // a "user gesture", so play() with sound is allowed
    await settle(page);
    const state = () => page.evaluate(() => { const v = document.getElementById('reel-video'); return { paused: v.paused, muted: v.muted }; });
    expect(await state()).toEqual({ paused: true, muted: true });

    await page.evaluate(() => window.replayWithSound().catch(() => {}));
    await settle(page, 400);
    expect(await state()).toEqual({ paused: true, muted: true });
  });

  test('cover image: plain black by default, your own if you choose one', async ({ context, page }) => {
    const cover = (pseudo) => page.evaluate((p) => {
      const s = getComputedStyle(document.getElementById('post-reel'), p);
      return { image: s.backgroundImage, color: s.backgroundColor, content: s.content };
    }, pseudo);

    // Default: no image at all, just black.
    await page.goto(HOME);
    await settle(page);
    await expect(page.locator('html')).not.toHaveAttribute('data-rb-has-image', '');
    const plain = await cover('::before');
    expect(plain.image).toBe('none');
    expect(plain.color).toBe('rgb(0, 0, 0)');
    // The cover text: fixed, no numbers. Without an image it is the ::before's own content.
    expect(plain.content).toBe('"Content blocked by JustMyFeed"');
    expect((await cover('::after')).content).toBe('none');

    // Your own image, tiled on top.
    await setSettings(context, { coverImage: TINY_PNG });
    await expect(page.locator('html')).toHaveAttribute('data-rb-has-image', '');
    await expect.poll(async () => (await cover('::before')).image).toContain('data:image/png');
    expect((await cover('::after')).content).toBe('"Content blocked by JustMyFeed"');

    // Back to plain black.
    await setSettings(context, { coverImage: '' });
    await expect(page.locator('html')).not.toHaveAttribute('data-rb-has-image', '');
    expect((await cover('::before')).image).toBe('none');
  });

  test('when off, the Reel shows normally again', async ({ context, page }) => {
    await page.goto(HOME);
    await settle(page);
    await expect(page.locator('#post-reel header')).toBeHidden();
    const covered = await page.locator('#post-reel').boundingBox();
    await setSettings(context, { enabled: false });
    await expect(page.locator('#post-reel header')).toBeVisible();
    await expect(page.locator('#nav-reels')).toBeVisible();
    expect(Math.round((await page.locator('#post-reel').boundingBox()).height)).toBe(Math.round(covered.height));
  });

  test('Explore: hides only the Reels tiles', async ({ page }) => {
    await page.goto('https://www.instagram.com/explore/');
    await settle(page);
    for (const id of ['tile-reel-1', 'tile-reel-2']) await expect(page.locator(`#${id}`)).toBeHidden();
    for (const id of ['tile-photo-1', 'tile-photo-2', 'tile-photo-3', 'tile-photo-4']) await expect(page.locator(`#${id}`)).toBeVisible();
  });

  test('profile: hides the Reels tab and the Reels in the grid', async ({ page }) => {
    await page.goto('https://www.instagram.com/someone/');
    await settle(page);
    for (const id of ['tab-reels', 'grid-reel']) await expect(page.locator(`#${id}`)).toBeHidden();
    for (const id of ['profile-header', 'tab-posts', 'tab-tagged', 'grid-photo', 'grid-photo-2']) await expect(page.locator(`#${id}`)).toBeVisible();
  });

  test('blocks Reels URLs', async ({ page }) => {
    for (const url of [
      'https://www.instagram.com/reels/',
      'https://www.instagram.com/reels/ABC123/',
      'https://www.instagram.com/reel/ABC123/',
      'https://www.instagram.com/someone/reels/',
      'https://www.instagram.com/someone/reel/ABC123/',
    ]) {
      await expectBlocked(page, url);
    }
  });

  test('does not block regular pages', async ({ page }) => {
    for (const url of [
      'https://www.instagram.com/p/ABC123/',
      'https://www.instagram.com/explore/',
      'https://www.instagram.com/direct/inbox/',
      'https://www.instagram.com/someone/',
      'https://www.instagram.com/stories/someone/123/',
    ]) {
      await expectNotBlocked(page, url);
    }
  });
});
