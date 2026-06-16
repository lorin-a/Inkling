# Inkling — status (live)

**Read this first.** Current state + the plan. The *why* lives in memory
(`project_product_direction`, `project_onboarding_genesis`); the journey lives in git. Keep this short.

## Right now
- **Branch `v2`** (`main` = frozen OG standalone). **Track A — in a focused edit pass** (Lorin walked the whole flow 2026-06-15 PM and gave a detailed review; NOT demo-ready yet). Work the EDIT QUEUE below next session. Not pushed.

## EDIT QUEUE — from Lorin's full walk-through (2026-06-15, do next session)
Grouped by page. Voice rule throughout: **direct + practical, scrub AI fluff** (no "gave you," "ring true," poetic CTAs).

**Opening frame / doors**
- [ ] Doors **don't read as doors** — redesign so they're unmistakably doors (frame, hinge, handle, proportion). "You can make these better."
- [ ] Door opens **inward → should open OUTWARD** (toward the viewer). Keep the open animation (she loves it), flip the hinge direction.
- [ ] Gold spine dot color is **too yellow** — she wants **#C2AE73** (greener). Update the muted dot set accordingly.

**Gather**
- [ ] Copy: "images that ring true" is **too poetic** → "images you're drawn to" / "that fit your taste." Direct.

**Colors**
- [ ] Coach should say **only**: you can delete colors, and add more with the magnifier. Trim the rest.
- [ ] The **＋ icon doesn't read as an eyedropper** → use a real eyedropper icon/cursor affordance.
- [ ] Remove the sub **"Each image and the colors it gave you."** — AI fluff. Replace with a direct line; scrub similar phrasing site-wide.

**Type**
- [ ] **Center** the specimen card content (currently left-aligned), especially once filtering narrows the grid.

**Moodboard**
- [ ] **Tap image to change shape** — restore/ensure for image pieces.
- [ ] **Z-order control** — bring an item to front / send to back.
- [ ] **Rotate icon is wrong** (⟳ reads as repeat/undo) → use a real rotate glyph (curved/arched arrows, ↻-style).
- [ ] **Custom color add** (hex/picker) + **edit colors in place** on the board (tap a tile → adjust the shade — she may want slightly different shades in context).

**Brand (paint)**
- [ ] **Cramped up top, empty below** — use the space; rebalance.
- [ ] Copy: **"Drop" → "Drag"** in the instruction.
- [ ] **Light vs dark choice** at this stage (she knows her preference by now).
- [ ] **Lock features for shuffle** — pin e.g. a background color, shuffle the rest (bring back role-pinning).
- [ ] **Edit colors manually in place** here too (she may dislike the set once seen together).
- [ ] **Star / save a SET** so she can keep playing without losing a favorite; then shuffle just saved sets for the final decision.
- [ ] **"Make it home" CTA** is poetic/AI → practical wording.
- [ ] **Reconsider the ultraviolet (Inkling purple) accent** — she's no longer sure she likes it. Open brand question.

**Home / end-state — BIG RETHINK**
- [ ] The bento Home **reads as a repeated step, not a landing page** — colorful bg makes the moodboard look weird; **no resonance**. The earlier full-screen hero versions had it.
- [ ] Likely **merge Brand + Home** (the bento step feels redundant with Brand).
- [ ] **Fully rethink where the user lands** after designing their own — it must feel like a real, resonant landing page / home, not a flow step.
- Run: `npm run dev` → `localhost:3000`. The onboarding prototype is `public/make-inkling.html`.
- Dogfood signed-out (localStorage); Playwright runs in a separate browser, not yours.

## Page-by-page self-audit (done 2026-06-15)
Ran Lorin's checklist (grid · color · accessible sizes · hierarchy · balance · clarity · nothing extra/over-complex · +10%) on every page.
Opening frame → literal doors + story-beat animation. Name → balanced one-line question. Gather → passed. Colors → centered swatch rows.
Type / Moodboard / Brand / Home → passed (already reworked); poster tagline aligned to "know it when you see it." All console-clean.

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
**Work the EDIT QUEUE near the top** (Lorin's full walk-through, 2026-06-15). Suggested order: quick
copy/icon/color fixes first (gather "drawn to," colors fluff + eyedropper icon, gold→#C2AE73, Drop→Drag,
type centered, rotate icon), then the doors (read-as-doors + open outward), then the meatier ones
(in-place color editing, lock/star-a-set for shuffle), and **last the big one: rethink the end-state /
Home as a real resonant landing page (likely merging Brand + Home).** The Master to-do below is the
prior polish pass (mostly shipped); Track B (color engine) still waits.

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
