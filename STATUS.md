# Inkling — status (live)

**Read this first.** Current state + the plan. The *why* lives in memory
(`project_product_direction`, `project_onboarding_genesis`); the journey lives in git. Keep this short.

## Open notes ledger

Every note Lorin gives, in her words, with status. Nothing closes silently.

| # | Note (her words) | Status |
|---|---|---|
| 1 | "I was trying to design a product but what I need is a tool. I have a real usecase RIGHT now that I need it for and I think we should design for THAT and see if what we make also works as a general template for a product." | **Open — 2026-08-21.** Reframe accepted; see "The reframe" below. |
| 2 | "I have a pinterest board made for my project but I have not yet defined in language what matters to me about the brand." | Open — words/values/mission are the missing first-class surface. |
| 3 | "I want a collaborative space where I can moodboard from my existing pinterest board." | Open — import + canvas exist; *collaborative* does not (`projects` is single-owner). |
| 4 | "I want to be able to customize my brainstorming space." | Open — argues for one canvas over fixed routes. |
| 5 | "start putting in words, brand values and principles, mission statement" | Open. |
| 6 | "I would extract colors from my pins." | Mostly built (per-pin palette extraction, `/colors`) — verify on her real board. |
| 7 | "drag and sort and compile/curate my pins into affinity groups related to what I like about them" | Mostly built (moodboard sections + reflective note) — verify. |
| 8 | "It would still be great to explore different fonts." | Mostly built (`/type`, Google/Fontshare/upload, pairings). |
| 9 | "The logo is important to me" | Open — marks exist in the prototype; no logo workspace in the real app. |
| 10 | "the design system is important to me as in the type faces, sizes, use cases, etc." | Open — `/brand` + export is brand-toy level, not a spec. |
| 11 | "my remote collaborator who may also want to bring things into the mix" | Open — no members model, no invite, no presence. |

## The reframe (2026-08-21) — tool first, for one real project

Track A (the `make-inkling.html` prototype + the ink-pour opening) is **parked**, not deleted. The
live work is making the **real Next.js app in `app/`** usable end-to-end for Lorin's own brand
project, with one remote collaborator. The product question gets answered by whether the tool
generalizes — not by designing the product first.

## Right now
- **Branch `v2`** (`main` = frozen OG standalone). **Not pushed.** Track A prototype = `public/make-inkling.html` (the full flow, demo-ready — **unchanged this session**).
- **The OPENING is being redesigned** in `public/opening-*.html` — current best = **`public/opening-draft.html`** (the "pour the ink" annotated draft). `opening-core.js` + `public/marks/` hold shared data. Direction is **locked** (see `project_onboarding_genesis`); **not yet integrated into `make-inkling.html`.**
- Run: `npm run dev` → `localhost:3000` → `/opening-draft.html` (new opening) or `/make-inkling.html` (full flow). Playwright runs in a separate browser; headless forces `prefers-reduced-motion`, so the ink-pour ripple reads best in a real browser.

## Shipped this session (2026-06-16 — opening redesign explorations)
- Explored the make-Inkling **opening** as an immersive **studio, not a centered landing page** (she rejected the centered AI-app column, the 3D doors, and a meek "play with it" reveal). Committed the full journey (`public/opening-*.html`): the concept A/B/C sets, the touchable color-in `opening-live`, the asymmetric `opening-canvas`, the schematic trio (`-a-blueprint` / `-b-cursor` / `-c-assembly`).
- **Landed direction = `opening-draft.html`:** an **annotated working-draft** where the verbs live ON the artifact. Hero = a real **liquid INK pour** — the SVG wordmark floods from the floor up behind a rippling waterline (the `g`'s descender fills first). Drag the letters ↕ = weight, tap = voice, tap the dot = mark; the panels demote to thin **live read-outs** wired by **orthogonal** (right-angle) leaders; grid/baseline/registration + surface options (dots/grid/grain/blank).
- **10 Figma-curated marks** pulled to `public/marks/m01–10.svg` (normalized to one optical size, `currentColor`-recolorable). EPS→SVG toolchain (`ghostscript` + `pdf2svg`) installed via brew.
- (Prior **2026-06-15** walk-through edit queue + the Brand/Home "paint the home to life" merge — done, in git.)

## Still open
- **Polish the ink-pour opening to the groundbreaking-2026 WOW bar** (ink-like waterline / meniscus, drag-weight feel, the cursor-as-director that always names the next move) — then **integrate it into `make-inkling.html`** and carry the *manipulate-the-artifact* language into the rest of the flow.
- **Accent:** ultraviolet → leaning a single quiet **ink-violet `#4b3f73`** (chrome quiet; the user's gathered color is the only saturated thing). Confirm.
- Moodboard **send-to-back** (explicit z-order) still not added — brings-to-front only.
- **Hand-drawn SVGs** — swap Lorin's own drawings in when provided (the new opening may not reuse the old spine).

## Next move (do this first)
**Open `localhost:3000/opening-draft.html` and push the "pour the ink" annotated draft to the bar** — polish the ink physics + the direct-manipulation feel, refine the cursor-as-director. Then carry the *manipulate-the-artifact* language into the rest of the flow (Gather → Colors → Type → Moodboard → finale) and fold the opening into `make-inkling.html`. (Track B color engine still queued — `project_smart_color_engine`, `project_color_theory_research`.)

## What it is
**Inkling — the intuitive's creative home base.** One place that replaces the 5 apps + 10 tabs a visual
person scatters inspiration across. For people who *know it when they see it* and play their way to
clarity. The spine (product = onboarding = story): idea → feeling → seek → **gather → play → make
tangible → collaborate & refine** → A-to-Z. Wedge: synthesis from *your* taste, you stay the author.
Brand: `inkling.`, newsprint + warm ink, ultraviolet+tangerine spark (surgical), Fraunces + mono,
editorial rigor. Locked decisions + brand → memory.

## The plan: two tracks (don't blur them)

**Track A — the prototype (`public/make-inkling.html`). The reference.** Job: *prove the
experience + thesis*, Inkling as the subject. Don't add real-product features here; build those in
Track B. The full flow: **Opening frame** (being redesigned — see "Right now" + `project_onboarding_genesis`;
two entries: "Co-design Inkling" guided · "Start fresh / wander in" straight to the living canvas)
→ Name → Gather → Colors → Type → Moodboard → **the painted-home finale** (the board
*assembles* in — the one arrival — then you paint the home to life and it settles into the landing;
Brand + Home merged). Verified desktop + mobile, keyboard (tab order, Enter, focus, the intro holds
`inert` over the flow), reduced-motion (content stays visible, climax goes instant), 0 console errors.

**Track B — the real Next.js product.** Where the durable architecture is built, in dependency order:
1. **Color engine** (make-or-break): OKLCH harmony + hue-cluster detection → "you gathered two
   directions" + ramp snapping. Foundation; also powers the curation beat. (See `project_smart_color_engine`, `project_color_theory_research` — Sanzo Wada dataset ready.) **Output contract** (from the Untitled UI teardown, in `project_color_theory_research` §G): snap each role's OKLCH ramp to the 12-step `25→950` shape, pull neutrals from the brand hue, and emit a *two-layer* token set (primitive + semantic aliases like `text-primary` / `bg-brand-solid`) with a per-step contrast verdict — not a flat hex list.
2. **Neutral workspace + empty-canvas import** (3 sources as the empty state; first item lands & stays)
   + **adaptive curation beat** (lay out under ~20; cluster-first over ~20).
3. **Taste database** — persistent, taggable, queryable library; naming an upload = the first tag.
4. **Applied output** — mockup templates in-product → user-SVG reskin engine (hardest, last) → export
   (one-page brand sheet + CSS-variable tokens).
5. **Collaboration & refinement endgame** — show → invite → vote → try-on. The arc's end; likely the
   retention moat. (Connects to `project_community_publishing`.)

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
