# Inkling — status (live)

**Read this first.** Current state + the plan. The *why* lives in memory
(`project_product_direction`, `project_onboarding_genesis`); the journey lives in git. Keep this short.

## Right now
- **Branch `v2`** (`main` = frozen OG standalone). **Track A prototype** (`public/make-inkling.html`). Lorin's full walk-through EDIT QUEUE is **shipped — incl. the big Home rethink.** Verified desktop / 1366 / mobile, keyboard, reduced-motion-safe, 0 console errors. **Not pushed.**
- Run: `npm run dev` → `localhost:3000` → `/make-inkling.html`. Dogfood signed-out (localStorage); Playwright runs in a separate browser, not hers. **Test gotcha:** clicking a door fires a *delayed* `show(BEAT.name)` ~640ms later — scripted nav must wait or it clobbers your steps.

## Shipped this session (2026-06-15 — the walk-through edit queue)
- **Quick wins:** Gather "drawn to" copy; Colors de-fluffed + a real **eyedropper icon + cursor** (was a "+"); gold spine dot → **#C2AE73**; Brand "Drop"→"Drag"; **Type specimens centered**; **rotate glyph** fixed (clean single-arc, was the repeat-looking ⟳).
- **Doors → cute Victorian.** Arched, recessed beveled panel + brass hinges/knob, painted in the dot colors (dusty-rose "Co-design" + powder-blue "Wander in", not black/white); **both hinge left / open right / swing outward** toward the viewer; door text stays AA.
- **In-place color editing everywhere** — one reusable floating editor (hex + hue/lightness), opened from a pencil handle on board color tiles (or `e`) and by tapping a filled Brand slot; live, AA still enforced. Plus **custom hex/picker color add** on the board (flows into the brand pool).
- **Lock + save-a-set for shuffle** — 🔒 pin a role (held through shuffle), ★ save a SET, ⤮ shuffle only saved sets.
- **BIG — Brand + Home merged into the "paint the home to life" finale (Option C).** One surface, three states: newsprint **stencil → painted → settled.** You paint the real home in (4 role slots, or "Fill it for me"); once painted the surface comes alive and the paint UI **demotes** to a slim studio dock; it ends as a centered editorial landing (hero · full-width moodboard band · applied artifacts · spec receipt · Gather·Play·Build index). Bento home deleted; `brand` is now the last beat (progress dot renamed "Home"). Fixed two wide-screen bugs Lorin caught: section collapse/overlap (`flex:0 0 auto`) and the moodboard letterbox (band sized to the board's own aspect).

## Still open (small)
- **Reconsider the ultraviolet "Inkling purple" accent** — Lorin no longer sure (open brand question).
- Finale polish (optional): the moodboard band carries some vertical air (the board itself is short/wide); the stencil hero is *intentionally* ghosted (could lift legibility); the onboarding top bar stays above the branded landing (could hide on the finale for full immersion).
- Moodboard **send-to-back** (explicit z-order) not added — tap/drag brings-to-front only.
- **Hand-drawn SVGs** — swap Lorin's own drawings into the intro spine (bulb/loop) when she provides them.

## Next move (do this first)
**Lorin walks the new end-to-end flow on her screen** (doors → Name → Gather → Colors → Type → Moodboard → the painted-home finale) and reacts. Then either: polish the finale (band air / stencil intensity / immersion), settle the **ultraviolet accent** question, or pivot to **Track B** (the color engine — see `project_smart_color_engine`, `project_color_theory_research`).

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
Track B. The full flow: **Opening frame** (load → the Gather·Play·Build spine as the felt explanation
→ two Victorian doors: "Co-design Inkling" guided · "Wander in on your own" straight to the living
canvas) → Name → Gather → Colors → Type → Moodboard → **the painted-home finale** (the board
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
