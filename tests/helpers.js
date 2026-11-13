// Shared helpers for all tests.
const fs = require('fs');
const path = require('path');
const { test: base, expect, chromium } = require('@playwright/test');

const EXTENSION_DIR = path.resolve(__dirname, '..', 'extension');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const BLOCK_PAGE_RE = /^chrome-extension:\/\/[a-p]{32}\/blocked\/blocked\.html/;

const extensionIds = new WeakMap();

/**
 * Opens a clean browser (no history, cookies or accounts) with the extension loaded.
 *
 * Default: the computer's own Google Chrome, i.e. the browser you actually use.
 * Chrome no longer accepts --load-extension, so the extension is loaded through the
 * debugging protocol (CDP: Extensions.loadUnpacked).
 * With RB_BROWSER=chromium, Playwright's Chromium is used instead (e.g. in CI).
 */
async function launchWithExtension({ headless, locale }) {
  if (process.env.RB_BROWSER === 'chromium') {
    return chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless,
      locale,
      args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
    });
  }
  const context = await chromium.launchPersistentContext('', {
    channel: 'chrome',
    headless,
    locale,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--enable-unsafe-extension-debugging'],
  });
  const cdp = await context.browser().newBrowserCDPSession();
  const { id } = await cdp.send('Extensions.loadUnpacked', { path: EXTENSION_DIR });
  await cdp.detach();
  extensionIds.set(context, id);
  return context;
}

const test = base.extend({
  context: async ({ headless, locale }, use) => {
    const context = await launchWithExtension({ headless, locale });
    await use(context);
    await context.close();
  },
  page: async ({ context }, use) => {
    const page = context.pages()[0] || (await context.newPage());
    await use(page);
  },
});

const blankPage = '<!doctype html><meta charset="utf-8"><title>blank</title><p>blank</p>';

/**
 * Serves local files instead of the real sites, with no internet.
 * pages: { 'https://www.instagram.com/': 'instagram-home.html', ... }
 * Any other page returns an empty document. All other requests are blocked,
 * except files that exist in assetsDir (for saved real pages).
 */
async function serveOffline(context, pages = {}, { assetsDir = null, transform = (html) => html } = {}) {
  await context.route(/^https?:\/\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.resourceType() === 'document') {
      const file = pages[url.origin + url.pathname];
      const body = file ? transform(fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf8')) : blankPage;
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body });
    }
    if (assetsDir) {
      const local = path.join(assetsDir, decodeURIComponent(url.pathname));
      if (local.startsWith(assetsDir) && fs.existsSync(local) && fs.statSync(local).isFile()) {
        return route.fulfill({ path: local });
      }
    }
    return route.abort();
  });
}

/** The extension's ID (needed to open the popup and settings pages). */
async function getExtensionId(context) {
  if (extensionIds.has(context)) return extensionIds.get(context);
  // With Playwright's Chromium: found by opening a Short on an empty offline page.
  const probe = await context.newPage();
  await probe.route(/^https?:\/\//, (route) => route.fulfill({ contentType: 'text/html', body: blankPage }));
  await probe.goto('https://www.youtube.com/shorts/extension-id-probe', { waitUntil: 'commit' });
  await probe.waitForURL(BLOCK_PAGE_RE);
  const id = new URL(probe.url()).host;
  await probe.close();
  extensionIds.set(context, id);
  return id;
}

/** Opens the popup and sets the switch to the requested position, as the user would. */
async function setEnabled(context, extensionId, on) {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await popup.waitForFunction(() => document.body.dataset.ready === '1');
  const toggle = popup.locator('#enabled');
  if ((await toggle.isChecked()) !== on) await popup.locator('label.toggle').click();
  await expect(toggle).toBeChecked({ checked: on });
  await expect(popup.locator('#status')).toHaveText(on ? 'On' : 'Off');
  await popup.close();
}

/** Writes settings to the extension's storage, as the settings page would. */
async function setSettings(context, values) {
  const id = await getExtensionId(context);
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/options/options.html`);
  await page.evaluate((v) => new Promise((resolve) => chrome.storage.local.set(v, resolve)), values);
  await page.close();
}

// A 1×1 pixel PNG, for the custom cover image test.
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

/**
 * The visual gaps between consecutive posts: from one post's lowest painted pixel to the next
 * post's highest. A covered post's painted area stops short of its own trailing space (--rb-gap),
 * which is exactly the spacing that has to survive being covered.
 */
function paintedGaps(page, selector) {
  return page.evaluate((sel) => {
    const PAINTING_TAGS = /^(IMG|VIDEO|CANVAS|SVG|PICTURE|INPUT|BUTTON)$/;
    const paints = (el) => {
      if (PAINTING_TAGS.test(el.tagName)) return true;
      const s = getComputedStyle(el);
      if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') return true;
      if (s.backgroundImage !== 'none') return true;
      if (parseFloat(s.borderBottomWidth) > 0 || parseFloat(s.borderTopWidth) > 0) return true;
      return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    };
    const off = document.documentElement.hasAttribute('data-rb-off');
    const bounds = (el) => {
      const r = el.getBoundingClientRect();
      if (!off && el.hasAttribute('data-rb-covered')) {
        // How far the cover actually stops short of the bottom edge, read from the painted
        // pseudo-element itself rather than from either gap variable.
        const inset = parseFloat(getComputedStyle(el, '::before').bottom) || 0;
        return { top: r.top, bottom: r.bottom - inset };
      }
      const kids = [...el.querySelectorAll('*')]
        .map((e) => ({ r: e.getBoundingClientRect(), p: paints(e) }))
        .filter((x) => x.p && x.r.width > 0 && x.r.height > 0);
      if (!kids.length) return { top: r.top, bottom: r.bottom };
      return { top: Math.min(...kids.map((x) => x.r.top)), bottom: Math.max(...kids.map((x) => x.r.bottom)) };
    };
    const els = [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().height > 0);
    const b = els.map(bounds);
    return b.slice(0, -1).map((cur, i) => Math.round(b[i + 1].top - cur.bottom));
  }, selector);
}

/** How many elements matching the selector are visible on screen. */
function countVisible(page, selector) {
  return page.evaluate((sel) => {
    return [...document.querySelectorAll(sel)].filter((el) => {
      if (el.getClientRects().length === 0) return false;
      const style = getComputedStyle(el);
      return style.visibility !== 'hidden' && style.opacity !== '0';
    }).length;
  }, selector);
}

/** Waits for the extension's scan to finish (it runs ~100 ms after changes). */
const settle = (page, ms = 800) => page.waitForTimeout(ms);

/** Checks that the page was NOT blocked (stays on the same URL). */
async function expectNotBlocked(page, url) {
  await page.goto(url);
  await settle(page);
  expect(page.url()).not.toMatch(BLOCK_PAGE_RE);
}

/** Checks that the page was blocked. */
async function expectBlocked(page, url) {
  // 'commit': the page is replaced by the extension straight away; no need to wait for it to load.
  await page.goto(url, { waitUntil: 'commit' });
  await page.waitForURL(BLOCK_PAGE_RE);
}

module.exports = {
  test,
  expect,
  BLOCK_PAGE_RE,
  FIXTURES_DIR,
  serveOffline,
  getExtensionId,
  setEnabled,
  setSettings,
  TINY_PNG,
  paintedGaps,
  countVisible,
  settle,
  expectBlocked,
  expectNotBlocked,
};
