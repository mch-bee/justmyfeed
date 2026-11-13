// Facebook: blocks Reels.
JustMyFeed.start({
  name: 'facebook',
  label: 'Reel',

  // /reel/ID, /reels/..., /watch/reels, /page/reels/
  isBlockedUrl: (segments) => segments.includes('reel') || segments.includes('reels'),

  scan({ coverLinks, coverLabelled }) {
    // A feed unit, outermost first. div[aria-posinset] is how Facebook marks each unit when
    // role="feed" is absent — which is the case when an extension such as F.B. Purity rewrites the feed.
    const feedUnits = ['[role="feed"] > div', 'div[aria-posinset]', '[data-pagelet^="FeedUnit"]', '[role="article"]'];
    // In the feed, the "Reels and short videos" unit or the post stays in place, covered.
    // Links outside the feed (menu) are hidden.
    coverLinks('a[href*="/reel/"], a[href*="/reels/"]', feedUnits);
    // Posts labelled "Suggested for you" / "Sponsored", inside the feed only.
    coverLabelled('[role="feed"] > div, div[aria-posinset], [data-pagelet^="FeedUnit"]');
  },
});
