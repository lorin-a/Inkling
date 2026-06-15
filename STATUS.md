# Inkling — status (live)

**Read this first.** Current state + the plan. The *why* lives in memory
(`project_product_direction`, `project_onboarding_genesis`); the journey lives in git. Keep this short.

## Right now
- **Branch `v2`** (`main` = frozen OG standalone). Last commit `855b860`: the onboarding prototype rebuild. Tree clean, **not pushed**.
- Run: `npm run dev` → `localhost:3000`. The onboarding prototype is `public/make-inkling.html`.
- Dogfood signed-out (localStorage); Playwright runs in a separate browser, not yours.

## What it is
**Inkling — the intuitive's creative home base.** One place that replaces the 5 apps + 10 tabs a visual
person scatters inspiration across. For people who *know it when they see it* and play their way to
clarity. The spine (product = onboarding = story): idea → feeling → seek → **gather → play → make
tangible → collaborate & refine** → A-to-Z. Wedge: synthesis from *your* taste, you stay the author.
Brand: `inkling.`, newsprint + warm ink, ultraviolet+tangerine spark (surgical), Fraunces + mono,
editorial rigor. Locked decisions + brand → memory.

## The plan: two tracks (don't blur them)

**Track A — the prototype (`public/make-inkling.html`).** Job: *prove the experience + thesis*, Inkling
as the subject. Finish to a demo bar, then **FREEZE** as the reference. Stop adding real-product
features to it. Currently a working 7-beat flow: Name → Gather → Colors → Type → Moodboard → Brand
(applied to live mockups + spec) → Home (brand-dressed, living moodboard + permanent shuffle).
Verified desktop + mobile, keyboard, 0 console errors.

Remaining to finish + freeze:
1. **Opening frame** (the capstone — currently opens cold at Name): Inkling load animation → the
   creative-process spine *as* the felt explanation (show the arc, don't write a paragraph) → a
   two-door choice ("co-design Inkling to learn" · "drop into my own canvas").
2. **Home parity:** full moodboard-edit (reshape/stretch/rotate) + manual color choice on the living
   artifact (it's drag-only today).
3. **One motion climax:** the board *assembles* into the brand lockup (then controls fade in). The
   single "arrival" moment, not motion sprinkled everywhere.
4. **One QA + design-review sweep** (reduced-motion, keyboard, mobile) → freeze.

**Track B — the real Next.js product.** Where the durable architecture is built, in dependency order:
1. **Color engine** (make-or-break): OKLCH harmony + hue-cluster detection → "you gathered two
   directions" + ramp snapping. Foundation; also powers the curation beat. (See `project_smart_color_engine`, `project_color_theory_research` — Sanzo Wada dataset ready.)
2. **Neutral workspace + empty-canvas import** (3 sources as the empty state; first item lands & stays)
   + **adaptive curation beat** (lay out under ~20; cluster-first over ~20).
3. **Taste database** — persistent, taggable, queryable library; naming an upload = the first tag.
4. **Applied output** — mockup templates in-product → user-SVG reskin engine (hardest, last) → export
   (one-page brand sheet + CSS-variable tokens).
5. **Collaboration & refinement endgame** — show → invite → vote → try-on. The arc's end; likely the
   retention moat. (Connects to `project_community_publishing`.)

## Next move (do this first)
**Build the prototype's opening frame** (Track A #1): the Inkling load animation + the creative-process
spine as the felt explanation + the two-door choice. It's what makes a viewer go *"oh, I see — this is
my creative home base"* before they start (that realization is the onboarding's success metric). Then
Home parity → motion climax → sweep → freeze. Then open Track B with the color engine.

## Locked decisions (→ memory for the why)
- **Two surfaces:** workspace = neutral container (your brand is the color inside it); home/onboarding
  = wears the brand. Don't skin the workspace.
- **Payoff = applied to real artifacts** AND a brand-spec receipt ("both, equal"); templates first,
  user-SVG upload is Track-B phase 2.
- **No silent narrowing; recognition over articulation; cultivate intuition, don't supply it** (the
  north-stars in `project_product_direction`).

## Pre-launch must (legal/ethics)
**`RIGHTS.md` Phase 0** before any public launch: delete `lib/pinterestSourceFetcher.js` + stop the
bookmarklet auto-scroll. Reference-don't-replicate; gate publishing to owned/licensed; Pexels then
Unsplash. Read `RIGHTS.md` before touching import.

## Docs map
- **Why / decisions** → `memory/` (`project_product_direction` first).
- **This file** → live state + plan.
- `RIGHTS.md` (sourcing/rights), `FLOW_AUDIT.md` (per-surface keep/cut), `PITCH.md` (claim + diagram).
- Prototype: `public/make-inkling.html`. Real app: `app/` (first-run, `/import`, landing, grid
  foundation already built — the Track-B starting point).
