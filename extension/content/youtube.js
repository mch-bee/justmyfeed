// YouTube: blocks Shorts.
JustMyFeed.start({
  name: 'youtube',
  label: 'Short',

  // /shorts/ID, /@channel/shorts, /hashtag/x/shorts etc.
  isBlockedUrl: (segments) => segments.includes('shorts'),

  scan({ coverLinks, hideMatching }) {
    // Every link to a Short: cover the whole shelf if there is one, otherwise the card.
    // Links with neither (e.g. inside a description) are simply hidden.
    coverLinks('a[href^="/shorts/"], a[href*="youtube.com/shorts/"]', [
      'ytd-rich-section-renderer',
      'ytd-reel-shelf-renderer',
      'grid-shelf-view-model',
      'ytd-rich-shelf-renderer',
      'ytd-rich-item-renderer',
      'ytd-video-renderer',
      'ytd-grid-video-renderer',
      'ytd-compact-video-renderer',
      'ytd-reel-item-renderer',
      'yt-lockup-view-model',
      'ytm-shorts-lockup-view-model-v2',
      'ytm-shorts-lockup-view-model',
    ]);

    const isShortsLabel = (text) => (text || '').trim() === 'Shorts';

    // "Shorts" button in the left menu (full and mini) and in the mobile bottom bar.
    hideMatching('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ytd-pivot-bar-item-renderer', (el) => {
      const link = el.querySelector('a');
      return isShortsLabel(link && link.getAttribute('title')) ||
        isShortsLabel(el.getAttribute('aria-label')) ||
        isShortsLabel(el.textContent);
    });

    // "Shorts" tab on channel pages and "Shorts" filter chip in search results.
    hideMatching('yt-tab-shape, tp-yt-paper-tab, yt-chip-cloud-chip-renderer, chip-view-model', (el) =>
      isShortsLabel(el.getAttribute('tab-title')) || isShortsLabel(el.textContent));
  },
});
