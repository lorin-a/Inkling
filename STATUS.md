# Inkling — status (live)

**Read this first.** The live state of the project: where we are, what just shipped, what's
next. Durable *decisions* (why we chose things) live in the memory
(`project_product_direction`); this doc is the *current state*. Keep it short; update as we go.

## Right now
- **Branch `v2`** (cut from `phase-6c-playground`; `main` = the frozen OG "Moodbuilder" standalone).
- Everything **committed, NOT pushed.** Dogfood **signed-out** (localStorage); Playwright runs in a
  separate browser, not yours.
- Run: `npm run dev` → `localhost:3000`. `npm run build` to verify green before declaring done.

## What it is
**Inkling** — a studio that turns your saved inspiration into a brand direction, with you as the
author the whole way. One home (the canvas); three moves: **Gather · Play · Build.**

## Brand (locked — see memory for the why)
Name **Inkling** (`inkling.`). Warm paper + ink; spark = **ultraviolet `#6a2ee6` + tangerine
`#f0531f`** (surgical). Fraunces + mono. **Editorial structure** (mastheads, mono index, hairline
rules, specimen plates), NOT rounded/soft/trendy. The art is the hero; warmth from craft, not props.
Tokens in `globals.css`. GSAP installed. The lock artifact: `public/inkling-final.html`
(exploration mocks in `public/inkling-*.html`).

## Shipped this arc (recent → older)
- **New-user import** (`/import`): Pinterest (+ "make one" nudge), Upload screenshots, Paste-a-link,
  Are.na — all with **source crediting**, working signed-out. Link path verified end-to-end.
- **Landing rebuilt to Inkling**: masthead + edition line, hero with a **living brand** (`BrandShuffle`,
  GSAP auto/click shuffle), the `01/02/03` flow index, scroll reveals. Wordmark `inkling.` + title
  "Inkling" app-wide via tokens.
- Earlier v2 spine: the **pile** in the real flow; skeleton consolidation (one nav, vocab → "your
  inspiration", well shelved, Direction travels); **"+ Color" summons the real gather**;
  canvas-as-home dimension containers; the warm/craft canvas pass.

## Next move (do this first)
**THE BETA — Lorin dogfoods her own tool.** Import her real Inkling inspiration (the Pinterest
board + screenshots + credited links via `/import`), then run **Gather → Play → Build** end to end.
*Her friction is the next build list.* The meta-test: can Inkling find its own brand? Open the new
session pointed straight at this.

## Then (dogfood-driven, in rough order)
- Bring the **inner pages** (studio, gather, build) up to the editorial Inkling bar (they inherit the
  tokens but aren't bespoke-rebuilt yet).
- Make **Build / export** work end-to-end (gathered palette → a brand → an export).
- Tidy: bookmarklet still says "Moodbuilder"; `/import` not fully editorial; BrandShuffle monogram nudge.

## Open "your call" (from FLOW_AUDIT)
Merge `/colors`; defer marks/textures/gradients; the Narrow gesture; the cross-project well (shelved);
**Pinterest official-API vs the scraping bookmarklet before public launch** (legal — see memory).

## Docs map
- **Decisions** → `memory/project_product_direction.md` (product, flow, brand — read first for *why*).
- **This file** → live state + next.
- `FLOW_AUDIT.md` (per-surface keep/cut), `PITCH.md` (the pitch + diagram). `NEXT.md` is retired.
