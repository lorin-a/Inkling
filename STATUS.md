# Inkling — status (live)

**Read this first.** Current state + the plan. The *why* lives in memory
(`project_product_direction`, `project_onboarding_genesis`); the journey lives in git. Keep this short.

## Right now
- **Branch `v2`** (`main` = frozen OG standalone). **Track A is FROZEN** — the prototype is finished and is the reference; stop adding product features to it. Next work is Track B. Tree clean, **not pushed**.
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

**Track A — the prototype (`public/make-inkling.html`). FROZEN — the reference.** Job: *prove the
experience + thesis*, Inkling as the subject. Don't add real-product features here; build those in
Track B. The full flow: **Opening frame** (load → the Gather·Play·Build spine as the felt explanation
→ two doors: "Co-design Inkling" guided · "Drop into my own canvas" straight to the living canvas) →
Name → Gather → Colors → Type → Moodboard → **Brand** (the board *assembles* into the lockup, then
controls fade in — the one arrival) → Home (brand-dressed, living artifact with full edit + manual
color roles + permanent shuffle). Verified desktop + mobile, keyboard (tab order, Enter, focus, the
intro holds `inert` over the flow), reduced-motion (content stays visible, climax goes instant), 0
console errors.

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
**Open Track B with the color engine** (Track B #1) — Track A is frozen. Build OKLCH harmony +
hue-cluster detection → "you gathered two directions" + ramp snapping. It's the make-or-break
foundation and also powers the curation beat. See `project_smart_color_engine`,
`project_color_theory_research` (Sanzo Wada dataset ready). Build it in the real Next.js app (`app/`),
not the frozen prototype.

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
