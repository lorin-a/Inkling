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

## ★ Onboarding Colors → reveal — BUILT & verified (2026-06-12, commit a3b6e39)
`public/make-inkling.html`. The Colors beat + reveal are now a real little tool:
- **Manual color-adjust, edited *in context*** (palette stays on screen, selected swatch lifts in
  the group, dock holds hue/lightness/hex) + real **undo** (button + ⌘Z, covers adjusts & removals).
- **Role assignment at the reveal** — assign Background/Title/Subhead/Button; **pinning beats
  Shuffle** (it reshuffles only what isn't pinned); **Shuffle no longer changes the chosen font**.
- **Accessibility-as-teaching, graded not gated** — WCAG-AA floor in the engine (fixed the dark-mode
  failure); the picker **previews the word on your bg** grouped *Reads clearly / Too faint here* with
  plain notes; numbers hide behind "Why?"; a faint pick → "Make it readable" / "Use it anyway".
- **Fixes:** inactive steps no longer intercept clicks (Gather wall was overlaying reveal controls);
  faded secondary text lifted; picker is a fixed-legible panel; instructional copy tightened.
- See [[project_onboarding_genesis]] for the locked design laws.

## ★ Onboarding Type beat — BUILT as "the playground" (2026-06-12, NOT yet committed → this session)
`public/make-inkling.html`. Took **three attempts**; the first two were killed as *selectors, not
play* (the gesture pointed at fixed samples instead of changing the type): the **constellation**
(tap two stars, an ink line draws the pairing) and the **voicer** (drag a giant wordmark to scrub
6 faces). Locked lesson: **type must be a *material you manipulate*, not a menu** — taste surfaces
by shaping, not picking. And Lorin named the flow's grammar: **anchor → pull → play** (images→colors,
colors→accents, **name→letters**); personalization deepens each step (images → colors → **name** →
brand). What shipped: type your name → wordmark becomes "Elijah's inkling.", then **play the letters**
— drag up/down = weight (variable fonts, opens on Fraunces so it's alive immediately), left/right =
letter-spacing, a grip between the lines = leading, **Space** shuffles the face (keeps your sculpt).
Name + face + weight carry into the reveal. Verified desktop + mobile, 0 console errors.
- ⚠ **OPEN (do this next on the Type beat):** the drag is loved but **lacks direction/guidance and
  isn't discoverable** — needs a discoverability + directional-affordance pass.
- Minor: weight is dead on the two single-weight faces (DM Serif, Instrument); offered to swap for
  Playfair/Cormorant (variable) if weight should respond on every style.

## ★ Onboarding REBUILT as the full intro→homepage sequence (2026-06-15, NOT yet committed)
Lorin's redirect: the moodboard is the hero (a *composite* artifact: images + colors + type, always
draggable, and *it* shuffles into the brand); type deserves its own real "what do I like" beat; name
should be an obvious question; kill the transparent-overlay reveal and the cryptic "leads"; the
sequence should resolve *into a homepage* that hosts the living moodboard and invites "make your own."
Full ground-up rebuild of `public/make-inkling.html` (the proven AA-guaranteed color engine reused).
The model she named — **Gather → Narrow → Perfect → Compare** — is the spine. Six beats:
- **0 Name** — one big editorial question ("First. Whose taste are we building with?"); anchors all.
- **1 Gather** — image wall; colors accrue.
- **2 Type** — a **specimen wall of 12 faces**, each rendering "[Name]’s inkling." with its character
  (Editorial/Dramatic/…), a **live global weight slider**, serif/sans/mono filters; tap to collect,
  first = primary (a clear "★ primary", not "leads"). This is "see and choose fonts."
- **3 Moodboard** — the hero. A **composite, always-draggable board**: your images + color chips +
  type cards, **interleaved and shelf-packed into a centered contact sheet** (not banded by kind).
  Drag, bring-to-front, remove (hover ✕ / Backspace), keyboard-operable.
- **4 Brand (perfect & compare)** — a **solid composed plate** (not an overlay): "[Name]’s inkling."
  in your primary type + palette + accent button; **Shuffle** spins new directions, **Compare** keeps
  the last 4 as thumbnails, role chips cycle colors (engine guarantees AA on every pick).
- **5 Home** — the climax: the page **wears the composed brand** (tokens applied globally), a
  brand-dressed homepage with the **living draggable moodboard artifact** in the hero + the 01/02/03
  Gather·Play·Build index + "Make your own brand →." Skip is a fast spine straight to the brand.
- **Verified:** desktop 1440 + mobile 390 across every beat, keyboard (move/remove), drag (board +
  home artifact), shuffle/compare, brand-applies-at-home; **0 console errors.** Reduced-motion safe by
  construction (opacity-only keyframes, visible resting state). Mobile fixes made this pass: type
  specimen card height (grid was squeezing rows → `grid-auto-rows:min-content` + `min-height`); home
  hero/index overlap (`.home` flex-shrink collapse → block scroll container; artifact built in rAF).

## ★ Round 2 (2026-06-15, after Lorin's per-beat review — all built & verified)
Seven beats now: **Name · Gather · Colors · Type · Moodboard · Brand · Home.**
- **Name echoes everywhere** — "What feels like you, Lorin?", "Lorin's colors.", "Find your voice,
  Lorin.", "Lorin's board.", "Lorin's taste, made into a brand."
- **Colors step REINSTATED as its own beat** (she said "the color step is missing"): the full ported
  adjust-in-context tool — every gathered color in a grid, tap to adjust (hue/lightness/hex dock,
  selected swatch lifts), ✕ to remove, real **Undo** (⌘Z). Edits thread through the engine + board
  (keyed by original hex). Mobile: the dock wraps so nothing clips.
- **Type bug fixed (critical):** every specimen looked identical because the `FONTS` family strings
  used double quotes injected into double-quoted `style=""` attrs (broke the attr → all fell back to
  one font). Switched to single quotes; 12 faces now render distinctly. Type beat also centered (no
  more lopsided empty space), 4-up, with a hover "＋ keep" cue so it reads tap-to-collect like Gather.
- **Moodboard is now a real composition tool:** canvas **dot-grid** surface; **all** your colors
  shown (curated to ~14 by dedupe + luminance spread, was capped at 8 — colors were never skipped,
  just truncated); **resize** handle (corner, keeps aspect), **rotate** handle (twist), **reposition
  + layer** (drag + bring-to-front), and **tap-to-reshape** cycling 5 shapes (rounded · circle ·
  square · blob · arch). Shapes/rotation carry into the Home artifact.
- **Brand is immersive** — the whole page wears the composed brand (not just a plate/box); Shuffle
  recolours everything.
- **Home keeps the playground** — a permanent "⤮ Shuffle the look" re-spins the brand live; the
  artifact **faithfully mirrors** the board (uniform scale + center, shapes included).
- Verified desktop 1440 + mobile 390 across all beats; keyboard + drag/resize/rotate/reshape; 0
  console errors.

## ★ Token-system merge (2026-06-15) — adopted from a parallel "theme-system" pass
Folded a semantic-token layer under the experience (kept our gathered-from-images thesis, dropped its
preset-themes/random-surprise model + spec-sheet aesthetic + off-brand Bricolage wordmark):
**derived surfaces** (`--surface-2/3`), **`--on-accent`** + **`--focus`**, **ink-tinted elevation**
(`--shadow-1/2/3`, so shadows read on dark skins) — all set live in `applyBrandGlobal`. Board/artifact
surfaces + item shadows repointed to tokens; brand button label uses `--on-accent`. Added a **contrast
readout** on Brand ("Title 18:1 AAA · Subhead AAA · Accent AA") — the engine's guarantees made visible
("checked, not hoped"), a light return of the deferred a11y-teaching. Reframed Brand roles **react-not-
decide**: "We placed your colors. Tap a role to swap any that feel off." Verified, 0 console errors.

## ★ Round 3 (2026-06-15) — Type restructure + moodboard shape system
- **Type beat rebuilt:** more *varied* faces (added Zilla Slab/Oswald/Syne/Caveat; dropped redundant
  serifs) spanning editorial→slab→grotesque→geometric→condensed→expressive→avant-garde→script→mono;
  and an **editorial bento** (12-col, varied spans, wordmark scales with card size) so it has hierarchy
  and rhythm instead of a flat uniform table.
- **Moodboard shape system upgraded:** per-content shape sets (images/colors get round/blob/arch/
  capsule; **type stays text-safe** so the word never clips — fixes the cut-off); the morph is now
  **animated**; images gain a **reframe handle** (drag to pan the photo inside its shape). Reshape/
  rotate/resize/reposition all confirmed on images. 0 console errors.
- **OPEN — big product question put to Lorin (Image #5–7 + her note):** is the payoff a *brand book*
  (abstract palette/type) or the brand **applied to real final-form artifacts** (logo/web/poster/merch
  mockups) you shuffle + custom-assign colors on — "know it when you see it" in context? Plus: Brand
  page reads overwhelming (too many CTAs); Home should have full moodboard-edit + manual color choice.
  These reshape the Brand/Home back half; awaiting her direction before rebuilding them.

## ★ Round 4 (2026-06-15) — Brand beat rebuilt around APPLIED MOCKUPS (thesis shift)
Lorin's key realization: "know it when you see it" only fires when you see your taste **on real
artifacts**, not on an abstract brand book. She chose payoff = **"both, equal"** (applied mockups +
brand spec). Source = **Inkling templates first** (my call on her "fuzzy"; user-SVG upload is a
phase-2 power feature — the hard part is mapping arbitrary SVG fills→roles). Built: the Brand beat now
shows the brand **applied to a site, poster, logo lockup, and app tile** (all reskin live off the
brand tokens), beside a compact **spec/receipt** (palette · type · wordmark). Controls calmed to one
row — Shuffle (whole direction) + manual role-swap ("see it to choose it") + contrast readout — and a
single forward CTA (killed the competing "Make it real" vs "Make it home"). Fixes the "overwhelming
control panel" note. 0 console errors.

## Real-product architecture decisions (from the web-Claude thread — proposed, agreed)
- **Two surfaces, two jobs.** The *workspace* (gather/colors/type/moodboard/build) is a **neutral
  container** — the user's brand is the colorful thing *inside* it, so styled chrome would compete +
  break legibility. Only the *home page* (and the onboarding, where Inkling is the subject) **wears the
  brand**. This resolves the immersive-vs-neutral tension by surface. NB: the prototype is already
  built this way (neutral beats; only Brand+Home go immersive) — hold the line; don't skin the workspace.
- **The import moment IS the empty canvas.** No modal-then-dump: the user lands in the canvas they'll
  keep working in, and its empty state holds the three sources (Pinterest/upload/URL). First item lands
  and stays. (Continuity: the thing you first touch never teleports.) Real-product first-run pattern.
- **Naming an upload = the first tag.** API images arrive with provenance (auto-credited); uploads need
  one act of authorship — naming — which doubles as the seed of the **taste database** tagging. One
  thread, not two.
- **Adaptive curation beat (the hinge = volume).** Small set (~<20) → lay them all out. Big board
  (60–100 mixed pins) → a **clustering beat** first: "you brought a lot — here are the 2–3 directions
  hiding in it, which pulls you?" This is the SAME "you gathered two directions" idea from the color
  roadmap (independent convergence). My position: it's the signature overwhelm-relief moment, **not
  optional overhead** — build it; the only open number is the threshold (I'd tip ~20). Big boards are
  the CORE case (Pinterest origin; overwhelm is the whole reason Inkling exists).
- Flagged: Pinterest API storage/display/credit terms must be verified when that path is concrete;
  the drag-canvas on touch/small screens is the hardest technical problem — design mobile with desktop.

## NEW product pillars raised this session (not yet built — roadmap)
- **Applied-mockups as the payoff** (built a first version at Brand; the real product should let users
  shuffle/customize their brand on real artifacts — and eventually their own uploaded SVG logos/
  mockups, which needs an SVG fill/stroke→role mapping engine).
- **Tagged "taste database"** (Lorin: "deep value in tagging items to create my own taste database"):
  gathered inspiration becomes a persistent, taggable, queryable personal library — taste as a
  compounding asset reused across projects, not a one-off gather. Real-app feature (data model +
  tagging UI + search); connects to [[project_community_publishing]] and the "your taste → brand"
  thesis. **My take:** strong, and it's the bridge from "made one brand" to "Inkling is where my taste
  lives." Belongs in the real app, not the prototype.
- **Home still owes:** full moodboard-edit (reshape/stretch/rotate) + manual color choice on the
  living artifact (currently drag-only) — queued.

## Design roadmap (from the strategic critique — ranked; agreed unless noted)
1. **Color → brand system (make-or-break).** Move harmony to perceptual space (OKLCH/LAB); handle
   *images that disagree* — if colors cluster into two hue families, surface "you gathered two
   directions" (a Narrow decision, on-thesis) instead of blending to mud; snap chroma/lightness to a
   ramp so palettes read intentional. NB: our engine already derives roles (not equal-chip sorting),
   so this is an upgrade, not a rebuild. **Recommended next deep focus.**
2. **Motion as continuity → one orchestrated climax.** The Brand should *arrive* (gathered pieces
   assemble into the lockup, then controls fade in), not open as a panel. *Pushback:* do the single
   climax (board→lockup) — don't gold-plate object-persistence across every step (high cost, mobile
   risk) for diminishing returns.
3. **React-vs-decide lens** (cheap, started this pass): convert remaining decisions to reactions;
   role assignment is now pre-made + "swap if wrong."
4. **Define the deliverable** ("Make it real"): a one-page brand sheet (palette+hex+roles, the two
   faces, wordmark, moodboard as provenance) + CSS-variable tokens. *Pushback:* MVP = sheet + CSS
   tokens; defer Figma export. Risk is leaving it undefined, not the exact mix.
- Own sessions: mobile drag-canvas behavior; type-pairing constraints (x-height/skeleton allow-list).

## Deferred (port back)
- Full **a11y teaching popover** ("Reads clearly / Too faint", "Why?") — partial return via the readout.
- Bespoke **board→brand / brand→home** morph transitions (see roadmap #2).
- Richer shape set (scalloped/cloud need SVG masks; current 5 are bulletproof border-radius).

## Next move (do this first)
**Wire the sequence in as the real front door** — `public/make-inkling.html` → a real onboarding
route + full-app skin persistence (the composed bg/ink/accent/sub + fonts carry into the live app via
the CSS tokens; the Home "Make your own brand" / "Reset to default" + Skip become the real entry/exit;
they're `alert()`/token-reset placeholders today).
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
