# JustMyFeed (v0.1)

A Chrome extension that blocks:

- **YouTube Shorts**: covers the Shorts shelves and the Shorts in search results; hides the "Shorts" menu button and the Shorts tab on channel pages.
- **Instagram Reels**: covers Reels in the feed; hides the Reels tab and the Reels in Explore and on profiles.
- **Facebook Reels**: covers the "Reels" unit and Reel posts in the feed. Works both on the standard feed and on a feed
  rewritten by another extension such as F.B. Purity, which removes the markup Facebook normally uses for the feed.
- **Suggested and sponsored posts** on Instagram and Facebook: posts labelled "Suggested for you" / "Sponsored" (English and Greek labels).

**Cover, not removal.** Each blocked post stays exactly where it is, with its own size and spacing, under a solid black
cover carrying the note "Content blocked by JustMyFeed" Its video is paused and muted.
Because the page keeps its layout, it loads normally instead of endlessly requesting new material.

If you open a Reel from a direct link (e.g. from a message), you get the same cover filling the tab, the same note,
and a "Back" button.

The toolbar icon has an On/Off switch and a link to Settings.

Everything stays on your computer. The extension sends no data anywhere.

## Installation (same on Mac and Windows)

1. In Chrome, open `chrome://extensions`.
2. Top right, switch on **Developer mode**.
3. Click **Load unpacked** and choose the **`reels-blocker/extension`** folder, the one containing `manifest.json`.
4. Click the puzzle-piece icon in Chrome's toolbar and pin **JustMyFeed**.
5. If YouTube, Instagram or Facebook were already open, reload those tabs.

To pick up a new version: replace the files and press ↻ on the extension's card in `chrome://extensions`.

## Settings

From the icon → **Settings** (or right-click the icon → Options):

A cover is always exactly the size of the post it hides, so the page's layout never moves. An earlier "collapsed"
option shrank each post to a strip; it was removed after measurement showed it made the page much shorter, which
made Instagram fetch new posts about four times as often.
- **Cover image:** the cover is plain black. You can put an image of your own on it instead (tiled without
  distortion, scaled down to 400 pixels, stored on this computer only), and go back to plain black at any time.

## Automated tests

Needs [Node.js](https://nodejs.org) (LTS) and Google Chrome. The tests open a **clean, temporary** Chrome profile
(without your accounts, cookies or history), load the extension into it and check on their own.

Once, inside the `reels-blocker` folder:

```
npm install
```

Then, whenever something changes:

| Command | What it does |
|---|---|
| `npm test` | All tests (about a minute) |
| `npm run test:offline` | Only the tests without internet (mock YouTube, Instagram, Facebook pages) |
| `npm run test:live` | Only the tests on the real YouTube (needs internet) |
| `npm run test:watch` | Same tests, but you watch the browser work |
| `npm run report` | Opens a detailed report of the last run (with screenshots where something failed) |

What they cover:

- **Offline** (`tests/offline`): mock pages imitating the structure of the three sites. They check that the right
  elements are covered or hidden and **only those**, that the right URLs are blocked and **only those**, the On/Off
  switch, the cover's size and image, video pause/mute, the block page and its "Back" button.
- **Live** (`tests/live`): the real YouTube without an account. They catch the case where YouTube changes its page.
- **Your own real pages** (`tests/fixtures/real`): save your Instagram/Facebook feed with Ctrl+S and the tests check
  the extension against it, with no automated login. Instructions in [tests/fixtures/real/README.md](tests/fixtures/real/README.md).
  Those files never go online.

## Manual check

| Where | What you do | What you should see |
|---|---|---|
| YouTube | Search for something (e.g. "funny cats") | Regular videos; the Shorts shelf is a cover of the same size |
| YouTube | Open `youtube.com/shorts` | The block page |
| Instagram | Home page | No Reels button in the menu; each Reel, suggested or sponsored post in the feed is covered |
| Instagram | Home, scroll down | The page loads at a normal pace, not endlessly |
| Instagram | Open `instagram.com/reels/` | The block page |
| Facebook | Home page | The "Reels" unit and suggested/sponsored posts are covered |
| Facebook | Open `facebook.com/reel/` | The block page |
| Icon | Switch Off | Everything reappears without a reload |

If something slips through, keep a screenshot and the page address so the rule can be fixed.

## Layout

```
extension/                  the extension itself (this is what you load in Chrome)
  manifest.json             extension settings
  content/core.js           shared mechanism (URL check, cover, hide, video pause)
  content/cover.css         the cover's appearance
  content/*.js|css          rules per platform
  blocked/                  the page shown instead of a Reel
  popup/                    the toolbar icon's window (On/Off switch)
  options/                  settings page (cover size, image)
tests/
  offline/                  tests without internet
  live/                     tests on the real YouTube
  fixtures/                 mock pages
  fixtures/real/            your own saved pages (private)
```

## Known limits

- On Instagram every video post is technically a Reel now, so friends' videos in the feed are covered too.
- YouTube and Meta change their pages often, so a rule may need updating.
- The password for switching off does not exist yet; it will be added in a later version.

## Planned for the next version

- **Suggested and sponsored posts are matched by their label text, so that part is English-only in
  practice.** Reels and Shorts are matched by URL and work in every language; only this feature is
  affected. Two fixes are needed: match word stems rather than exact phrases, so the Greek variants
  ("για σένα" and "για εσένα", and the gender endings) all hit, and add the other common languages.
- Facebook deliberately obfuscates the word "Sponsored" to defeat ad blockers, so sponsored detection
  there is best-effort even in English. Instagram is more reliable.
