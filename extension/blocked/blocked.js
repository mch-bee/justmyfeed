const HOMES = {
  youtube: 'https://www.youtube.com/',
  instagram: 'https://www.instagram.com/',
  facebook: 'https://www.facebook.com/',
};

const home = HOMES[new URLSearchParams(location.search).get('site')] || 'about:blank';

// The same cover as on the feed: plain black, or the user's own image if they chose one.
chrome.storage.local.get({ coverImage: '' }, ({ coverImage }) => {
  if (coverImage) document.body.style.setProperty('--cover-image', `url("${coverImage}")`);
});

document.getElementById('back').addEventListener('click', () => {
  if (history.length <= 1) return location.replace(home);
  history.back();
  // If "Back" leads nowhere (e.g. a tab opened straight on a Reel), go to the platform's home page.
  const fallback = setTimeout(() => location.replace(home), 500);
  addEventListener('pagehide', () => clearTimeout(fallback), { once: true });
});
