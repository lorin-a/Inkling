# Inkling — status (live)

**Read this first.** The live state of the project: where we are, what just shipped, what's
next. Durable *decisions* (why we chose things) live in the memory
(`project_product_direction`); this doc is the *current state*. Keep it short; update as we go.

## Right now
- **Branch `v2`** (cut from `phase-6c-playground`; `main` = the frozen OG "Moodbuilder" standalone).
- Everything **committed, NOT pushed.** Dogfood **signed-out** (localStorage); Playwright runs in a
  separate browser, not yours.
- Run: `npm run dev` → `localhost:3000`. `npm run build` to verify green before declaring done.

## ★ First-run + project boundary — BUILT & verified (2026-06-11)
The beta found the core problem: signed-out was **single-project, sample-seeded**, so a real
import dissolved into the sample pile and Gather showed stale exploration — the tool *created*
the overwhelm it exists to relieve. Fix (in `lib/storage/localStore.js` + `app/page.js`):
- **Default flipped to EMPTY.** A fresh visitor's studio starts empty; the sample is **opt-in**.
  `startOwn()` = clean named-empty project; `seedSample()` = the sample. `firstRun`/`mode` keys;
  existing visitors migrate silently to `mode:sample`.
- **Distinct onboarding door on the home page** (2026-06-11, was too-subtle CTA before): fresh
  visitor is *met* with `WELCOME · FIRST VISIT` + the sell line + two real choice cards — **Bring
  your inspiration in** (→ empty project → `/import`) / **Explore a sample** (→ seed → flow). Banner/
  projects/BrandShuffle hidden during first-run. Verified fresh; 0 errors.
- ⚠ **To SEE first-run in your own browser:** existing data migrated to sample mode, so clear it —
  DevTools console on the localhost tab: `Object.keys(localStorage).filter(k=>k.startsWith('moodbuilder.local.')).forEach(k=>localStorage.removeItem(k));location.reload()`. (A real "start a new
  project" path for returning users is a separate future piece.)
- **No more "SAMPLE" mislabel** on your own project (`ProjectSwitcher` + landing card gate on mode).
- Verified: own = empty (0 pins, no bleed), Gather clean; sample path seeds + loads; 0 console errors.
- **PARKED (come back):** the hero "living brand" demo. Lorin: replace the random fictional
  "Coastline" with *some* interactive/animated hero that showcases what Inkling offers (form TBD —
  "inkling-as-the-demo" raised a locked-brand tension, left unresolved). `BrandShuffle` is current.
- **Vocab fixed (DONE):** `StageNav` (the one source of truth) now reads **Gather · Play · Build**,
  matching the locked model + the landing. Play (board) absorbs Organize+Narrow; carve survives as a
  Play sub-action ("Carve a direction →"). Verified on /brand + /moodboard, 0 errors.
- **NEXT on this thread:** (1) **post-import handoff** — import done-state still says "Open library →"
  (the dead-end Lorin hit); lead into the flow ("Gather what rings true →" /recognize). (2) the
  **guided tour** (one interaction per beat for the sample path — currently "Explore a sample" just
  drops into /recognize). (3) make **Type** more legibly part of Gather (it's a Color|Type subnav).
  Flow map draft: `public/onboarding-flow.html` (storyboard — Lorin's note: onboarding must *preview
  the real thing*, not abstract it).

## What it is
**Inkling** — a studio that turns your saved inspiration into a brand direction, with you as the
author the whole way. One home (the canvas); three moves: **Gather · Play · Build.**

## Brand (locked — see memory for the why)
Name **Inkling** (`inkling.`). Warm paper + ink; spark = **ultraviolet `#6a2ee6` + tangerine
`#f0531f`** (surgical). Fraunces + mono. **Editorial structure** (mastheads, mono index, hairline
rules, specimen plates), NOT rounded/soft/trendy. The art is the hero; warmth from craft, not props.
Tokens in `globals.css`. GSAP installed. The lock artifact: `public/inkling-final.html`
(exploration mocks in `public/inkling-*.html`).

## Grid foundation + design tooling (NEW — needs a reload to finish)
- **Impeccable installed** (`pbakaus/impeccable`) into `.claude/skills` — a design-expertise
  skill set (`/impeccable layout`, `craft`, `document`, + deterministic detectors). **Reload
  Claude Code, then run `/impeccable init`** to generate `PRODUCT.md` + `DESIGN.md`. Its
  `reference/layout.md` is excellent — already applied below.
- **Native grid system** (grid is a known weak spot): `globals.css` now has a **4pt spacing
  scale** (`--space-3xs…3xl`) + fluid `--bleed`/`--rhythm` (clamp) + `--grid-cols`/`--gutter`;
  new **`components/Grid.js`** primitive (`<Bleed>`, `<Grid>`). New craft reference
  **`~/.claude/GRID.md`** + a pre-ship grid gate (registered in global CLAUDE.md; retired
  `NEXT.md` to balance). **Register split** learned: brand surfaces = asymmetric/fluid; product
  = predictable.
- **Landing put on the broadsheet grid**: 12-col hero, the index as a 3-up module w/ vertical
  rules + ≥3:1 hierarchy, projects as a left-rail spread (`auto-fit` fill). **`/import` fully
  rebuilt editorial** (masthead, rule-divided sections, index-row steps) + all 4 "Moodbuilder"
  on-page leftovers → "Inkling".
- **`/import` now stamped** with the foundation (brand register): all source views on a
  12-col `.flow` spread = sticky left **context rail** (mono kicker + credit line + spec
  list) + content body; tokens reconciled (`--bleed`/scale); verified desktop + mobile,
  console clean.
- **Ground → newsprint `#f7f6f2`** (was cream `#f9f4ec`, 2026-06-11): near-neutral so it doesn't
  recolour the art; warm ink kept. **Designed, not built:** (a) dark "ink canvas" ground as a
  scoped *landing/marketing* experiment (brand register); (b) light/dark reframed as a viewing
  tool — a **canvas surround toggle** in Gather/Play + **light/dark brand preview** in Build (color
  judged truest on a neutral ground; a real brand must work on both). `/impeccable init` done:
  **PRODUCT.md + DESIGN.md** written (encode the brand + register split). **Still queued:** tighten
  over-used mono eyebrows (keep `01/02/03` — earned); add Impeccable + GRID.md to the `New Claude`
  recovery backup.
- **Apply next** (foundation laid, not stamped everywhere): reconcile the **landing**
  masthead/banner/colophon to `--bleed`; push bolder brand-register asymmetry on landing +
  import (a deliberate off-axis move, more visible grid edges); **inner pages**
  (studio/gather/build) = product register (predictable, consistent density). Run the
  GRID.md gate on each. Then resume the beta dogfood.

## Shipped this arc (recent → older)
- **Session continuity set up** (process, not product): `STATUS.md` = live state, memory = decisions,
  git = history. Trimmed the bloated `project_product_direction` memory (767 → 171 lines), retired
  `NEXT.md`. New universal **`/wrapup`** skill closes a session; open the next with "Read STATUS.md…".
- **New-user import** (`/import`): Pinterest (+ "make one" nudge), Upload screenshots, Paste-a-link,
  Are.na — all with **source crediting**, working signed-out. Link path verified end-to-end.
- **Landing rebuilt to Inkling**: masthead + edition line, hero with a **living brand** (`BrandShuffle`,
  GSAP auto/click shuffle), the `01/02/03` flow index, scroll reveals. Wordmark `inkling.` + title
  "Inkling" app-wide via tokens.
- Earlier v2 spine: the **pile** in the real flow; skeleton consolidation (one nav, vocab → "your
  inspiration", well shelved, Direction travels); **"+ Color" summons the real gather**;
  canvas-as-home dimension containers; the warm/craft canvas pass.

## ★ Onboarding "Make Inkling yours" — prototype built & loved (2026-06-11)
The opening act = the real product in miniature, **Inkling as the subject**: you react your way to
*Inkling's own brand* and the site reskins into your version. Prototype: **`public/make-inkling.html`**
(self-contained, real interactions, real color engine, contrast-legible by construction). Beats:
**Gather** (full-screen wall) → **Colors** (clean grid, remove any) → **Type** (pick a face) →
**reveal** (page wears it; **Shuffle (spacebar)** + Light/Dark, playful not a dead finish). Design laws
(she reviewed hard): immersive/large/one-decision/skippable every beat; **fast spine + optional depth**
(per-part precision lives in the real Build tool, not onboarding); direct copy; US English; use
intuition repeatedly. See [[project_onboarding_genesis]]. **Killed** the playable sample-studio idea.

## Next move (do this first)
**Continue the onboarding — the three Lorin confirmed for next time** (build properly, don't rush):
1. a **manual color-adjust** step (eyedrop / edit hex) in/after Colors; 2. **more type options +
pairing choices** = the **Type font-web** (connect/draw a line to pair a title voice + body voice,
spacebar reshuffles the field, mix-and-match); 3. a **draggable moodboard (Play) beat** before the
reveal. Then: wire the prototype in as the real front door + full-app skin persistence.
**Parallel structural priority:** **`RIGHTS.md` Phase 0** (delete `lib/pinterestSourceFetcher.js` +
stop the bookmarklet auto-scroll) before any public launch — read `RIGHTS.md` before touching import.

## Then (dogfood-driven, in rough order)
- Bring the **inner pages** (studio, gather, build) up to the editorial Inkling bar (product register;
  they inherit the tokens but aren't bespoke-rebuilt yet). `/import` is now editorial + on the grid.
- Make **Build / export** work end-to-end (gathered palette → a brand → an export).
- Landing: reconcile masthead/banner/colophon to `--bleed`; the bolder asymmetric brand-register move.
- (Retiring, per `RIGHTS.md`: the Pinterest scraping bookmarklet → "import your data export".)

## Open "your call" (from FLOW_AUDIT)
Merge `/colors`; defer marks/textures/gradients; the Narrow gesture; the cross-project well (shelved).

## Sourcing & rights (legal/ethical) — PLAN WRITTEN (2026-06-11)
The scraping-vs-API question is no longer floating: it's a documented plan in **`RIGHTS.md`**.
Headline: stop the auto-scroll scraper + delete the server-side spoofed-UA fetcher (Phase 0,
before any public launch); reframe the library as *palettes + decisions + owned/licensed files +
live references* ("reference, don't replicate"); gate publishing to owned/openly-licensed content;
add **Pexels** (storeable, publishable) then **Unsplash** (hotlink-only); make attribution an
*educational* layer, not decoration. Lorin's open calls + the phased build list live in `RIGHTS.md`.

## Docs map
- **Decisions** → `memory/project_product_direction.md` (product, flow, brand — read first for *why*).
- **This file** → live state + next.
- `FLOW_AUDIT.md` (per-surface keep/cut), `PITCH.md` (the pitch + diagram). `NEXT.md` is retired.
- **`RIGHTS.md`** → the sourcing/rights ethical+legal+educational plan (read before touching import).
