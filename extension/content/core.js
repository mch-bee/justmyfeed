// JustMyFeed: shared core for every platform.
// Each site script calls JustMyFeed.start({ name, label, isBlockedUrl, scan }).
//
// Three mechanisms:
//  1. If the page URL is a Reel/Short, the tab is sent to the block page.
//     These sites are single-page apps (they change the URL without reloading),
//     so the URL is checked continuously, not only on load.
//  2. Posts and shelves containing Reels get data-rb-covered: they stay in place, so the page
//     keeps its height and does not keep loading new material, but they sit under a solid
//     cover (cover.css). Their videos are paused and muted.
//  3. Menu buttons, tabs and lone links to Reels get data-rb-hidden and are hidden entirely.
(() => {
  'use strict';

  if (window.JustMyFeed) return;

  const BLOCK_PAGE = chrome.runtime.getURL('blocked/blocked.html');
  const SCAN_DELAY_MS = 100;
  const URL_POLL_MS = 400;
  const MAX_CLIMB = 6;
  const MAX_GAP = 64; // px: an upper bound, so an odd layout can't open a huge hole
  const PAINTING_TAGS = /^(IMG|VIDEO|CANVAS|SVG|PICTURE|INPUT|BUTTON)$/;
  // The cover is plain black. An image on it is opt-in, from the settings page.
  const DEFAULTS = { enabled: true, coverImage: '' };
  const BUILT_IN_IMAGE = /icons\/(cover-tile|icon128|homer)\.png$/;

  // Kinds of covered content. The label is kept in an attribute for the tests; it is not displayed.
  const KINDS = { reel: () => site.label, suggested: () => 'Suggested', sponsored: () => 'Sponsored' };

  // The labels the platforms put on posts you did not choose (English and Greek).
  const LABELS = {
    suggested: ['suggested for you', 'suggested post', 'suggested posts', 'προτεινόμενα για εσένα', 'προτεινόμενο για εσένα', 'προτείνεται για εσένα', 'προτεινόμενη ανάρτηση'],
    sponsored: ['sponsored', 'χορηγούμενο', 'χορηγούμενη', 'διαφήμιση'],
  };

  let site = null;
  let settings = { ...DEFAULTS };
  let enabled = true;
  let ready = false; // becomes true once settings have been read from storage
  let lastUrl = '';
  let redirecting = false;
  let scanTimer = null;
  const counts = { reel: 0, suggested: 0, sponsored: 0 };

  const root = () => document.documentElement;

  function isPageElement(el) {
    return !!el && el !== document.body && el !== document.documentElement;
  }

  function hide(el) {
    if (isPageElement(el) && !el.hasAttribute('data-rb-hidden')) el.setAttribute('data-rb-hidden', '');
  }

  // Does this element put anything on screen? Empty wrapper divs reach all the way down to a post's
  // bottom edge, so they must not count as the end of its content.
  function paintsSomething(el) {
    if (PAINTING_TAGS.test(el.tagName)) return true;
    const style = getComputedStyle(el);
    if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') return true;
    if (style.backgroundImage !== 'none') return true;
    if (parseFloat(style.borderBottomWidth) > 0 || parseFloat(style.borderTopWidth) > 0) return true;
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) return true;
    }
    return false;
  }

  const clampGap = (value) => Math.max(0, Math.min(Math.round(value), MAX_GAP));

  // The empty space that separates a post from the next one, measured from the post's bottom edge up
  // to its lowest painted pixel. Instagram and YouTube both hold that spacing INSIDE the post, not
  // between posts, so a cover painted over the whole box would swallow it and leave the posts
  // touching. Only the bottom band is examined, so this stays cheap. Must be called before the post
  // is covered, while it still has its natural layout.
  function trailingSpace(el) {
    const bottom = el.getBoundingClientRect().bottom;
    let lowest = -Infinity;
    for (const child of el.querySelectorAll('*')) {
      const rect = child.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.bottom <= bottom - MAX_GAP || rect.bottom <= lowest) continue;
      if (paintsSomething(child)) lowest = rect.bottom;
    }
    // Nothing paints in the bottom band (an empty placeholder, say): no gap rather than a hole.
    if (lowest === -Infinity) return 0;
    return clampGap(bottom - lowest);
  }

  function cover(el, kind = 'reel') {
    if (!isPageElement(el) || el.hasAttribute('data-rb-covered')) return;
    counts[kind] += 1;
    el.style.setProperty('--rb-gap', trailingSpace(el) + 'px');
    el.setAttribute('data-rb-covered', `${KINDS[kind]()} #${counts[kind]}`);
    el.setAttribute('data-rb-kind', kind);
  }

  // true if the parent contains nothing but the child (no other element, no text).
  function isOnlyContent(parent, child) {
    for (const node of parent.childNodes) {
      if (node === child) continue;
      if (node.nodeType === Node.ELEMENT_NODE) return false;
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) return false;
    }
    return true;
  }

  // Climbs upwards while the parent contains only this element, so that the whole
  // "box" is hidden and not just the link. Stops before anything that has other content
  // (e.g. a paragraph of text).
  function soleWrapper(el) {
    let cur = el;
    for (let i = 0; i < MAX_CLIMB; i++) {
      const parent = cur.parentElement;
      if (!parent || parent === document.body || !isOnlyContent(parent, cur)) break;
      cur = parent;
    }
    return cur;
  }

  // The first container in the list found above the link (list order is priority), else null.
  function findContainer(link, containers) {
    for (const sel of containers) {
      const target = link.closest(sel);
      if (target) return target;
    }
    return null;
  }

  // For every matching link: covers its container.
  // Without a container (e.g. a menu button), hides the link's box instead.
  function coverLinks(linkSelector, containers = []) {
    for (const link of document.querySelectorAll(linkSelector)) {
      if (link.closest('[data-rb-hidden], [data-rb-covered]')) continue;
      const target = findContainer(link, containers);
      if (target) cover(target);
      else hide(soleWrapper(link));
    }
  }

  // Like coverLinks, but hides entirely.
  function hideLinks(linkSelector, containers = []) {
    for (const link of document.querySelectorAll(linkSelector)) {
      if (link.closest('[data-rb-hidden], [data-rb-covered]')) continue;
      hide(findContainer(link, containers) || soleWrapper(link));
    }
  }

  function hideMatching(selector, predicate) {
    for (const el of document.querySelectorAll(selector)) {
      if (el.hasAttribute('data-rb-hidden')) continue;
      if (!predicate || predicate(el)) hide(el);
    }
  }

  // true if the element contains a piece of text that is exactly one of the phrases.
  function containsLabel(el, phrases) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim().toLowerCase();
      if (text && text.length <= 40 && phrases.includes(text)) return true;
    }
    return false;
  }

  // Covers the posts the platform has labelled as suggested or sponsored.
  function coverLabelled(containerSelector) {
    for (const el of document.querySelectorAll(containerSelector)) {
      if (el.hasAttribute('data-rb-covered') || el.closest('[data-rb-covered], [data-rb-hidden]')) continue;
      if (containsLabel(el, LABELS.sponsored)) cover(el, 'sponsored');
      else if (containsLabel(el, LABELS.suggested)) cover(el, 'suggested');
    }
  }

  // Videos inside covered or hidden elements: paused and muted,
  // and paused again every time the site tries to start them.
  function silence(video) {
    video.muted = true;
    video.defaultMuted = true;
    if (!video.paused) video.pause();
    if (video.hasAttribute('data-rb-silenced')) return;
    video.setAttribute('data-rb-silenced', '');
    video.removeAttribute('autoplay');
    video.addEventListener('play', () => {
      if (enabled && video.closest('[data-rb-covered], [data-rb-hidden]')) {
        video.muted = true;
        video.pause();
      }
    });
  }

  function silenceAll() {
    for (const video of document.querySelectorAll('[data-rb-covered] video, [data-rb-hidden] video')) silence(video);
  }

  function pathSegments(loc) {
    return loc.pathname.split('/').filter(Boolean).map((s) => s.toLowerCase());
  }

  const api = {
    hide,
    cover,
    hideLinks,
    coverLinks,
    coverLabelled,
    hideMatching,
    soleWrapper,
    path: () => pathSegments(location),
  };

  function checkUrl() {
    if (!ready || !enabled || !site || redirecting) return;
    const href = location.href;
    if (href === lastUrl) return;
    lastUrl = href;
    if (site.isBlockedUrl(pathSegments(location), location)) {
      // The guard matters because a settings change re-runs this check: without it a second
      // replace() could fire while the first is still in flight and abort the navigation.
      redirecting = true;
      location.replace(BLOCK_PAGE + '?site=' + encodeURIComponent(site.name));
    }
  }

  function scan() {
    scanTimer = null;
    if (!enabled || !site || !document.body) return;
    try {
      site.scan(api);
      silenceAll();
    } catch (err) {
      console.warn('[JustMyFeed]', err);
    }
  }

  function onChange() {
    checkUrl();
    if (scanTimer === null) scanTimer = setTimeout(scan, SCAN_DELAY_MS);
  }

  function applySettings() {
    enabled = settings.enabled !== false;
    ready = true;
    const r = root();
    r.toggleAttribute('data-rb-off', !enabled);
    if (settings.coverImage) {
      r.style.setProperty('--rb-cover-image', `url("${settings.coverImage}")`);
      r.setAttribute('data-rb-has-image', '');
    } else {
      r.style.removeProperty('--rb-cover-image');
      r.removeAttribute('data-rb-has-image');
    }
    if (enabled) {
      lastUrl = '';
      onChange();
    }
  }

  function start(config) {
    site = config;

    chrome.storage.local.get({ ...DEFAULTS, settingsVersion: 1 }, (stored) => {
      // One-time migration from earlier builds, which had a collapsed cover size (dropped: it made
      // the page much shorter, so the site fetched far more as you scrolled) and a built-in image.
      if (stored.settingsVersion < 4) {
        const changes = { settingsVersion: 4 };
        if (BUILT_IN_IMAGE.test(stored.coverImage || '')) changes.coverImage = '';
        Object.assign(stored, changes);
        chrome.storage.local.set(changes);
        chrome.storage.local.remove('coverSize');
      }
      settings = { ...DEFAULTS, ...stored };
      applySettings();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      let touched = false;
      for (const key of Object.keys(DEFAULTS)) {
        if (key in changes) {
          settings[key] = changes[key].newValue ?? DEFAULTS[key];
          touched = true;
        }
      }
      if (touched) applySettings();
    });

    new MutationObserver(onChange).observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('popstate', checkUrl);
    if (window.navigation) window.navigation.addEventListener('navigatesuccess', checkUrl);
    setInterval(checkUrl, URL_POLL_MS);
  }

  window.JustMyFeed = { start };
})();
