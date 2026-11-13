# Chrome Web Store listing — copy and paste

Everything below goes into the Developer Dashboard. Fields marked **required** must be filled or the
item cannot be submitted.

---

## Store listing tab

**Name** (required, max 75)

```
JustMyFeed
```

**Short description** (required, max 132) — this is the manifest description and appears in search results

```
Covers Reels, Shorts, suggested and sponsored posts on YouTube, Instagram and Facebook.
```

**Detailed description** (required)

```
JustMyFeed hides the parts of your feed you did not ask for.

On YouTube, Instagram and Facebook it covers:
• Reels and Shorts
• Posts labelled "Suggested for you"
• Posts labelled "Sponsored"

Covered, not deleted. Each post stays exactly where it was, at exactly its own size, under a plain
black cover. Its video is paused and muted so nothing plays and nothing downloads in the background.

Why covering rather than removing? Because removing posts makes the page shorter, and a shorter page
makes these sites fetch more posts to fill it — so you end up being served more, not less. Keeping
each post's size means the page behaves exactly as it would without the extension. This was measured,
not guessed: with posts covered, the page height is identical to the page height with the extension
switched off.

Open a Reel from a link someone sent you and you get a plain page saying the content was blocked,
with a Back button.

One switch turns the whole thing on and off. If you would rather look at something other than black,
you can put an image of your own on the covers.

Private by design. JustMyFeed makes no network requests at all. It has no analytics, no telemetry and
no account. The only thing it stores is your on/off setting and your chosen cover image, both kept on
your own computer. It asks for a single permission: storage.

Open source — the full code can be read and checked.
```

**Category**: Well-being
**Language**: English (UK)

---

## Privacy practices tab

**Single purpose** (required)

```
JustMyFeed has a single purpose: to hide short-form video and algorithmically suggested content on
YouTube, Instagram and Facebook, by covering those posts in place on the page.
```

**Permission justifications** (required)

*storage*

```
Used to remember two settings on the user's own computer: whether the extension is switched on, and
the optional cover image the user selected. No other data is stored.
```

*Host access to youtube.com, instagram.com, facebook.com*

```
The extension's only function is to cover Reels, Shorts and suggested or sponsored posts on these
three sites. It must run on their pages to find those posts and cover them. It runs on no other site,
reads no page content beyond what is needed to identify those posts, and transmits nothing.
```

**Remote code**: No, I am not using remote code.
*(Everything is in the package; there is no eval, no injected script tags and no fetched code.)*

**Data usage** — tick **nothing**, then certify all three statements:

| Question | Answer |
|---|---|
| Personally identifiable information | Not collected |
| Health information | Not collected |
| Financial and payment information | Not collected |
| Authentication information | Not collected |
| Personal communications | Not collected |
| Location | Not collected |
| Web history | Not collected |
| User activity | Not collected |
| Website content | Not collected |

Then tick the three certifications: data is not sold to third parties, is not used for purposes
unrelated to the single purpose, and is not used to determine creditworthiness or for lending.

**Privacy policy URL** (required once a URL exists): the published address of `PRIVACY.md`.

---

## Distribution tab

- **Visibility**: Public (or Unlisted while you try it out — unlisted items are not searchable and
  are reachable only by direct link, but still go through review).
- **Regions**: all, unless you want otherwise.
- **Pricing**: free.

---

## Assets needed

| Asset | Size | Required |
|---|---|---|
| Store icon | 128×128 PNG | Yes — already in the package |
| Screenshot | 1280×800 or 640×400 PNG | Yes, at least one, up to five |
| Small promo tile | 440×280 PNG | Only if you want to be eligible for featuring |
| Marquee promo tile | 1400×560 PNG | Optional |
