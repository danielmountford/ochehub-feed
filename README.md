# OcheHub Feed: redesign prototype

A standalone, mobile-first rebuild of the OcheHub Feed. It is a separate website: nothing here imports from, or writes to, the main `ochehub` repo.

The design on `main` is the second style explored: no card boxes, minimal UI and text, pictures and type on a near-black canvas. It keeps one thing from the first style, the card slider at the top of For you. The first style is kept on the `style-1` branch.

- No borders or card boxes. A card is its picture, a title and at most one quiet line. Shape says what it is: 16:9 is a video, 9:16 a Short, a square a podcast, bare type a headline.
- "Following Luke Littler" appears under items that are placed where they are because of a player or competition you follow. Nothing else is tagged, and the tags go away when follows are switched off in Tune.
- Swiping left or right anywhere on a page moves to the next tab, following your finger. Carousels and rails keep their own sideways scroll.
- Titles are shown without emoji, all-caps shouting or repeated exclamation marks (`tidy()` in `src/data/content.ts`). The snapshot keeps each source's wording.
- Save lives in the player rather than on every card.
- Bottom navigation is a floating icon dock, with the mini player as a pill above it.

## Run it

```
node scripts/serve.mjs
```

Then open http://localhost:4173. A built copy is already in `dist/`, so there is nothing to install. The server also prints an address you can open on a phone on the same Wi-Fi, which is the best way to feel the gestures.

Open it through the server, not by double-clicking `dist/index.html`: YouTube refuses to play inside pages loaded from `file://`.

To change the code:

```
npm install
npm run dev      # rebuilds on save and serves on :4173
npm run build    # writes dist/
npm run typecheck
```

## What's in the feed

| Tab | What it shows |
| --- | --- |
| For you | A sequence of different modules rather than one list: card slider, Shorts rail, headlines, a video feature, podcast rail, socials, then longer lists |
| Videos | Lead video plus list, filterable by channel |
| Shorts | Two-column grid of 9:16 tiles |
| Podcasts | Continue listening, the four shows, latest episodes |
| News | Type only: one large lead headline, then the rest |
| Social | Posts from the sources' accounts (sample content, see below) |

Move between tabs by tapping them or by swiping the page sideways. The page follows your finger, the next one slides in beside it, and the green dot under the tabs travels with them. Let go past about a third of the way, or flick, and it carries on; otherwise it springs back. Swipes that start on a carousel or rail scroll that instead.

### Tailoring

The **Tune** icon in the header opens the personalisation sheet. It starts from what the account already follows in OcheHub (`accountFollows` in `src/data/catalogue.ts`: players, competitions, channels, shows and publishers) and lets the viewer:

- choose how much follows matter: Everything, Follows first, or Only follows;
- follow and unfollow players, competitions and sources;
- choose which content types are in the mix.

Changes are staged and applied together, and the Apply button shows how many items the feed will hold. Tapping a player or competition inside the video card focuses For you on that one follow.

Follows also show up in the feed itself: an item that ranks where it does because of a followed player or competition carries a green "Following …" line (`FollowTag` in `src/feed/cards.tsx`, using `reasonFor` in `src/lib/feed.ts`). Followed channels, shows and publishers lift their items too but are not tagged, since the source name is already on the card.

### Player

One persistent player layer sits above the feed.

| Content | Full card | Moving between items | Mini player |
| --- | --- | --- | --- |
| Video | Slides up, autoplays, 16:9 pinned above scrolling details | Swipe left or right, arrow keys, or Up next | Swipe the card down, or tap the chevron |
| Short | Slides up, autoplays, 9:16 filling the screen | Swipe left or right, arrow keys | Same |
| Podcast | Slides up, autoplays, artwork and transport | Previous and Next buttons only (no swiping), or the episode list | Same |

From the mini player: tap or drag up to expand, swipe down or tap the cross to dismiss. Every gesture follows the finger and can be reversed before you let go.

## How it's built

React 19 and TypeScript, plain CSS, bundled by esbuild. There are no runtime dependencies beyond React: gestures and springs are written by hand in two small files so the prototype installs and runs anywhere.

```
src/
  data/       types, source catalogue, content snapshot
  lib/        motion.ts (springs), drag.ts (gestures), feed.ts (ranking, modules), store.ts
  feed/       feed UI: cards, modules, tab views, Tune sheet, search, saved
  player/     PlayerHost (choreography), engines (YouTube iframe + audio), cards, mini bar
  styles/     tokens.css (OcheHub tokens), base, feed, player
public/       index.html, fonts, logo
scripts/      build.mjs, serve.mjs
```

The player animation is driven by three numbers in `player/PlayerHost.tsx`: `open` (card sliding up), `mini` (full card morphing into the mini bar) and `x` (the card pager). The media element never remounts between full and mini, which is why playback carries straight through the morph.

The tab pager lives in `app.tsx`. The current page stays in the document flow; while you swipe, the neighbouring page is mounted and pinned to the screen beside it, and when the swipe lands it takes over the flow without remounting.

### Bringing it into the app

- `styles/tokens.css` mirrors `@ochehub/tokens` and the roles in `@ochehub/ui/theme`; swap the variables for the app's and the rest follows.
- `lib/motion.ts` maps onto framer-motion's `useMotionValue` and `animate(..., { type: 'spring' })`, which `apps/web` already has.
- `data/types.ts` follows the Feed DTOs in `@ochehub/types`, with `short` and `social` added.
- Source ids match `apps/api/src/providers/feed/sources.ts`.

## Publishing

`.github/workflows/pages.yml` publishes `dist/` from `main` to GitHub Pages on every push to `main`. `dist/` is committed, so the workflow does not build anything: run `npm run build` (or `node scripts/build.mjs`) before committing a change.

## Content

The snapshot in `src/data/content.ts` was taken on 2 October 2026 from the eleven approved sources.

- **Videos and Shorts**: real YouTube ids, with titles and channels confirmed through YouTube's oEmbed endpoint. That endpoint gives no duration or publish date, so cards show neither; ordering uses an estimated date that is never displayed.
- **Podcasts**: real titles, dates, durations, artwork and audio from each show's RSS feed.
- **News**: Dartsnews titles, links and times from its news sitemap. The Online Darts feed could not be fetched, so its three headlines come from search results and have no time.
- **Social**: sample posts. Social sources are not in the catalogue, so each post is written around a real item from that source and is labelled as a sample in the UI.

Playback was tested against stand-ins for YouTube and the podcast hosts, because the build environment could not reach them. Real playback needs checking in a browser.

## Before this ships

1. **YouTube's embedded-player rules.** The swipe gestures work by putting a transparent layer and custom controls over the iframe, and the mini player shrinks the video well below 200px. YouTube's API policies restrict both (no overlays in front of the player; a minimum 200×200 viewport). Compliant alternatives: show YouTube's own controls and keep gestures to the areas around the video; make the video mini player a floating card at least 200px tall, or keep the mini player for podcasts only. This needs a product decision.
2. **Autoplay on iOS.** Safari may refuse sound without a tap inside the iframe. The player falls back to muted autoplay with a "Tap for sound" prompt, then to "Tap the video to play".
3. **No autoplay-next.** When a video ends the card offers Replay and Next rather than moving on by itself, matching decision D11. Shorts loop.
4. **News images and excerpts** stay off, as in the current feed, until each publisher's terms allow them. The news design does not depend on them.

Fonts: Barlow Semi Condensed (SIL Open Font License, see `public/fonts`) and IBM Plex Mono (SIL Open Font License).
