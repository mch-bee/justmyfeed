// Instagram: blocks Reels.
JustMyFeed.start({
  name: 'instagram',
  label: 'Reel',

  // /reels/, /reel/ID/, /user/reels/, /user/reel/ID/
  isBlockedUrl: (segments) => segments.includes('reels') || segments.includes('reel'),

  scan({ coverLinks, coverLabelled, hideLinks, path }) {
    const selector = 'a[href*="/reel/"], a[href*="/reels/"]';
    if (path().length === 0) {
      // Home feed: a Reel post stays in place, covered. Anything not in a post (menu button) is hidden.
      coverLinks(selector, ['article']);
      // Posts labelled "Suggested for you" / "Sponsored".
      coverLabelled('article');
    } else {
      // Explore, profiles, menu: hide only the link's box.
      hideLinks(selector);
    }
  },
});
