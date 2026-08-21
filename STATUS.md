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
| 12 | "I think what we have built is already too overly complicated. I want to brainstorm how to radically simplify this process" | **Open — 2026-08-21.** Accepted; see "The sort" below. |
| 13 | "in my next meeting I can do a live session with my creative partner" — "the whole upload, canvas, etc needs to be SO simple" | Open — this is the deadline and the scope test. Upload leaves the session entirely (pre-load before the meeting). |
| 14 | "still designing for people who have an 'inkling' of what they want but need structure to get closer to a deliverable brand identity" | Open — audience unchanged. |
| 15 | "im not sure what final outcome would be best" | Open — my call: a one-page **taste spec** (a brief), not a brand guide. Awaiting her verdict. |
| 16 | "the main function is moving from inkling to something more solid through the process but the process is what needs attention the 'how' of getting from inkling to structured taste" | Open — the "how" = **sort, then name**. Sorting produces the language. |
| 17 | "should me and my collaborator upload to the same pinterest board or should there be the option to upload multiple?" | **Answered — multiple, merged into one pool, every item stamped with who brought it.** Attribution is the feature; a shared Pinterest board destroys it. |
| 18 | "My concern about what is build is that it is too many features, overdesigned, and overly complicated." | Open — real diagnosis: not feature *count*, but **six destinations with six interaction models**. Fix = one surface, one grammar. |
| 19 | "People love figma because it is like a white board with organic movement. Designers use whiteboards, Miro and Figjam are built to mirror the ideation process." | **Corrects my "cut the canvas" call.** Canvas is the substrate; forced-choice moments layer on top of it as activities. |
| 20 | "Figma has no pinterest import free option and I want this to be the difference" | Open — the wedge. Keeps collaboration inside Inkling, not inside Pinterest. |
| 21 | "I also want this to follow and learn from explicit design tool processes like affinity mapping and generative research questions, and prototyping etc." | Open — the activity library. |
| 22 | "I like being able to identify No or vote to sort by intuition. I think centering on intuition is still my core but it needs the support of a design system." | Open — the NOs become a first-class output, not discarded state. |
| 23 | "I personally cannot explore font without the color, imagery combined it is a unified system." | **Structural.** The atom of comparison is the **system tile** (type + color + image together), not the ingredient. Collapses `/type` and `/colors`. |
| 24 | "It can be fun to give your brand a persona that could be a fun 'activity' or feature for example generative. Those questions could be really fun too. Things like that to help you reveal your values." | Open — generative/projective questions as an activity; output = voice. |
| 25 | "Many people also get to a point where there are 5-10 options they need to compare so the shuffling and side by side and voting is also important." | Open — the head-to-head activity, run on system tiles. |
| 26 | "other tools out there have design system making capabilities we just need to know what to bring to that step or to a graphic designer" | **Scope cut.** Inkling does NOT generate the design system. It produces the brief that a designer or a system tool consumes. |
| 27 | "The current pinterest board has more than 50 less than 100." | Answered — that size earns the gut pass. |
| 28 | "don't build yet keep working out the SYSTEM and the features and the function" | Open — no code until the system is settled. |
| 29 | "when I work in figma, I make boards and within those boards I house activities, collections, notes, thoughts, etc. maybe that can inform how this happens?" | **Answered — the spatial model.** One studio canvas; **boards** are framed regions on it. Zoom out = the whole journey. |
| 30 | "It is good to be able to witness the progression, to go back and look at things, etc." | Answered — boards persist; carrying forward never empties the board behind you. |
| 31 | "I like the idea of manually taking things from one stage to the next, the act of dragging them can feel embodied." | **Load-bearing.** Nothing is ever auto-promoted. Drag = **carry a linked copy**; the gesture IS the data model. |
| 32 | "I suppose you could choose activities based on where you are in the process and they appear on the board?" | Answered — **a board is born from an activity.** Offered in stage order, never enforced; "Blank" always present. |
| 33 | "taste spec in but exportable in a format" | Answered — the spec is a live board that is also an export: a print one-pager (`app/print` + puppeteer already there) and a JSON + CSS-custom-properties bundle. |
| 34 | "I like in figma that we see the others' mouse, they can do all the same things as us (add, move, type, etc.) multiple users as equals" | **Accepted, with the cost named.** Real co-editing, not async. Presence is cheap; document sync is the expensive part and is required the moment two people share a board regardless. |
| 35 | "It is impressive to see colors extracted from the pins. It might be nice to witness that process." | Open — truthful ornament (real work, made visible), plus the **aggregate moment**: what you actually keep reaching for. |
| 36 | "What else might a user come prepared with beside inspo? They might have fonts and colors they already like, the might have textures or photos" | **Answered — one drop, two temperatures.** Intake stops being typed by source; everything becomes a card. The one real distinction is *material* vs *committed*. |
| 37 | "what do you mean by tile?" | **Answered — dropping the word.** Everything is a **card**; a **direction card** is a composed card holding color + type + image together (`components/DirectionCard.js` already exists). |
| 38 | "I like the idea of cards you carry from activities." | Confirmed — cards are the single grammar. |
| 39 | "Maybe some kind of status setting per aspect, like locking a particular color or font etc sometimes carrying something you know works forward and locking other things as you go?" | **Load-bearing — this is the missing mechanic.** Lock = the inkling→structure state change. It constrains the generator, fills the spec, and measures progress. |
| 40 | "idk we could think of more features like that as we play test" | Open — noted the playtest threshold: the smallest playable thing, not the full system. |

## The reframe (2026-08-21) — tool first, for one real project

Track A (the `make-inkling.html` prototype + the ink-pour opening) is **parked**, not deleted. The
live work is making the **real Next.js app in `app/`** usable end-to-end for Lorin's own brand
project, with one remote collaborator. The product question gets answered by whether the tool
generalizes — not by designing the product first.

## Cards and locking (2026-08-21) — the mechanic that makes it a process

### One grammar: everything is a card

"Tile" is retired — it was a second word for the same thing. **Every object on every board is a card.**
Kinds: *reference* (image) · *swatch* · *type specimen* · *word* (value / voice line / name) ·
*texture* · *mark* · and the composed one, the **direction card** — color set + type pairing +
reference image held together, because type cannot be judged without color and imagery (note 23).
`components/DirectionCard.js` and `BrandShuffle.js` already are this. Head-to-head runs on direction
cards; everything else is an ingredient card you carry.

### Locking is the inkling → structure state change

Cards start **liquid** and you **lock** them one at a time. A lock is not a badge. It does three jobs:

1. **It constrains the generator.** Lock a color and every direction card afterwards keeps that color
   and varies only what is still liquid. This is how 5–10 options actually converge instead of
   reshuffling forever — each lock shrinks the search space.
2. **It writes the spec.** The taste-spec board is simply *everything locked so far.* The brief fills
   in as you commit, so you can always see the inkling becoming solid. No generation pass.
3. **It measures the process.** "Locked 3 of 6 aspects" is the honest progress reading, and the six
   aspects are the spec's own sections: color · type · imagery · voice/words · mark · texture.

Rules: the tool **never locks anything itself**; a lock is always reversible; and **locking shows what
just fell out of contention** ("this removed 4 type pairings from play") so narrowing is never silent.

### Intake: one drop, two temperatures

People arrive with more than inspiration — fonts they already love, a hex, an old logo, textures,
their own photos, a name or tagline, brands they admire, a paint chip, a book cover. So the four-tab
source picker in `/import` is the wrong shape. **One drop target; the tool identifies what it got and
makes it a card.** The only distinction worth keeping is temperature:

- **Material** — "I like this." Enters liquid, gets sorted and argued with.
- **Committed** — "I'm already using this." Enters **pre-locked**, and constrains everything from the
  first direction card onward.

That single toggle replaces a taxonomy, and it is why a rebrand and a from-scratch brand are the same
flow at different starting temperatures.

### Witnessing extraction

Palette extraction is real background work (`kickPaletteExtraction`), so showing it is truthful
ornament, not theatre: as each reference lands, its colors **lift off the image** and settle into a
strip beneath it. Then the payoff worth designing for — the **aggregate moment**: when the pool
finishes, every extracted color pools into one spectrum and you see *what you keep reaching for*
across 50–100 references. Structured taste surfacing from intuition with the tool naming nothing.
Honours `prefers-reduced-motion` (colors present instantly, no lift).

## The spatial model (2026-08-21) — studio, boards, carrying

**One studio canvas. Boards are framed regions on it, not separate pages.** Zoom out and you see the
whole journey laid end to end; zoom in and you are working. New boards default to the right of the
last one so the default reading is a timeline — a default order, never an enforced one. This is the
"witness the progression / go back and look at things" requirement, and it beats Figma pages here
because the arc is visible in a single view.

### Carrying — the gesture is the data model

**Nothing is ever auto-promoted.** The tool never analyses your board and advances things for you. You
carry material forward by hand, board to board, and that drag is the whole commitment mechanic.

- A carry creates a **linked copy**. The original stays on the source board (marked as carried), so
  the board behind you remains a record of the stage, not a record of loss.
- The link is **provenance**. Because the spec is assembled from carries, every claim in it can show
  its work — this value ← these six references ← these pins. "Synthesis from *your* taste, you stay
  the author" stops being a slogan and becomes a mechanism.
- What you did **not** carry stays visibly behind. The No pile is a place, not a deletion.

### Activities: a board is born from an activity

New board → *Gut pass · Affinity map · Questions · Head to head · Try it on · **Blank***. The board
takes the shape of what you chose. Activities are **offered in the order of where you are** in the
process, but every one is always available and Blank is always present (rule 2: offered, never
imposed). An activity fills its board and then relaxes into it — the results stay exactly where they
landed and the scaffolding dissolves. You never leave the room.

### The taste spec

A board like any other, that is also an export. Two formats: a **print one-pager** for a human or a
graphic designer (`app/print` + `puppeteer-core` + `@sparticuz/chromium` already in the repo,
`app/api/brand/export` is the seam), and a **JSON + CSS custom properties** bundle for a
system-making tool. No Figma plugin.

### Multiplayer — accepted, with the cost stated plainly

Requirement: live cursors, everyone equal, everyone can add / move / type. Two separable pieces:

- **Presence** (cursors, who is here, selection halos) is ephemeral broadcast. Cheap.
- **Document sync** is the expensive part — and it is **required anyway** the moment two people share
  a board. Today `moodboards` saves by whole-document `PUT` of a JSONB blob: last write wins, so two
  people editing silently destroy each other's work. Migration 008 already anticipated this
  ("object-per-block granularity is a later (Liveblocks) concern this shape already maps onto").

Recommendation: **Liveblocks** (presence + conflict-free storage + threads, generous free tier) over
self-hosted Yjs, even though Vercel Functions now support WebSockets — the goal is not to own this
infrastructure. Cost: a vendor dependency, and the block model must be remodeled from one JSONB blob
to per-object granularity.

**Sequencing warning:** real multiplayer is the largest single item in this system and it is not a
"before the next meeting" build. For a first live session, one shared screen costs nothing. Building
multiplayer first delays every activity.

## The system (2026-08-21) — one canvas, many activities

**The diagnosis of "overdesigned" is not feature count.** Figma is enormous and feels simple because
it is one surface with one interaction grammar: everything is an object, everything moves and selects
the same way, complexity is additive rather than modal. What is built here is *six destinations with
six interaction models* (`/import`, `/library`, `/moodboard`, `/colors`, `/type`, `/brand`, plus
spikes). That is the thing to kill. **One surface, one grammar, many verbs.**

**Correction to the previous entry:** cutting the canvas was wrong. The canvas is the substrate — the
whiteboard with organic movement that designers already trust. What pure freeform lacks is a forcing
function, because Figma's users arrive already knowing and Inkling's users do not. So:

> **The canvas is the room. Activities are the exercises you run in it.**

An activity = a prompt + a constrained interaction + an **output that lands on the canvas as objects**
and flows into the taste spec. When it ends, the canvas is free again. This is FigJam's model
(stickies, voting, timers, templates) pointed at brand definition.

### The structural move: the atom is the combination, not the ingredient

Type cannot be judged without color and imagery. So the unit you shuffle, compare, and vote on is a
**system tile** — a small live composition holding a type pairing, a palette, and a reference image
together. This is why `/colors` and `/type` collapse: the ingredient pages were solving the wrong
problem. Revives `BrandShuffle` / `DirectionCard` / the color engine as tile generators.

### The activity library (each maps to a real method)

| Activity | Method | Output object |
|---|---|---|
| **Gut pass** — one reference at a time, keep or pass | card sort, first pass | a cut pool + a **No pile** (kept, not discarded) |
| **Affinity map** — pile them, name the pile, name the *not*-this | affinity mapping | values, each attached to its references |
| **Generative questions** — persona, "if this brand were a place", "what would it never do" | generative / projective research | voice + values |
| **Head to head** — 5–10 system tiles side by side, vote and rank | preference testing | decisions **and the rejected options with reasons** |
| **Try it on** — the current system applied to a real artifact | prototyping | confidence, or a redo |

### Three anti-bloat rules

1. **No new destinations, ever.** Every activity outputs onto the same canvas. If a feature needs its
   own page, it is a different product.
2. **Activities are offered, never imposed.** You can ignore all of them and just move things around.
   The whiteboard feeling is the floor. (Matches "no silent narrowing; cultivate intuition, don't
   supply it.")
3. **Every activity must produce something that survives in the taste spec.** If its output does not
   reach the spec, cut the activity. This is the hard filter.

### The taste spec (the deliverable) — and the NOs

Inkling does not build design systems. It produces the **brief** a graphic designer or a
system-making tool consumes: values with their rejected pole and their references · the palette with
roles · the type pairing with a reason · the persona / voice lines · and — the part nobody ships —
**the rejected options and why.** "We looked at these eight and said no to six, because…" is more
useful to a designer than the winner alone, and the head-to-head activity produces it for free.

### Sourcing: many sources, one pool, attributed

Not a shared Pinterest board. Multiple imports from both people (Pinterest, Are.na, uploads, links)
merged into one project pool, **every item stamped with who brought it**. A shared Pinterest board
would flatten both people into an anonymous pool, put the collaboration layer inside Pinterest, and
destroy the compare-where-we-disagree artifact that is the most valuable thing two people can make
here. Needs `brought_by` on pins/atoms + a `project_members` table.

## The sort (2026-08-21) — the "how" of inkling → structured taste

**The conversion event is naming a pile you just made.** You cannot answer "what is your brand?"
You *can* answer "why are these six together?" — and that answer is a brand value, born already
attached to the references that earned it. So the tool's one job is to force sorting, then ask for
the name. Everything else is downstream.

Five beats, in order:

1. **Pre-loaded** — the board is imported *before* the meeting. Import is not a step.
2. **Fast pass** — one reference at a time, keep or pass, gut speed. ~100 → ~25.
3. **Sort** — the kept ones into piles, one at a time. Pile or new pile. No canvas, no coordinates.
4. **Name + not-this** — each pile gets a name and a rejected pole ("warm, *not* cozy").
5. **Read-back** — the taste spec: each pile's name, its not-this, its references, the colors that
   actually recur in them.

**The freeform canvas isn't wrong — it's premature.** Infinite space is a deferral: it's a good tool
for arranging what you already know, and a bad one for producing knowledge. It stays in the repo for
a later beat. The sort is a new, small surface that reuses only `pins` + palette extraction.

**Deliverable = a brief, not a brand.** Inkling gets you to a taste spec you can trust and hand to
whoever makes the identity — including yourself. That is what "structured taste" cashes out as.

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
