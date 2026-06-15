# Inkling — status (live)

**Read this first.** Current state + the plan. The *why* lives in memory
(`project_product_direction`, `project_onboarding_genesis`); the journey lives in git. Keep this short.

## Right now
- **Branch `v2`** (`main` = frozen OG standalone). **Track A re-opened for a polish pass** (Lorin is dogfooding hard and redirecting live). It is NOT frozen. Track B waits until the prototype feels right. Not pushed.
- Run: `npm run dev` → `localhost:3000`. The onboarding prototype is `public/make-inkling.html`.
- Dogfood signed-out (localStorage); Playwright runs in a separate browser, not yours.

## Master to-do — Track A polish (active; I choose the order)
Compiled from Lorin's dogfeeding (2026-06-15). Cross-cutting first (they lift every screen), then per-beat, then features.

**Cross-cutting (do first — highest leverage):**
- [x] **A. Legibility / contrast (accessibility, inviolable).** DONE — darkened `--sub/--muted/--faint`; stopped washing the page with the pale stencil (brand now scoped to the artifacts), so all chrome text is AA.
- [~] **B. Spacing / breathing.** PASS 1 done — roomier top bar + `.head` rhythm + Type bar. Revisit Brand/Home density next.
- [x] **C. Guidance / affordances.** DONE — a per-surface coach bubble appears once per beat (anchored to the thing to do), a "?" in the top bar recalls it, and a drag-nudge pulse telegraphs that pieces move. Dismiss on first interaction or "Got it."

**Per-beat:**
- [x] **D. Intro spine SVG** — REDRAWN as one clean *connected* authored line (bulb → wave through the dots → loop+arrow); was 3 stitched vectors that looked broken. Colors harmonized (numbers match their muted dots; only the logo dot stays ultraviolet), hierarchy rebalanced, blurb/label sizes bumped for accessibility, tagline → "know it when you see it." (J: still swappable for Lorin's own hand-drawn SVG if she wants.)
- [x] **E. Type beat** — Light/Dark toggle now labeled "Preview ☀/☾" and obvious; spacing fixed.
- [x] **F. Brand / paint** — stencil readable + page calm + the paint coach now explains "drop a color into a slot" (drag-to-slot guidance via C). Could still let the layout breathe more.
- [x] **G. Home bento** — calmed: page chrome stays newsprint, brand scoped to the bento tiles (no more full-page wash).

**Feature builds (after the polish foundation):**
- [x] **H. Dropper layout** — DONE — bigger image in the Colors step + a magnifier loupe (follows the cursor, shows the zoomed pixel + live hex) so picking is precise.
- [x] **I. Moodboard enrichment** — DONE. "＋ Color" (add any gathered color, incl. dropped/missing, counts back into the brand), recolor type pieces in place (a swatch handle cycles the wordmark through the palette), and "＋ Note" (draggable, editable Caveat note cards — the "more than color/type/image"). Shapes were redundant with color tiles, so notes cover the gap.
- [ ] **J. Hand-drawn SVGs** — wire in Lorin's own drawings when she provides them.
- [x] **K. Crop** in the moodboard — DONE (prototype): the ✛ reframe handle pans, scroll zooms (1–3×), clipped to the frame = pan + zoom crop. (A dedicated crop-box UI is the real-site version for Track B.)
- [x] **L. Name-echo rebalance** — DONE — name now only in two warm spots (the Gather hello + Home); Board/Colors/Type are instructional.

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
**Work the Master to-do above, cross-cutting first** (A legibility → B spacing → C guidance), then the
per-beat fixes, then features. Track B (color engine, below) waits until the prototype polish lands.

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
