# Real pages for testing

Save copies of real pages here, so the extension is checked against the page structure
you see when signed in, without any automated login to your account.

**The files in this folder never go online** (they are excluded in `.gitignore`),
because they contain your personal feed.

## How to save a page

1. In Chrome, **switch JustMyFeed off** from its icon, so the page still contains Reels.
2. Open the page and scroll a little, so posts and Reels load.
3. Press **Ctrl+S** (**Cmd+S** on a Mac), choose **Webpage, Complete** and save it here under one of these names:

| Page | File name |
|---|---|
| Instagram home | `instagram-home.html` |
| Instagram Explore | `instagram-explore.html` |
| Facebook home | `facebook-home.html` |
| YouTube home (signed in) | `youtube-home.html` |

The part after the dash becomes the page path (`instagram-explore` → `instagram.com/explore/`, `home` → the home page).

4. Switch JustMyFeed back on.
5. Run `npm run test:offline`.
