# Moodbuilder — next session plan

State of the tool at the end of the 2026-05-13 session, and the natural next
moves. Read this top-to-bottom before picking up.

---

## ★ North star — a recognition-driven brand co-design studio *(reframed 2026-06-02 with Lorin)*

> **This reframe supersedes the "two-act pipeline" framing in the rest of this
> section.** Full, canonical vision is in memory `project_product_direction` (the
> "★ THE REFRAME" section — read it first). The detailed two-act / Model-A notes
> below are kept only for build-history and the parts that carry over (the canvas,
> board→brand, provenance, many boards, the compose engine).

**What it is.** A studio for designing brand identities that *resonate* — it
registers your resonance, brings intuition into the equation, and makes co-creation
tangible and embodied. *(Public taglines [LORIN TO WRITE].)*

**Core mechanic — recognition, not articulation.** Users know it when they see it
but can't specify it forward. The tool generates/curates things to react to, reads
the YES (and the informative NO), and converges; reactions become the direction *and*
a brief to hand a collaborator. A **briefing instrument**, not a designer-replacer.

**Shape — one canvas is the heart; the old rooms become back-of-house tools.** Not a
hallway of segmented steps. One spatial studio: the sourced "everything" well always
present, hand-curation primary + tactile (you stay the author), shuffle/react a
strategic power-tool, react-in-context by default + isolate as a lens, everything
linked to source. Solo and collaborative are the same canvas (card-sort / affinity /
annotate / vote = the multiplayer form; the deferred Moodvote infra's true home).
**Do NOT build the old "segmented pipeline home" — it reinforces what this rejects.**

**Journey (Lorin's real client practice):** pool (multi-contributor import) → look
together: sort/rate + pull the *aspects* you like (colour / type / composition /
layout / icon style / illustration / graphics / IA / copy / voice — each reference is
a bundle of dimensions) → affinity-map (items in multiple clusters; annotate or
duplicate) → extract by dimension (+ import type/shapes/colours/icons, upload existing
assets) → 3–4 clusters → shuffle into ~20 iterations → narrow/refine/decide (what's
working/not/why/missing; isolate; try on merch/app/web mockups to get the feel). The
well stays open at every layer; recognition drives each transition. Draft values +
difficulty gradient live in the memory entry.

**The origin must never get buried:** the reason this exists is to *translate a
Pinterest inspiration board into real references for moodboards and brand
identity.* That inspiration→reference translation is the soul and the wedge
(synthesis from your actual taste, not generation).

**The spine is two acts:**

- **Act I — the Moodboard** (divergent / gather). A first-class **drag-and-drop
  spatial canvas** (today's Library is only a grid). Arrange a *mix* of reference
  images (each linked to its pin/source URL — **credit preservation is a hard
  requirement**), color swatches, type specimens, and textures. Many boards per
  project = explore many directions.
- **Act II — the Brand** (convergent / compose). Shuffle that curated material
  into a solidified *variety* of brand identities. The `/brand` studio stays
  **thin** — it must not re-accrete every control the way it did historically
  (9 jobs crammed in one rail = the overcrowding Lorin flagged).

**The IA model ("Model A" + origin correction):** inspiration is the *well*, not
a peer step. Color / Type / Texture / Marks are *distilled from it* (each its own
room, each visibly traced back to the board via source chips), then *composed* in
the thin Brand studio, then *decided / delivered* (Decide, Export, Brand book).
Inspiration-first is the highlighted narrative but NOT a mandatory gate — the
hero side-door chips serve the "I have nothing" / "I have client hex" archetypes.

**Resolve the word "studio" to ONE meaning:** platform = Moodbuilder; "the studio"
= `/brand` specifically. Implies renaming the hero/banner off "sample studio."

**Fork decisions (Lorin's gut still to confirm; recommended calls):**
- *Library vs Moodboard* → keep both. Library = full searchable inventory;
  Moodboard = curated spatial composition pulled from it + enriched with
  swatch/type/texture blocks.
- *One board or many* → **many.**
- *Collaboration depth for v1* → **async share only.** "Collaboration throughout"
  has two flavors an order of magnitude apart: async shared boards (link, edit-on-
  open, last-write-wins — builds on the existing `instances/sessions/votes` Neon
  schema + `/v/[token]`) vs **live real-time co-edit** (presence, CRDT/Liveblocks/
  Yjs — a major project, already deferred to "Phase B"). Do NOT let collaboration
  balloon the canvas MVP; ship the solo canvas first.

**Recommended build sequencing:**
1. **Moodboard canvas (solo)** — the centerpiece. Spatial board, image blocks
   first (pins + credit already exist), then swatch/type/texture blocks. Multiple
   boards per project. (Build fork: hand-roll the canvas vs a library — decide
   first; this is the largest single surface: hit-testing, z-order, resize, touch,
   layout persistence.)
2. **Board → Brand wiring** — a board's colors/type/textures become the shuffle's
   source pool (pools already feed Brand; mostly connecting the board as a source).
3. **Async share** — board gets a shareable link; collaborators edit on open.
4. **Live co-edit** — only if it earns its place, as its own project.

This **absorbs the earlier "pull Type into its own step" idea** — Type is now just
one tributary in the distill layer, not a standalone extraction. Don't half-build
it in isolation; fold it into this arc.

Reference bar for the canvas: Milanote / Cosmos / Are.na / a real physical pinboard.

### Canvas build decision *(researched 2026-05-28 — start here next session)*

**Chosen: hand-rolled spatial board on a plain JSON document model.** Rejected the
alternatives against Lorin's constraints (craft/aesthetic bar, hard credit-link
requirement, async-now/live-later, WCAG 2.2 AA):
- *tldraw* — out. License-key enforced in production + "made with tldraw" watermark
  unless you buy a Business License. Paid + watermark + its own chrome on a free
  portfolio tool = three strikes.
- *Excalidraw* (MIT, embeddable) — out. A drawing/whiteboard app with its own
  hand-drawn aesthetic; bending it into a clean moodboard fights it, and blocks
  become *its* shapes (credit metadata gets awkward).
- *dnd-kit* (maintained, React 19-ready, keyboard sensors) — keep in pocket. Not a
  canvas/resize lib, but its keyboard-accessible dragging is the fallback if
  hand-rolled keyboard move/resize gets hairy.
- *Liveblocks* — later, not now. Free tier is dev-only (1 MAU); Pro ~$25/mo. Its
  Storage model is object-per-shape, so it maps onto the model below when live
  co-edit eventually earns its place (no rethink needed).

Why hand-rolled: only path that hits the aesthetic bar, makes mixed block types +
credit-links first-class (they're *our* data, not an engine's shapes), and yields a
model the existing project store persists today and Liveblocks can adopt later. Cost:
we own move/resize/z-order. Keep v1 humble (no pan/zoom) and **build keyboard
move+resize from day one** (arrow-key nudge) for WCAG 2.5.7.

**Board data model (the real asset — portable across file / DB / localStorage / Liveblocks):**
```
board = { id, name, createdAt, updatedAt, blocks: [...] }
block = { id, type, x, y, w, h, z, payload }
  image   → { src, sourceUrl, pinId, credit }   // credit preserved
  swatch  → { hex, name }
  type    → { family, source, url?, sampleText }
  texture → { kind, params }
  note    → { text }
```
Stored per project as `moodboards.json` (file) / the `moodboards` DB table
(authed) / localStorage key `moodbuilder.local.moodboards.v1` (signed-out) —
mirrors existing project persistence. The surface is named **`moodboards`**, NOT
`boards`, to avoid colliding with `library.boards` (Pinterest capture metadata).
Many boards = array of these. *(As built 2026-06-01 — see session log.)*

**v1 scope (solo, thin):** new `/moodboard` route; create/rename/switch boards (many
per project); add blocks from library pins (image + credit), saved swatches, a type
slot, textures, plus a plain note; move + resize + z-order + delete, all
keyboard-accessible; persist via the existing `apiFetch` pattern. **Not v1:** pan/zoom,
live collab, share links, connectors, auto-layout. Board → Brand source-pool wiring is
the next step after this lands. **Start point: the `/moodboard` route with image
blocks first.**

> **v1 SHIPPED 2026-06-01 (not yet committed).** The `/moodboard` route, image
> blocks, keyboard interactions, and the multi-board flow are all built and
> browser-verified. See the **2026-06-01 session log** below for the file map,
> Lorin's 8 review notes + diagnoses, and the three-lane plan. Two design forks
> are paused awaiting Lorin (texture reframe; what to build first).

---

## Session log — 2026-06-03 · type-spoke depth + a full /type UX overhaul *(most recent; read first)*

### ⏸ END-OF-SESSION STATUS — START HERE NEXT TIME

**Read `VISION.md` first** (canonical: §15 the full model, §16 roadmap). Hard rules in
the `project_product_direction` memory (cultivate-don't-supply · no silent narrowing ·
you stay the author). This session deepened and then UX-overhauled the **type spoke**,
driven by Lorin's live review. **11 commits on `phase-6c-playground`, LOCAL ONLY (not
pushed — Lorin's call).** Working tree clean, `npm run build` green, browser-verified.

**Shipped this session (commits `5135846` → `812c856`, newest last):**
1. **Clean type atom on the board** — a kept face lands as ONE specimen (your word in the
   face) with `family · source` as a caption *inside* the block; killed the bogus second
   "family-name" box. A pairing lands as a flush name+subhead lockup. `TextBlock` gained
   `caption` + `size`; fixed the "specimens render tiny" debt.
2. **Name + Subhead lockup + Pairings** — two copy fields re-typeset the whole board;
   each card is a real lockup, not one word. **One-typeface / Pairings** modes (pairings
   ranked by your gathered palette via `rankPairings`). Real type-classification chip
   names. Source named in copy. **Show more** so the full catalog in a style is reachable
   (no silent 28-cap).
3. **Type sources panel + `SpokeNav`** — a persistent `Color · Type · Board` nav in every
   spoke + the canvas header (`components/SpokeNav.js`), so you can always get back.
4. **Fontshare as a 2nd free, live library** — `/api/fonts/fontshare` (cached, normalized
   to our style facets); `FontLoader` gained a `fontshare` source (loads by slug);
   one-typeface browse merges Fontshare (leading, labelled) with Google, honest two-source
   counts. Pairings stay Google-only.
5. **Every card names its source** — Google quiet, Fontshare accent (no unexplained tags).
6. **`/type` rebuilt browse-and-collect** (was borrowing recognize's react/direction
   shell): a "your words" hero → a sticky browse toolbar → a full-width 3-col specimen
   grid → a **sticky "collected" bar** along the bottom (the cart frees the width for
   comparison). Responsive + reduced-motion safe.
7. **"Bring your own" = a segmented panel** (`Search by name · Paste a link · Upload`),
   one job in focus — replaced the cramped toolbar search and the 3-paragraph wall.
8. **Script → Handwriting** — honest label (Google's single bucket lumps cursive + casual
   hand; can't split without mislabeling).
9. **Add-by-URL made forgiving + honest** — accepts a bare link, a `<link>`/@import embed
   snippet (extracts the href), or a direct file; auto-fills the family from Google links;
   **verifies the face actually rendered** (looks for a loaded `FontFace` — `document.fonts.check`
   can't tell a real load from an unknown family) and *warns* on a web-page/mismatch instead
   of silently "succeeding." Upload stays sign-in-gated.
10. **Neutral input type** (the words fields were serif; styling belongs in the specimens)
    + "Paste a link" wording (URL vs embed code = both; embed code is a link in a tag).

**File map:** `app/type/page.js` + `page.module.css` (the overhaul); `app/api/fonts/fontshare/route.js`;
`components/FontLoader.js` (fontshare source); `components/SpokeNav.js` + `.module.css`;
`components/canvas/TextBlock.js` + `canvas.module.css` (caption/size); `lib/addTypeToBoard.js`;
headers on `/recognize` + `/moodboard` gained `SpokeNav` (and shed a competing `margin-left:auto`).

**★ STANDING — full-site visual QA pass (batched, do AFTER the architecture).**
Sweep every page for misaligned / wrong-sized / illegible chrome and fix them in ONE
dedicated pass, not piecemeal mid-build. Lorin's explicit call (2026-06-03): *don't get
caught up in these details before the architecture is built — keep me accountable to that.*
Known instances logged: the **ProjectSwitcher "Your Brand" caret is illegibly tiny**;
(fixed 2026-06-03: Submit-modal select chevron alignment + the cartoonish heading weight).
The app-wide heading treatment (Fraunces 700 + SOFT) reads chunky to Lorin — revisit
weight globally in the same pass (it's currently an intentional brand choice, so confirm).

**Known limits / debt (don't lose these):**
- Add-by-URL works for Google embed links + CORS-friendly hosts; a foundry that blocks
  cross-origin loading still won't render (now *warns* instead of failing silently). The
  robust path for arbitrary licensed fonts is **upload** (sign-in/Blob, still gated).
- Pairings are Google-only (the curated `PAIRINGS` set) — Fontshare grotesks aren't paired yet.
- Dead CSS left in `app/type/page.module.css` (the old recognize-shell classes: `keptList`,
  `importBar`, etc.) — harmless, sweep on the next pass.
- Mobile: the collected bar hides its chips under ~640px (count + CTA only); grid → 1 col.

**↳ NEXT (Lorin to pick, VISION §16):** the **crop-and-tag "pull" gesture** (§16B — "this
part, and it's about ___", generalises *input* the way type generalised output) **or** the
**/brand redesign** to match the recognize/type calm (§16G — the long-flagged overcrowded
"thin Brand studio"). **Push when Lorin asks.**

---

## Session log — 2026-06-02 (late) · the full model + the type spoke

### ⏸ END-OF-SESSION STATUS — START HERE NEXT TIME

**Read `VISION.md` first — it is now the canonical source of truth** (the recognition
loop, the five personas, and §15 "the full model": recognition = the reusable engine
of intuition-curation, run per dimension, feeding a playground canvas that is the home;
brand is summoned far downstream; the atom is a tagged reference; the well is a
cross-project searchable library; the universal "pull" gesture is crop + tag; two board
kinds — workshop affinity vs curated collage). The `project_product_direction` memory
carries the hard rules (cultivate-don't-supply, no silent narrowing, you stay the
author). **Everything is committed AND pushed** to `origin/phase-6c-playground`.

**Shipped this session (after the recognition-loop polish below):**
- **The /recognize standard** — design pass (blurred image backdrop, anchored empty
  state, board+focused react "whole field you drive", reflection in your own words,
  persistence across navigation, onboarding tour with clamped tooltips, copy de-fluffed
  to American/no-Pin-assumption, Maybe-moves-forward, eyedropper-to-pick-colors). This
  is the **reference standard** every other room must match.
- **The type spoke (`/type`)** — recognition generalised to a 2nd dimension. Reshaped
  (after Lorin's review) into a **curated exploration board, her Figma workflow in-app**:
  one "your words" field re-typesets the whole board live; **expressive vibe chips**
  (Adobe pattern, each set in a face that embodies it) browse the real catalog by feel;
  **import paths** — vibe-browse (novice, no collection) + "search & add any font by
  name" (bring favorites); Keep → collection → "Add to your board" lands faces as live
  specimens tagged `type` on the same moodboard. `lib/addTypeToBoard.js`,
  `rankPairings()` in `fontPairings.js`. Killed the bogus "suits your colours" claim.

**↳ NEXT — type spoke depth, then more dimensions / the pull gesture:**
- Type rough edges (Lorin's eye, pick by her steer): **title/subhead/body roles** (judge
  a real lockup — her "see it in context" instinct) · **upload your own fonts** (gated:
  needs sign-in/Blob) · richer **mood vibe-tags** (curated lists beyond classification) ·
  **finalist "in context"** depth (lockup + in-use links out to Typewolf/Fonts-In-Use) ·
  make the **moodboard itself** re-copy its type blocks (the true exploration space).
- Then: the **crop-and-tag "pull" gesture** ("this part, and it's about ___" — generalises
  input the way the type spoke generalised output) and the **workshop-board templates**
  (affinity sections). And the **/brand redesign** to match the recognize/canvas calm
  (the long-flagged "thin Brand studio" — overcrowded; queued in VISION §13/§14).
- Studied references (VISION notes): Typewolf (decide in context), Fontpair (curated >
  exhaustive; clipper), Adobe Fonts (expressive tags + image-to-type search). The
  browser-extension clipper + image-search are strong future bridges.

---

## Session log — 2026-06-02 · recognition loop + colour authorship

### ⏸ END-OF-SESSION STATUS (earlier) — superseded by the session above

Built the **first recognition-loop slices on `/recognize`** and dogfooded them with
Lorin live. The reframe's load-bearing claim **held**: reacting (YES / Sure / Maybe /
Meh / Nope) to her real Whelm pins genuinely *narrows the pile* — "I sensed when
something was a no, it helped me narrow down." But dogfooding surfaced the real spine:
**authorship over colour.** Her words, now the north-star line in memory
`project_product_direction`: *"I don't need the machine to tell me my taste. I need
it to give me tools to extract my taste from inspiration."*

**Four commits, `phase-6c-playground`, LOCAL ONLY (not pushed), tree clean.** Restore
tag **`pre-recognition-loop`** marks the pre-pivot HEAD (`d22e243`).
- `e926fda` — **recognition loop**: react to pins → a colour direction emerges,
  steered by a cumulative resonance profile (re-ranked finite queue + a contrast
  probe every 3rd card so the NO stays informative), settling when it stops moving.
- `3c0e557` — **curate the proposal**: the auto-pull becomes a starting proposal; she
  toggles colours from a recurrence-ranked candidate pool and the direction recomposes.
- `66513e3` — **eyedropper**: sample colours straight off the pin image (the real ask
  — the extractor pulls foliage, not the bloom). Per-pin overrides feed the direction.
  Reframe: a YES means "this image belongs in my world"; colours are mined from yeses,
  never the basis of them, so a wrong auto-colour can't poison the reaction.
- `7e89012` — **loupe polish**: cursor-centred magnifier + hollow target ring + big
  live readout (swatch + hex + colour name). All four browser-verified, build green,
  console clean.

**File map (new):** `app/recognize/page.js` + `page.module.css` (the one screen:
react card · live Direction panel · curation pool · cluster), `lib/recognition.js`
(pure deterministic engine — profile, steering, candidate pool, compose, settle),
`components/PinColourEditor.js` + `.module.css` (the eyedropper).

**Known limit (told to Lorin):** canvas pixel-sampling works for the **same-origin
Whelm sample** (`/sample/`). A cross-origin pin taints the canvas, so the eyedropper
disables itself and falls back to swatch-delete + hex-entry. **Remote pins need a
small image-proxy step** before the eyedropper works on them.

**↳ NEXT — the threads Lorin raised, in priority order (all in memory
`project_product_direction` "Dogfood result" section):**
1. **Role-pinning** — colour *selection* is hers, but roles (bg/accent/muted) still
   auto-assign by luminance/chroma, so a dark rose lands as "muted" not "accent."
   Let her pin "this colour is the accent." Small; completes the authorship story.
2. **★ Recognition-guided sourcing (the big one)** — feed *new* Pinterest pins
   matched to the resonance profile, so the loop *grows* the pool, not just narrows
   it. Frontier (needs Pinterest/Are.na retrieval). Her most excited idea.
3. **Aspect-level reaction** — react to a pin's *aspects* (not the whole image);
   colour is solved, type/composition tagging is frontier.
- Also pending: the eyedropper image-proxy for remote pins; wiring the settled
  direction into the Brand spine ("Keep this direction"). Don't push until Lorin asks.

---

## Session log — 2026-06-02 (earlier) · Board → Brand seam + image finishes

### ⏸ END-OF-SESSION STATUS (2026-06-02) — superseded by the recognition-loop session above

**★ MID-SESSION PIVOT — read this first.** Lorin flagged (correctly) that we were
hyper-focused on Act I *details* (crop, shape blocks, finishes) without confirming
the product's function/flow/need — the moodboard had become a **beautiful island**
that fed nothing. We agreed to **finish the connective architecture before
deepening details.** Reordered roadmap: (1) Board → Brand seam ✅ *shipped this
session*; (2) flow legibility (home pipeline + IA); (3) **dogfood the full spine on
Whelm** and let real use — not the spec — drive the next detail work. Act I detail
depth (Lane B slices 2–3, halftone upgrade, image-by-URL, etc.) is **parked until
the spine proves out.** Approved plan: `~/.claude/plans/graceful-strolling-lagoon.md`.

**Two commits shipped this session, `phase-6c-playground`, LOCAL ONLY (not pushed),
tree clean:**
- `0207375` — Lane B slice 1: per-image moodboard image finishes.
- `5e07220` — **Board → Brand seam** (the pivot's first move): a board's colours
  now feed the Brand shuffle. Both browser-verified (signed-out), build green, no
  console errors.

**Board → Brand seam — what works now** (`/brand`): Source dropdown has a new
**"This board"** pool. Pick it → a **board picker** appears (compose from any board
= many-boards→many-directions) + a **"Composed from <board>"** provenance chip.
Shuffle composes the identity from that board's colours — swatch hexes + shape
fills + finish inks + the extracted palettes of its pinned references (via
`lib/extractBoardMaterials.js`, intent-ordered + deduped). Sources the active board
(browser-local `moodbuilder.moodboard.activeId` → most-recently-updated fallback);
switching the picker auto-reshuffles; empty board disables Shuffle + links to
`/moodboard`. Also relabeled the misnamed old `moodboard` pool (= library pin
aggregation) → **"Library colours."** No API/DB/store changes; works authed + signed
out (authed not live-tested — identical client path, same response shapes).
**Next seams (sequenced, NOT built):** board *type* → Type panel; board *finish* →
Brand preview surface (ties to deferred Lane B slice 2). `extractBoardMaterials`
already returns `fonts` + `finishes` for these.

**Lane B slice 1 (finishes) — committed earlier same session:** browser-verified
all six finish states + keyboard focus; source-credit stays crisp above every
finish.

**What works now** at `/moodboard`: select an image block → the **Image finish**
toolbar button (tonal-circle icon, beside Crop) opens a **FinishPopover** —
finish chips **None / Riso / Grain / Duotone / Halftone / B&W**, an intensity
slider, two palette **ink pickers** (Shadow / Light, duotone + Riso only), and
**Apply to all images**. The finish lives on `block.payload.finish` and persists
via the existing autosave (no backend change). Controls at the 44px touch floor;
effects are static SVG/CSS (reduced-motion safe, export-safe).

**Decisions Lorin made this session (locked):**
- **Per-image, NOT board-wide.** A board-wide finish would destroy the colour/
  mood each reference was collected for and read incoherently next to true-colour
  swatches. Default is none; vary per image; **Apply to all** is the one-click
  unified-Riso escape hatch. (Captured in memory `project_product_direction`.)
- **Menu = all six** (she added **B&W**). Halftone kept but is the weakest —
  it's a *uniform* dot grid, not true tone-mapped (dot size ∝ luminance). If she
  wants it stronger later, upgrade to a real tone-mapped halftone (SVG-heavier).
- **Default inks = darkest + lightest from the palette, but the shadow ink is
  biased toward the most *chromatic* dark** so duotone reads as two colours, not
  grayscale (else Riso/Duotone/B&W collapse together). Both inks stay editable.
- Default intensity 0.8 so a finish reads on first apply.

**File map (this slice):**
- `components/canvas/finish.js` (new) — FINISHES list, grain/Riso noise tiles
  (feTurbulence data URLs), `hexToRgb` / `luminance` / `chroma`, `deriveInks`
  (palette → chromatic-dark + light pair), `duotoneStops`, `withDefaults`.
- `components/canvas/FinishPopover.js` (new) — the chooser; the *live board image
  is the preview* (no abstract swatch), fetches `/api/library/palette` for inks.
- `components/canvas/ImageBlock.js` — renders duotone (SVG `feColorMatrix` →
  `feComponentTransfer`), grain/halftone/grayscale overlays, all
  `pointer-events:none`, credit chip above.
- `Block.js` (Finish button + popover), `Board.js` + `app/moodboard/page.js`
  (`onSetFinish` / `applyFinishAll` wiring), `canvas.module.css` (finish styles).

**↳ ✅ DONE (in the recognition-loop session above): scoped + built the first recognition-loop slices on Whelm.**
The vision reframed mid-session into a **recognition-driven brand co-design studio**
— read the rewritten north star above + memory `project_product_direction`
"★ THE REFRAME" FIRST; the dogfood walk + the long vision conversation with Lorin
landed this pickup.

- **Build the smallest slice that lets Lorin *feel* the recognition loop on real
  Whelm inspiration** — react (YES / Sure / Maybe / Meh / Nope) to her pooled pins
  and watch a *direction* emerge from what resonates. **NOT** a full canvas rebuild,
  **NOT** a new home page. The point is to prove the one thing the whole vision
  rests on: does the YES/NO loop actually converge on something she *feels*? Start in
  plan mode; keep the slice small and dogfoodable on Whelm.
- **REJECTED — do not build:** the old "flow legibility / segmented pipeline home."
  It reinforces the room-by-room segmentation the reframe explicitly rejects.
- **Open design Qs to settle while scoping:** the *unit* you react to (a whole
  composed cluster vs an image/colour/type triad — granularity sets how fast
  recognition fires), and how a reaction *steers what comes next* (so it converges,
  not a slot machine). Full journey + aspect-as-unit + difficulty gradient in memory.

**PARKED until the recognition loop proves out** (details we stopped gold-plating):
- Lane B slice 2 (surface grain / board paper — reuse `finish.js` on board bg) +
  slice 3 (grain masked into type/marks). Board *type*/*finish* → Brand seams.
- Board-image PNG export (none exists yet; finishes are built export-safe).
- Image-by-URL (cheap: paste URL → image block); desktop upload (needs IndexedDB/
  Blob local binary store); halftone tone-map upgrade; swatch-style picker; more
  foundry directory in the text popover; video pins.
- Before authed parity: `node scripts/migrate.mjs` (migrations 008 + 009).

---

## Session log — 2026-06-01

### ⏸ END-OF-SESSION STATUS (2026-06-01) — START HERE NEXT TIME

**The whole moodboard canvas (Act I) shipped this session and is COMMITTED**
(13 commits, `a235cad` → `4cff2db`, on `phase-6c-playground`). Working tree is
clean. **Commits are local only — NOT pushed to origin yet** (Lorin's call to
push when ready).

**What works now at `/moodboard`** (all browser-verified, signed-out/localStorage
path): a hand-rolled spatial board with **image blocks** (drag/resize/delete +
crop & focal reframing, source-credit link preserved), **swatch blocks**
(Card / Plain / Circle, colours from the project palette), **text blocks** with
**real typefaces** (project brand fonts + Google catalog + custom URL/upload,
shared FontPicker extracted from TypePanel), **shape blocks** (rectangle + line,
fill from palette), one-step **layering**, **board background colour**, **many
boards** that **reopen where you left off**. Persistence mirrors all three
backends (file / Postgres `moodboards` table / localStorage). **DB TODO before
authed parity:** `node scripts/migrate.mjs` (migrations 008 + 009).

**Quick fixes also done this session** (`4cff2db`): credit-pill contrast, tray
collapses under 700px, primary controls at the 44px touch floor, and `/decide`
names palettes by lead colour (Name That Color) instead of "pinterest.com".

**↳ NEXT SESSION — pick up with Lane B, then Lane C** (see "The plan" below):
- **Lane B — texture / Riso finish** *(Lorin LOCKED this: a finish applied across
  image / surface / type, **image grain first**; see memory
  `project_product_direction` "Texture is a finish"). This also delivers the
  board paper/texture that's the last canvas item.* Build image grain/Riso/
  halftone/duotone on moodboard images + export first, then surface (board bg
  texture), then masked-into-type.
- **Lane C — narrative/wrapper:** pipeline-verb home + IA wiring (note 1, with
  Lorin's verbs + taglines — mind the "studio" word flag), Resources as a true
  library (note 2), remaining /decide spacing polish (note 5).
- Deferred: **video pins** (note 8) — gated until a board has actual video to
  test against.
- Canvas parked niceties: a *picker* (vs cycle) for swatch styles; wiring more of
  the foundry directory into the text typeface popover.

---

### Moodboard canvas v1 — BUILT + verified, not yet committed

Act I, v1 (the solo `/moodboard` spatial canvas) is done and browser-tested.
Working tree is clean of stray data (signed-out testing wrote only to
localStorage). **Not committed yet** — Lorin wants eyes-on + the review notes
below addressed first.

**File map (new, all untracked):**
- `app/moodboard/page.js` + `page.module.css` — route + shell (ProjectSwitcher,
  BoardBar, Board, PinTray); owns selection, block CRUD, z-order, add-pin (image
  preloaded to size the block to true aspect, not a cropped square).
- `components/canvas/Board.js` — scrollable pinboard surface (dot-grid bg, no
  pan/zoom), deselect-on-empty, renders blocks sorted by z.
- `components/canvas/Block.js` — generic geometry/chrome wrapper: pointer move +
  8-way resize via pointer capture, **full keyboard ops** (arrows nudge 1px /
  Shift×10, Alt+arrows resize, `[`/`]` z-order, Delete) for WCAG 2.5.7.
- `components/canvas/ImageBlock.js` — image payload + **persistent source-credit
  link** (verified resolves to real pin URL — the hard requirement holds).
- `components/canvas/BoardBar.js` — create / rename (inline) / switch / delete +
  saved-state.
- `components/canvas/PinTray.js` — right panel of the project's library pins;
  click to drop. (Currently square-crop grid — see note 6.)
- `components/canvas/canvas.module.css` — all canvas styling (selection ring =
  `--whelm-vivid`, dot grid, credit pills, handles).
- `lib/useBoards.js` — load/create/rename/switch + **debounced whole-board PUT**
  autosave, via `apiFetch`.
- Persistence surface named **`moodboards`** (separate from the taken
  `library.boards` = Pinterest captures), all three backends:
  `lib/boardsStore.js` (file/active-slug), `lib/db/moodboards.js` +
  `migrations/008_moodboards.sql` (DB — **needs `node scripts/migrate.mjs` vs
  Neon before authed parity**), `localStore.js` moodboards fns +
  `lib/api/client.js` routing (signed-out).
- IA decision (Lorin, this session): keep `/moodboard` **standalone for now**,
  wire it into the numbered path later (note 1 below is that wiring).

**Verified working:** add pin → block at true aspect + credit link → move/resize
(pointer + keyboard) → z-order → delete → multi-board create/rename/switch/
isolate → **persists across reload**. Zero console errors. Build passes.

### Lorin's 8 review notes (2026-06-01) — catalogued, with my diagnoses

1. **Home intro = the pipeline, as verbs.** Lorin's structure + copy (her words,
   preserve verbatim): the acts —
   *"Import (Inspiration), Assemble (Moodboards), Shuffle (Colors + Type),
   Generate (Gradients + Textures), Export (Brand Books)"*; taglines
   *"Transform Inspiration into Identity."* and *"A creative studio for iterating
   on the mood of your project."* This IS the home redesign + the deferred
   "wire Moodboard into the path" step. **FLAG:** her tagline uses "studio" for
   the whole platform, which reactivates the studio-word ambiguity we resolved
   (studio = `/brand` only). Her call; don't edit her words, just surfaced it.
   The "Type" and "Textures" acts depend on other work (type lives in Brand
   today; textures depends on note 4).
2. **Resources MUCH more obvious — a true resource library.** Promote `/resources`
   from side-utility to a first-class destination (prominent home entry, richer
   library UI, maybe nav presence).
3. **Sample studio needs a couple SVG marks** to showcase the Marks feature.
   Signed-out marks are empty today; seed 1–2 into the sample. Small, additive.
   (`ensureSeeded()` in `localStore.js` doesn't seed marks; sample marks would
   go in `lib/sampleStudio*`.)
4. **Rethink texture — DESIGN FORK (paused).** My read, endorsed pending her nod:
   texture is not a peer dimension — it's a **finish applied across image /
   surface / type**, matching her Riso instinct. Three surfaces by payoff:
   (1) image grain/Riso/halftone/duotone on moodboard images + exports (the
   Whelm look — build first); (2) surface grain behind Brand preview + as board
   background (note 8 overlap); (3) masked into type/marks (subtle, last).
   Reframes the Texture step to "pick a finish + intensity, see it ride across
   something live" — kills the "what does texture even do" problem because it's
   never an abstract swatch. Impl: CSS/SVG `feTurbulence` + blend modes + duotone
   map.
5. **/decide [Image #1]: spacing/label clip + palette labeling.** The
   `● pinterest.com` chips are saved Top-pick palettes; they all read
   "pinterest.com" because sample pins aren't source-enriched, so the label is
   the *source*, not an *identity*. **Cross-cutting fix:** name palettes/credits
   by identity (NTC lead-color name, or pin title/thumbnail) — clears it on
   /decide, the PinTray, AND the block credit chips at once. Plus a real
   spacing/clip bug to fix on the compare cards.
6. **PinTray [Image #2]: card-stack hides content.** Diagnosis: I forced every
   pin to `aspect-ratio:1/1` + `object-fit:cover`, cropping tall/wide pins and
   butting them together. Fix: true-aspect **masonry columns** (CSS columns),
   more vertical rhythm, hover-to-enlarge — the Are.na column read.
7. **Block toolbar + crop [Image #3].** (a) The ↑/↓ are bring-forward/send-back
   (z-order); they look inert because nothing overlaps yet. Make legible (clearer
   icons + tooltips), likely move z-order to a right-click menu so the inline
   toolbar stays minimal. (b) **Crop is the real ask + highest-value next
   feature:** block = a *frame*; drag/zoom the image *inside* it to choose the
   focal crop. "Crop mode" — drag to pan, slider/scroll to zoom, click out to
   commit; store `objectPosition` + `scale` on the block payload.
8. **More moodboard features (block taxonomy + tools).** Full set: image (done) ·
   color swatch/palette · text/label · type specimen · shapes (rect/line/divider)
   · video pins (loop/replay) · link/URL cards · **board background color** ·
   **board texture/paper** (note 4) · sections. Connectors/arrows stay deferred.
   Canvas tools (left rail): select · add text · add shape · import image · drop
   swatch · drop type. Suggested order: swatch + text first (cheapest, highest
   value) → shapes + board bg/texture → type specimens → video.

### The plan — three lanes (Act I stays the spine)

- **Lane A · Canvas (on-track).** A1 ✅ **SHIPPED 2026-06-01** (uncommitted):
  PinTray rebuilt as true-aspect masonry (6); block toolbar clarified — clear
  layer icons + tooltips, z-order buttons only show when the board has >1 block
  so a single image no longer shows inert controls (7a); two sample SVG marks
  ("Bloom", "Horizon") seeded into the sample studio + one-time backfill, verified
  rendering/recoloring on /brand (3). A2 ✅ **SHIPPED 2026-06-01** (uncommitted at
  log time): crop / focal control (7b) — block is a *frame*, image positioned
  inside via cover + focal + zoom (`components/canvas/crop.js`). Crop mode
  (double-click / Crop button / Enter) → drag or arrow-keys pan, slider or +/−
  zoom, Done/Esc commits; render clamps so a gap can never show. Stored as
  `ratio` + `focal{x,y}` + `zoom` on the block payload. A3 ✅ **largely SHIPPED
  2026-06-01** (committed): swatch blocks (Card / Plain / Circle styles), text
  blocks with **real typefaces** (project fonts + Google catalog + custom URL/
  upload, via a FontPicker extracted from TypePanel) sized as specimens, and
  shape blocks (rectangle + line, fill from the project palette). Plus the
  active-board-memory fix (reopens your last board, not board 1) and a shared
  ColorPicker. **A3 remaining:** board-level background colour + texture, and
  video pins (gated on pins that are actually video). Brand-font integration in
  text is done; the parked nicety is wiring more of the foundry directory in.
- **Lane B · Texture (4).** Lock the finish-layer reframe, build image-grain
  first (also feeds A3 board texture + export).
- **Lane C · Narrative/wrapper.** Home pipeline intro + IA wiring (1) · Resources
  library (2) · /decide labeling + spacing (5). The cross-cutting "name by
  identity, not domain" fix lives here and clears 5 + the credit ambiguity.

**Decided 2026-06-01:** the PinTray text-search was removed — a moodboard
library is browsed visually, not queried by text, and at one project's scale a
masonry scans fine. If filtering ever earns its place at scale, the right axis is
**by color** (each pin already carries an extracted palette), not free text.

### PAUSED — re-ask Lorin on resume (do not decide unilaterally)

- **Texture direction:** finish-layer reframe (image grain first) vs image-grain
  only vs keep as standalone dimension.
- **What to build first:** Canvas polish now (A1) vs crop (A2) vs texture (B) vs
  home+IA+Resources (C).
- Then: commit the canvas v1 once she's looked at it live.

### Carried from the v1 review (still open, low priority)

- Touch-target deviation from the 44px floor: block toolbar buttons 28px,
  resize handles 11px. Keyboard equivalents exist (Delete, `[`/`]`, Alt+arrows)
  so functionally WCAG-OK; Lorin's call on whether to enlarge vs keep dense.
- Mobile: the 288px tray squeezes the board to ~102px (desktop-first compose
  tool; degrades without breaking). Consider collapsing the tray by default
  under ~700px.
- Credit chip contrast is image-dependent (white on `rgba(0,0,0,0.6)` + blur);
  bump to ~0.66 if it goes marginal over a bright image.

---

## Session log — 2026-05-27/28 *(superseded by 2026-06-01 above)*

All shipped, on `main` (= branch `phase-6c-playground`, even). Production
deploys from main; Vercel is building these. Newest first:

- **Decide compares palettes too** *(`df24f3b`)* — `/decide` now gathers Brand
  presets + Top picks + ★ saved palettes into one comparison; palettes render
  with the project's current fonts/text, PRESET/PALETTE badges distinguish
  them. (Supersedes the presets-only Decide below.)
- **Brand book reflects a saved identity** *(`e2e81b4`)* — `/print` defaults to
  ?palette → chosen/latest preset → brand colors → empty, with an "Identity"
  picker + "Showing: <name>" label. No longer empty from the path nav.
- **Review batch, 10 items** *(`b79b20e`, `6121813`, `f245c76`)*:
  (1) sample copy names Pinterest + Are.na; (2) **smart curly apostrophes
  repo-wide** + `scripts/smart-quotes.mjs` guard (run `--write` after adding
  copy, or wire a pre-commit hook); (3) removed "Surprise me" on /colors;
  (4) **tagline/body overlap fixed** (flowing text stack in `BrandPreview`,
  robust to any length) + persistent edit hint above the preview;
  (5) Brand book PDF also one-click on `/print`; (6) Texture panel explainer +
  3 built-in SVG textures (signed-out can try without uploading); (7) preset
  vs saved-palette explainers; (9) "Surface"→"Blend" gradients verb;
  (8/10 above).
- **Font pairing expansion** *(`1388c99`)* — 36→49 cited pairings from vetted
  sources; "(via Fontpair)" provenance in the Type hint. Sources added to
  `/resources` as a new "Type & pairing" category *(`607fc8b`)*.
- **Local SVG mark uploads** *(`a93977d`)* — signed-out marks store in
  localStorage, persist across nav; per-feature gate removed. Font/texture
  (binary) uploads still gated — next slice is an IndexedDB/Blob local store.
- **Name That Color** *(`cb29924`)* — names every swatch; demoted to
  hex-primary in the rail per review (names live in tooltips + /colors readout).
- **One-click PDF** *(`2649999`)* — `/api/brand/export` via puppeteer-core +
  @sparticuz/chromium. **Prod TODO: verify on Vercel** (Lambda Chromium can't
  be tested locally; may need a function memory bump).
- **Type step complete** *(`faa290b`, `0f2c6bd`, `6b4db17`)* — faceted browser
  + foundry directory + palette-weighted pairing engine.

**Still on Lorin (deploy/content):** flip `AUTH_REQUIRED=false` on Vercel +
redeploy (the switch to the sample home); smoke-test the PDF live; run
`node scripts/migrate.mjs` against prod `DATABASE_URL` (submissions table);
voice pass on the Decide step body (home grid line is Claude-written), the
`[LORIN TO WRITE]` colophon in `app/page.js`, and `COFFEE_URL`.

**Top buildable next:** (1) font/texture local uploads (IndexedDB/Blob —
finishes the signed-out playground; marks done); (2) "Lock identity"/finalize
commit; (3) Combo object + promote-to-preset (Phase 3 remainder); (4) home-page
redesign (reads flat vs the tool pages); (5) mobile pass.

---

## Where we are

A working brand studio with five tools, one active project at a time, and
real exports out.

**Tools live at:**

- `/` — homepage + project picker
- `/brand` — live wordmark composition, roles, shuffle, click-to-recolor,
  marks, export
- `/colors` — starred set + curated rows + brand swatches + moodboard pool
- `/gradients` — linear / radial / conic builder
- `/import` — Pinterest board capture (bookmarklet → JSON drop)
- `/library` — pin grid with extract, upload, modal editor
- `/print` — 5-page brand book at letter landscape

**Data layout (project-scoped as of last commit):**

```
data/
  active-project.json        # { slug }
  projects/
    {slug}/
      project.json           # name, wordmark, period, initial, tagline, body
      library.json           # pins, starred, boards
public/
  projects/
    {slug}/
      uploads/{hash}.{ext}   # user-uploaded images
  marks/                     # SVGs (still global — see "next moves")
```

All API routes resolve the active slug via `lib/projectRegistry.js`.

**Existing project:** `whelm` (migrated from the original single-tenant
data on 2026-05-13). 252 pins, 30 seeded starred hexes, 7 brand swatches,
9 hand-drawn marks, full project copy.

---

## Known gaps and rough edges

### Marks are still global
`public/marks/` holds 9 SVGs shared by every project. A new project
inherits Whelm’s marks, which is wrong.
**Fix:** move marks under `public/projects/{slug}/marks/`. Add a
`/marks` page or library-style upload UI for dropping SVGs into the
active project. `MarksFrame` reads from the active project’s marks
directory.

### No project switcher on sub-pages
Today the only way to switch projects is going back to `/`. Sub-page
toolbars (`/brand`, `/library`, etc.) should show a small project chip
near the title with a dropdown to switch without losing your spot.

### Saved palettes (★ Save) aren’t project-scoped
They use a single `localStorage` key (`moodbuilder.favorites.v1`). When
you switch projects, you see Whelm’s saved palettes inside the new
project. Should be `moodbuilder.favorites.v1.{slug}` per project.

### Pinterest bookmarklet has no project target
The bookmarklet downloads JSON; the `/import` drop zone commits to
whichever project is active right now. Two improvements worth
considering:
- Add a project picker inside the `/import` page before commit.
- Or stamp the bookmarklet’s filename with the active slug at the time
  of capture so it carries intent.

### Brand-page picker variants
Light variant flips bg↔ink in auto-derivation, but role *overrides* are
fully independent per variant. If a user only overrides dark and never
touches light, light still auto-derives from the same palette — that’s
the right default. Worth documenting in tooltips so it’s obvious.

### Font pairing (deferred from earlier)
Display / Body slots with Google Fonts search + Fontshare + local upload
+ custom URL. Designed but not built. Lives next to color in the Brand
page identity. Saved Brand Presets should capture palette + fonts as one
object — already structured in `lib/exportFormats.js` for the JSON
preset, just needs UI.

### PDF export — one-click SHIPPED 2026-05-27 *(commit `2649999`)*
"↓ Download PDF" in the Export modal’s Brand book tab renders the /print page
in headless Chromium and streams a Letter-landscape PDF — no Cmd+P. Stack is
`puppeteer-core` + `@sparticuz/chromium` (NOT full puppeteer — won’t run on
Vercel and is huge). The headless browser has no session, so the client posts
the brand snapshot and the route seeds it into localStorage before boot
(reuses the signed-out editor path) + palette via `?palette=`. Verified
locally (5-page PDF, custom fonts + palette render). **Prod TODO: verify on
Vercel after deploy** — serverless Chromium can’t be tested locally; may need
a function memory bump.

### Figma plugin
"Open in Figma" is currently a JSON download with import instructions.
Publishing a real Figma plugin (`Moodbuilder` in the Community plugins)
would make it a one-click pull. Separate small project — talk through it
when ready.

---

## Direction *(locked 2026-05-25, refined later same day)*

**Free + profile-less by default. Profile is opt-in for cloud sync.**
The public default at moodbuilder.studio (planned domain) is the full
editor working from in-browser storage with a curated Sample Studio loaded. Signing in is
how you save palettes and projects across devices — not how you get
access to the tool.

Multi-tenant DB exists (built today) and serves authed users. Anonymous
users live in `localStorage` (and `IndexedDB` later for heavier payloads
like marks/uploads). Server-side processing — palette extraction, source
URL enrichment, Pinterest import — works for everyone; only persistence
differs.

The editor is a browser client that talks to the Neon DB when authed
and to local storage when not. Same UI, two backends, runtime choice.

User-stage archetypes the tool must support:

1. **"I have nothing"** — new account, no Pinterest board, no colors.
   Needs: three-path empty hero (drop a board, paste a hex, browse
   starter palettes), brand-name prompt at project creation, Sanzo Wada
   + curated mood packs as starter pools.
2. **"I have a vibe, no specifics"** — Pinterest board, no decided colors.
   Already served by Phase 2a.5 (rate palettes on /colors, shuffle samples
   from saved on /brand). Brand-name prompt missing.
3. **"I have brand assets"** — locked hex codes from a client, maybe an
   SVG logo. Needs: hex entry, "Build from a color" flow on /brand,
   prominent mark upload empty state, "promote to project brand" affordance.
4. **"Most of a brand, refining"** — choosing between candidates. Needs:
   /decide surface (planned), font pairing (Phase 2b), Share for voting
   (already wired) bolted onto Decide.
5. **"Brand is final, deliverables"** — exporting, handing off. Needs:
   brand book made discoverable, token export polished, "lock identity"
   commit action.

## Current roadmap *(revised 2026-05-25, supersedes the earlier list)*

The product is a brand identity sketchpad. The wedge is *synthesis from your
actual taste* — not generation, not curation. Every Phase 2+ decision below
serves that.

**Phase 1 — Project isolation + automatic palette extraction** *(shipped 2026-05-25)*
- Deleted `celestial-fizz-co`, migrated `data/palette.json` + `data/moodboard/`
  into `data/projects/whelm/`.
- `lib/palettePool.js` is now pure math; pools hydrate per-project from
  `/api/library/palette` via new `lib/paletteStore.js`.
- `lib/moodboardStore.js` writes atomically (temp + rename) and serializes
  through `withLock(file, …)` — concurrent extract workers can’t corrupt
  the library file anymore.
- Palette extraction runs automatically: after every Pinterest import and
  on `/library` mount for pins missing a palette. New endpoint
  `/api/library/extract-missing`; `/library` shows a small animated
  "Extracting palettes…" chip while a run is in flight.
- Import message rewritten so re-imports clearly state "X new pins added.
  Y already in your library, refreshed with the latest metadata."

**Phase 2a — Smart color engine** *(next, ~6 hrs)*
- `lib/colorTheory.js` — OKLCH conversions, contrast, hue delta, harmony.
- `lib/composePalette.js` — role-aware composition: pick bg → ink → accent
  → muted in that order, with explicit contrast and hue thresholds. Spec
  lives in item #9 below.
- Wire into `usePalette`'s shuffle. Keep `sampleSpread` for the colors and
  gradients pages (no role logic needed there).
- Fall back to `sampleSpread` when the pool is too thin to compose against
  (<6 colors).

**Phase 2b — Font pairing engine** *(SHIPPED 2026-05-27)*
- **Manual picker — SHIPPED (was already built).** `TypePanel` +
  `FontPicker` search the full Google Fonts catalog (~1934 families via the
  public metadata endpoint, no key), plus upload + custom URL, applied live
  via `FontLoader`. Discoverability fixed (slots say "Choose a font," not
  "—"). So "pick any font" is done.
- **Faceted browser — SHIPPED 2026-05-27** *(commit `faa290b`)*. A "Browse
  all" surface (`components/FontBrowser.js`, portaled to body) filters the
  full catalog by facets computed server-side from Google’s own metadata:
  Style (sans/serif/slab/display/script/mono via `category`+`stroke`), Width
  (Condensed/Normal/Wide from the measured per-weight `width` metric), Weight
  (has-light/has-black), Variable-only, sorted by Popular/Trending/Newest/A–Z.
  `/api/fonts/google` now takes facet+page params. Deliberately omits
  "contrast" and "mood" — not derivable across the catalog (single thickness
  number ≠ stroke contrast; no mood signal). Those live in the pairing layer.
- **Foundry directory — SHIPPED 2026-05-27** *(commit `0f2c6bd`)*. A
  "Foundries" segment in the browser presents the curated houses from
  `/resources` + community-approved foundries (`/api/fonts/foundries`),
  link-out only with indie/premium/marketplace tier badges. The two-layer
  Type step from the resources research: live catalog + curated directory.
- **Suggestion/taste layer — SHIPPED 2026-05-27** *(commit `6b4db17`)*.
  `lib/fontPairings.js`: ~36 mood-tagged Google-Fonts pairings (display +
  text). "✦ Suggest a pairing" on the Type panel proposes one, weighted by
  the palette’s OKLCH profile (vivid → expressive moods, muted → quiet),
  lock-and-keep per slot. Relational/Fontjoy-style: locking a known face
  restricts candidates to its partners. **Whole Type step is now done.**
  - Parked next steps if revisited: more pairings; weight-axis bias (the
    pairings only carry family, not weight); a "shuffle type with palette"
    combined action; saving a pairing into a Combo/Preset (Phase 3).

**Phase 2c — Starter pool + auto-promote brand colors** *(~3 hrs)*
- **Sanzo Wada starter pool — SHIPPED.** `lib/sanzoWada.js` (vendored MIT
  source + baked artifact via `scripts/build-sanzo.mjs`). Available as the
  "Sanzo Wada (1933)" source on Brand, and an empty project auto-seeds from
  it. Still parked: a "browse named historical combinations" UI on top of
  the 228 baked 3–4 color combinations (`SANZO_COMBINATIONS`).
- When a project’s moodboard contains 5+ colors appearing in 3+ pins each,
  the tool proposes them as the project’s brand palette. One-click promote
  into `data/projects/{slug}/palette.json`.

**Phase 2d — Library auto-backup + restore-on-corruption** *(~2 hrs)*
- Versioned backups in `data/projects/{slug}/.backups/` — last 10 writes
  plus daily rollups, automatic. When `readLibrary` hits a JSON parse
  error it auto-restores from the most recent valid backup instead of
  silently returning EMPTY (which is what corrupted the file on 2026-05-25
  and made it look like the Pinterest board had vanished).

**Phase 2e — Mobile pass** *(~6 hrs)*
- Mobile’s job is *decide and consume*, not *compose*. Compose pages
  (`/brand`, `/library`, `/import`) stay desktop-first and degrade
  gracefully on phones (no broken layouts, no claims they work).
  Real mobile design goes into the Decide surface (Phase 3) and the
  hosted `/v/[token]` viewer.
- Concrete cleanups along the way: barMeta wrap at 390px (`/library`,
  `/colors` clip meta items today); strip the `globals.css` font 404s
  by removing the dead `@font-face` blocks pointing at missing files;
  TypePanel sample text and `/probe` page de-Whelm.

**Phase 3 — Combos as the sketch unit + Decide surface** *(Decide SHIPPED 2026-05-27, commit `d9e76b3`)*
- **`/decide` page — SHIPPED.** Pick up to 5 saved Brand Presets, see them
  side by side at full Brand-page fidelity (real `BrandPreview`, auto-scaled
  via `FigmaFrame`). Same wordmark; each preset brings its palette + type +
  role overrides. Dark/light toggle, union FontLoader, palette swatches named
  via Name That Color. Added as path step 05 "Compare" (home grid + PathFooter
  auto-pick-up; gradients/print renumbered 06/07). Step body copy is
  placeholder-quality — wants Lorin’s voice pass.
- **Still to do:** the `Combo` object (palette + font pair, cheaper than a full
  Preset) as a lighter sketch unit in `data/projects/{slug}/combos.json`; let
  Decide compare Combos too, not just Presets; a "Promote to preset" button on
  a Combo card. Also nice: a "★ pick this one" / commit action on a Decide
  column that loads it back into Brand.

**Phase 4 — Universal taste library** *(~5 hrs)*
- `data/library/{colors,fonts,presets}.json` (NOT pins — Pinterest is
  already that). Auto-populated from project stars — one gesture, two
  scopes. No separate "favorite" action.
- Single `/favorites` page + "Seed from favorites?" prompt on new
  project creation. No sidebars on every page.

**Phase 5 — Moodvote = "Share Decide for feedback"** *(folds into Phase 7
below)*
- Bolt the Neon-backed share flow onto Decide instead of treating it as
  a separate product mode. Phase A scope holds — collaborators vote on
  what you compose, they don’t add material.

**Phase 6 — Multi-tenant migration** *(in progress; ~70% shipped 2026-05-25)*

The shift from "Lorin’s local studio" to "a service strangers can sign
into." File-based editor stays as a fallback during the transition,
controlled by `AUTH_REQUIRED` env flag.

- **6a.0. Multi-tenant DB schema** ✅ shipped *(commit `e75ff32`)*
  Migrations folder with timestamped SQL files. `users`, `accounts`,
  `verification_token`, `projects`, `pins`, `boards`, `palettes_saved`,
  `colors_saved`, `project_palette`, `bookmarked_palettes`,
  `brand_presets`, `schema_migrations`. JWT session strategy so no
  collision with Moodvote’s existing `sessions` table.
- **6a. Auth foundation** ✅ shipped *(commit `5a87613`)*
  Auth.js v5 + Resend (magic-link) + Google OAuth. Split config:
  edge-safe `auth.config.js` for the proxy, full `auth.js` with the
  Postgres adapter for server routes. `/login` page with Google
  one-click and email magic-link. Feature-flagged via `AUTH_REQUIRED`.
- **6b.1. DB layer + whelm migrated** ✅ shipped *(commit `8f61ebc`)*
  `lib/db/{projects,library,palette}.js` mirrors the file-based API
  but takes explicit `userId`. One-time `migrate-files-to-db.mjs`
  script copies file-based projects into the DB under a placeholder
  user. Ran locally: whelm + 252 pins + 29 starred colors + project
  palette all in Neon.
- **6b.2. Dual-mode API routes** ✅ shipped *(commits `cc1308c`,
  `64c6a1e`, `f209c4b`)*
  Every read + write API route now branches on session userId. When
  authed, hits DB via `lib/db/*`. When not, hits files via the legacy
  utilities. `paletteEnricher` accepts a `writePin` callback so
  background extractors don’t have to know which backend is in use.
  Home page shows an auth bar + sign-out when signed in, plus a
  welcoming empty state for users with zero projects.
- **6b.3. Production prep** ✅ shipped *(commit `9e8e1a8`)*
  `middleware.js` → `proxy.js` (Next 16 rename). `scripts/claim-projects.mjs`
  transfers placeholder-owned projects to a real user by email — run
  once after first prod sign-in.

**Still to do in Phase 6:**

- **6c. Account-free playground** *(machinery shipped 2026-05-25,
  verified locally; not yet pushed)* — The new default landing
  experience. Visitors land in the editor with a Sample Studio
  loaded; all edits go to localStorage.
  - `lib/api/client.js` — `apiFetch()` wrapper + cached `isAuthed()`.
    Authed → real `/api/*` (DB). Signed out → persistence routes
    answered from localStorage; compute routes (extraction, fonts,
    enrichment) still hit the network.
  - `lib/storage/localStore.js` — localStorage backend mirroring the
    persistence routes (project, projects, active, library, palette
    aggregation, star, star-palette, presets, mergePins, patchPin).
    `ensureSeeded()` + `resetToSample()`.
  - `lib/sampleStudio.js` — the seed. Wordmark reads **"Your Brand"**
    (legibly a sample), placeholder tagline/body, a warm starter
    palette so Shuffle works on first visit. **Swap in Lorin’s real
    content here later** — nothing else changes.
  - `lib/storage/localImport.js` — signed-out Pinterest import:
    merge to localStorage, then client-drive palette extraction via
    the compute-only `/api/pins/extract-palette` (now accepts an
    `imageUrl` and skips the store).
  - All hooks/pages/components routed through `apiFetch`
    (useProject, useStarred, usePalette, ProjectSwitcher,
    PresetsPanel, TexturePanel, MarksFrame, every tool page).
  - Font / texture / image upload + "Share for voting" gated behind
    sign-in with quiet contextual upsells (need Blob storage / a server
    instance). Pinterest import, colors, palettes, presets, gradients,
    brand text all work signed out.
  - **SVG mark upload — now local (2026-05-27, commit `a93977d`).** Marks
    are text, so signed-out visitors store them in
    `moodbuilder.local.marks.v1` (data-URL `url`, persists across
    navigation); `/api/marks` GET/POST/DELETE route through the local
    store. Per-feature gate removed; the global "Sign in to save" in
    ProjectSwitcher is the single notice. Font/texture (binary) uploads
    are the remaining gate — next slice is an IndexedDB/Blob local store.
  - **Verified locally** (AUTH_REQUIRED=false): fresh visitor seeds
    the sample; star/preset writes persist to localStorage and the
    server file library stays untouched (isolation holds); compute
    extraction returns palettes; reset restores the seed.
  - **Sample Studio content shipped** *(2026-05-25)*: built from
    Lorin’s `pinterest.com/lorinanderberg1/moodbuilder` board (33 pins
    captured, 31 mirrored — 2 i.pinimg originals 403'd). Pipeline:
    `npm run sample <board.json>` (`scripts/build-sample-studio.mjs`)
    mirrors + downscales images into `public/sample/` (~3.1 MB, max
    1000px / q80 jpeg), extracts a palette per pin, derives a brand +
    starred + source set from the board’s colors, and bakes it into
    `lib/sampleStudio.data.json`. Re-runnable with a new board JSON.
    The "Your Brand" project template (wordmark / tagline / body) stays
    hand-authored in `lib/sampleStudio.js`. Verified: all 31 render
    from the local mirror, 0 broken; Brand page composes from the
    board’s palette.
  - **Polish pass (2026-05-25, autonomous):** independent code review
    of the whole changeset came back clean on data isolation, the
    authed/DB path, and the imageUrl skip-write trap (only low-severity
    hygiene notes: dead `resetAuthCache` export, two unused localStore
    palette exports, harmless double-run of `extractMissingLocal`).
    Removed the dead P22 Mackinac `@font-face` blocks from globals.css
    (they 404'd on every page; Fraunces is the real serif). Design
    review at 1280 + 390 fixed three responsive bugs: the home
    playground bar now stacks at ≤560px, and the `/library` + `/colors`
    header meta wraps to its own line instead of clipping.
  - **Naming decided (2026-05-25):** product is **Moodbuilder**;
    "Moodvote" is dropped entirely (the voting surface is just "Share
    for voting"). Accepted that Moodbuilder is a generic/descriptive
    name (weak trademark, fine for a free portfolio tool). No active
    commercial "Moodbuilder" in design/tech and no federal registration
    found; moodbuilder.com is a dormant 2009 portfolio (taken, so a
    moodbuilder.* domain like .app/.studio/.design is the target).
    Retired the two in-code "moodvote" references: the hosted viewer
    wordmark (`app/v/[token]/HostedBrand.js`) and the playground
    localStorage keys (`moodvote.local.*` → `moodbuilder.local.*`,
    matching the existing `moodbuilder.favorites` convention). Still
    infra-only and Lorin’s to do: rename the Vercel project / domain off
    `moodvote.vercel.app` and update `AUTH_URL`.
  - **Review round 2 (2026-05-25, Lorin eyes-on).** (1) Library header
    was overcrowded: split into a two-tier header (identity row: nav,
    title, stats; tools row: pool, filter, actions). (2) Bumped small UI
    text 13→14px (header meta, pool stat, search) and the sign-in hint
    12→13px for legibility. (3) Naming coherence: unified the favorites
    vocabulary — palettes you favorite are "Top picks" everywhere (Brand
    SOURCE "Starred"→"Top picks" via POOL_LABELS; Colors palette button
    "Save"→"Top pick"; section + empty-state copy aligned), individual
    colors stay "Starred colors"; the Brand "Top picks" pool blends
    top-pick palettes + starred colors (copy now says so). The two star
    gestures are de-conflated by label, though both still use a star
    glyph — could swap the Top-pick glyph (bookmark/check) to fully
    separate them if desired.
  - **Review round 3 (2026-05-25).** (1) Signed-out notice reworked into
    a real filled banner (warm fill, accent edge, icon, primary button).
    (2) "Sample" labeling so the seeded studio doesn’t read as a real
    brand: SAMPLE pill on the home project card + ProjectSwitcher chip,
    and a "Sample brand. Placeholder name and colors…" notice above the
    Brand preview (all signed-out only). (3) Home flow IA: gradients
    pulled out of the numbered arc into a separated "Utility" section
    below a divider, so the five-step arc ends cleanly at the brand book
    (the finished artifact). Warm "notice" colors are inline hexes for
    now; could be promoted to `--notice-*` tokens.
  - **Open (Lorin noted): home page is flat vs the tool pages.** The `/`
    project picker is boring and not very intuitive next to the visually
    strong Brand/Library/Colors pages. Deserves a deliberate redesign
    pass (hero that shows the tool working, clearer first action).
  - **Subpage sign-in affordance — shipped (2026-05-25).** Added a quiet
    "Sign in to save" link (with a status dot) next to the project name
    in `ProjectSwitcher`, shown only when signed out. Covers all five
    editing subpages (brand, colors, gradients, import, library) in one
    place; print/probe intentionally skipped. Verified at 1280 + 390;
    tap target padded for the 44px floor.
  - **Still to do before prod:** (1) push to origin/main (commit
    `public/sample/` + `lib/sampleStudio.data.json`); (2) flip
    `AUTH_REQUIRED=false` on Vercel — **with Lorin’s explicit OK**,
    since it’s the production-facing switch.
  - Known minor: import preview hint still mentions source enrichment
    (authed-only); signed-out source-URL enrichment is deferred.
- **6d. Sync-on-signin** *(~1 day)* — When a playground user signs
  in for the first time, prompt: "Save your work as a new project?"
  → migrates their localStorage state to a DB-backed project owned
  by the new user. Skip = blank account, fresh start.
- **6e. Onboarding visuals** *(~later)* — Screen recordings of each
  feature populated with real brand work. Slot into the login page
  and an "about" surface to answer "what does this do?" at the
  hero level. Recorded by Lorin.
- **6f. Stage 3-5 affordances** *(~3 days)* — "This color is the
  brand" promote. Mark upload prominence. `/decide` surface.
  "Lock identity" commit. Brand book discoverability.
- **6g. Blob storage for uploads** *(~1 day)* — `/api/library/upload`
  and `/api/marks` still file-only. Move to Vercel Blob for prod
  authed users.
- **6h. Project switcher sign-out** *(~30 min)* — Add sign-out to
  the switcher dropdown on sub-pages. Currently only home page has
  it.

**Production deploy checklist:**

1. Push `origin/main` (18 commits ahead as of 2026-05-25).
2. Set Vercel env vars (Project Settings → Environment Variables):
   - `RESEND_API_KEY` — same value as `.env.local`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — same as `.env.local`
   - `AUTH_SECRET` — generate fresh for prod: `openssl rand -base64 32`
   - `AUTH_URL` — `https://moodvote.vercel.app`
   - `AUTH_REQUIRED=true`
3. Add prod OAuth redirect URI in Google Cloud Console:
   `https://moodvote.vercel.app/api/auth/callback/google`
4. (Optional) Verify a sender domain in Resend so magic-link emails
   come from `noreply@moodvote.app` instead of `onboarding@resend.dev`.
5. Visit `moodvote.vercel.app` → redirect to `/login` → sign in.
6. Run `node scripts/claim-projects.mjs <your-email>` against the
   production Neon DB to take ownership of whelm. `.env.local` already
   points at the prod Neon since Vercel and local share the same
   database.

**Domain migration runbook — `moodvote.vercel.app` → `moodbuilder.studio`**
*(not required to ship the playground; do this as a focused pass right
before any public reveal. The app code is already brand-clean — title is
"Moodbuilder", no "moodvote" in any rendered UI. Everything below is
infra. Order matters: it keeps sign-in working through the cutover.)*

1. **Register the domain.** Confirm `moodbuilder.studio` is available and
   buy it (Porkbun / Namecheap). Grab `@moodbuilderstudio` handles while
   you’re at it (bare `@moodbuilder` is taken by a dormant squatter).
2. **Add the domain in Vercel** → Project → Settings → Domains → add
   `moodbuilder.studio`, set it as the Production domain. Vercel shows the
   DNS records to set at the registrar; wait for it to verify.
3. **Google Cloud Console (don’t remove the old URI yet):**
   - APIs & Services → Credentials → the OAuth client → Authorized
     redirect URIs → **add** `https://moodbuilder.studio/api/auth/callback/google`
     (leave the moodvote one in place for now).
   - OAuth consent screen → set **App name** to "Moodbuilder" (this is
     what users see during Google sign-in — easy to miss if it still says
     Moodvote). Add `moodbuilder.studio` to Authorized domains.
4. **Update Vercel env** → set `AUTH_URL=https://moodbuilder.studio`
   (Production), then **redeploy** (env changes only take effect on a new
   deploy). This is the var that otherwise bounces sign-in to moodvote.
5. **Verify on the new domain:** load `moodbuilder.studio`, test Google
   sign-in and a magic-link sign-in end to end. (Sessions don’t carry
   over from the old domain — cookies are domain-scoped — so you’ll
   re-login. Expected.)
6. **Retire the old subdomain:** Vercel → Settings → General → rename the
   project so the default becomes `moodbuilder.vercel.app`;
   `moodvote.vercel.app` stops resolving. (Safe now that `AUTH_URL` points
   at the custom domain, not the subdomain.)
7. **Resend (optional but on-brand):** verify `moodbuilder.studio` as a
   sender domain and set the from-name/address to Moodbuilder (e.g.
   `noreply@moodbuilder.studio`) so magic-link emails aren’t generic.
8. **Cleanup:** once nothing hits the old URL, remove the
   `moodvote.vercel.app` redirect URI from the Google OAuth client.

Gotcha checklist: `AUTH_SECRET` stays the same; `AUTH_URL` must exactly
match the domain users land on; a redeploy is required after any env
change; renaming the Vercel project changes the `.vercel.app` subdomain,
so only rename *after* `AUTH_URL` is on the custom domain (step 4 before
step 6).

**Deferred to a polish pass** *(later, ~3 hrs together)*
- New-project-from-Pinterest-board entry point.
- Pre-named saved Combos / Presets ("Bordeaux Editorial 1").
- Re-extract failed pins on next library load.
- Auto-archive current Preset on Share for voting.

---

## Historical roadmap *(kept for reference; mostly superseded)*

1. **Per-project marks** *(45 min)* ✅ shipped 2026-05-14
   Marks moved under `public/projects/{slug}/marks/`. Drop zone +
   per-mark delete inside `MarksFrame`. New projects start empty.

2. **Project switcher chip on sub-pages** *(20 min)*
   Small `<project name> ▾` next to the page title in `/brand`,
   `/library`, `/colors`, `/gradients`, `/import`, `/print`. Click →
   dropdown of projects → PUT `/api/projects/active`.

3. **Project-scoped saved palettes** *(10 min)*
   Change the favorites localStorage key to include the active slug.
   `useEffect` resets favorites state when active slug changes.

4. **Font pairing** *(1.5 hrs)*
   Brand page rail gets a Type section under Roles. Display slot + Body
   slot. Each slot: Google Fonts search (paginated by family), Fontshare
   (catalog API), local upload (`FontFace` API), custom URL. Saved Brand
   Presets capture fonts + palette together.

5. **Texture** *(unscoped, ~2-3 hrs)*
   New identity dimension alongside palette + type + marks. Paper grain,
   noise, halftone, gradients-as-surface. Per-variant texture override
   like the role panel. Saved Brand Presets capture texture too.
   Open: do textures live as files in `public/projects/{slug}/textures/`
   (parallel to marks), or as CSS/SVG-generated effects with parameters?

6. **Brand Presets as savable objects** *(precondition for voting)*
   Today `★ Save` captures only the palette. A Brand Preset would
   capture palette + role overrides + per-variant overrides + fonts +
   textures + marks selection + project text. One favorite = one
   whole identity snapshot. JSON shape already exists in
   `lib/exportFormats.js`; the UI is what’s missing.
   Open: replace `★ Save`, or live alongside as `Save preset`?

7. **Collaborative Brand Studio + voting — "Moodvote"** *(major, ~20–30 hrs)*

   Vision: collaborators don’t just vote on your options, they *use the
   tool* — compose their own Brand Presets from your library and material,
   contribute them to the pool, and everyone votes together. The audience
   genuinely co-designs.

   **Locked decisions** *(resolved 2026-05-14):*
   - Deploy: Vercel.
   - Database: Neon Postgres via Vercel Marketplace.
   - Auth: unguessable invite-token URLs (no email infra). Session is a
     display name + browser cookie.
   - Public brand: **Moodvote**. Repo stays `moodbuilder`. Domain temp on
     `*.vercel.app` until first real share.
   - Phase A scope: collaborators can build presets and vote, but library
     / marks / pins are read-only for them. Owner sets the stage; the
     crowd composes within it.
   - Once a project is "Opened for collaboration," the hosted Neon copy
     is the live source of truth. Owner edits in the browser like
     collaborators (with owner privileges). Local Moodbuilder becomes the
     pre-launch workshop.

   **Schema (Neon, raw SQL via `@neondatabase/serverless`):**
   - `instances` — id, slug, owner_key, audience (`public`|`private`),
     vote_unit (`preset`|`element`), project_state (jsonb — library,
     palettes, fonts, marks, copy), created_at
   - `invites` — instance_id, token, label, claimed_session_id
   - `sessions` — id, instance_id, display_name, created_at
   - `presets` — id, instance_id, author_session_id, snapshot (jsonb),
     created_at
   - `votes` — instance_id, session_id, target_type
     (`preset`|`palette`|`font`|`mark`), target_id, value, created_at
   - `comments` — instance_id, session_id, target_type, target_id, body

   **Build sequencing:**
   1. Foundation — Vercel project, Neon Marketplace install, env wiring,
      schema migration, deploy a hello page. *(~2 hrs)*
   2. "Open for collaboration" — local editor calls hosted API; project
      state seeds into an `instances` row; owner_key cookie set;
      shareable URL returned. *(~2 hrs)*
   3. Hosted Brand page — read instance state from Neon, render Brand
      page in browser as it works today, no preset saving yet. *(~5 hrs)*
   4. Preset contribution — display-name prompt, session cookie, save
      preset attributed to author, preset pool visible to all. *(~3 hrs)*
   5. Preset-unit voting — vote cards, optimistic UI, vote totals.
      *(~2 hrs)*
   6. Element-unit voting — palette / fonts / marks as independent
      voteable targets. *(~3 hrs)*
   7. Owner results view — aggregates, top picks, comments thread.
      *(~3 hrs)*
   8. Private mode + invites — invite generator in owner UI; invite-claim
      flow on first visit. *(~2 hrs)*

   **Phase B (later, separate project):** collaborators can add pins,
   upload marks, edit palette. Real multiplayer library. Probably needs
   real accounts and presence by then.

8. **Figma plugin scaffold** *(separate small project, 1-2 days)*
   `npx create-figma-plugin` boilerplate. Reads from the local
   Moodbuilder server (or a deployed instance) and writes Figma
   Variables + text styles. Publish to Figma community.

9. **Smart color engine — replace shuffle with role-aware composition**
   *(real work, ~6–8 hrs)*

   Today’s shuffle samples N colors from the pool and maps roles by
   luminance only: darkest → bg, lightest → ink, most-saturated mid →
   accent, middle mid → muted. This produces *random* palettes that
   often land where accent is barely distinguishable from ink, or where
   the wordmark color clashes with the bg at a contrast level that
   would fail WCAG. The result is a shuffle button that looks decisive
   but produces lots of unusable palettes the user shrugs past.

   The upgrade: a *composition engine* that knows what each role wants
   and picks colors to serve those roles, not the other way around.

   - **Background.** Pick first. Determines whether the palette runs
     dark-mode or light-mode. Should have enough chroma headroom that
     accent + muted can both sit on it at ≥4.5:1.
   - **Ink (main text).** Picked next, with explicit contrast budget vs
     bg (4.5:1 minimum, 7:1 preferred). Prefer near-neutral or slightly
     tinted; saturation here fights the wordmark.
   - **Accent.** The pop. Picked to be *visually distinct* from ink in
     hue (≥40° apart on the color wheel) and to maintain ≥3:1 contrast
     vs bg so it reads as a period or punctuation mark. Saturation
     matters more here than luminance.
   - **Muted.** The italic / secondary text role. Picked for ≥3:1
     contrast vs bg, lower saturation than accent, and far enough from
     ink in luminance to feel like a different voice but close enough
     in hue to feel related.
   - **Relationships.** Optionally constrain the whole palette to a
     known harmony — complementary (accent at 180° from ink),
     analogous (within 30°), triadic (120° apart). Or freeform when the
     pool is varied.

   This turns shuffle into a smart engine: the user shuffles and gets
   a usable identity, not a random one. The seed pool still constrains
   what colors exist; the engine just composes them with role
   awareness.

   **Touches both surfaces:** the local `/brand` engine (`usePalette` +
   `mapRoles` in `BrandPreview.js`) and the eventual hosted shuffle
   for Moodvote collaborators (Phase 3b). Build once, share the
   library.

   **Library:** `lib/colorTheory.js` — pure functions for
   `oklchFromHex`, `hueDeltaDeg`, `contrastRatio`, `pickAccent`,
   `pickMuted`, `composePalette({pool, size, harmony})`. Existing
   `mapRoles` becomes the consumer of `composePalette` rather than a
   post-hoc sorter.

   **Research done (2026-05-16):** Sanzo Wada dataset is MIT-licensed
   and shippable (159 colors, 348 historical combinations); OKLCH is
   the right color space; cultural register belongs as a filter, not a
   generator. Full synthesis at
   `~/.claude/projects/.../memory/project_color_theory_research.md`.

---

## Open product questions

- **Name collision: "Moodbuilder" already exists.**
  Friends of Motion has a project page at
  `https://www.friendsofmotion.com/projects` using the name. Worth a
  rename before any public sharing. Candidates Lorin floated:
  *Moody*, *Moodvote*, *Moodshuffle*. Not blocking local use; revisit
  before #7 (crowd voting) or any public publish.

- **Brand Presets as savable objects.** Right now ★ Save captures only
  the palette. A Brand Preset would capture palette + role overrides +
  variant role overrides + fonts (when built) + project text. One
  favorite = a whole identity snapshot. Should it replace the existing
  ★ Save, or live alongside as a separate "Save preset" action?

- **Image archive.** Pinterest images stream from `i.pinimg.com` URLs.
  If Pinterest deletes a pin, the library shows a broken thumbnail.
  Should there be a "Mirror to disk" option that downloads pin
  originals to `public/projects/{slug}/mirrored/`? Heavy disk cost,
  but bulletproof. Probably not urgent.

- **Project delete / archive.** No way to delete a project today (other
  than `rm -rf data/projects/{slug}`). Likely needed before publishing.

- **Bookmarklet versioning.** When Pinterest changes their DOM, the
  bookmarklet breaks. Versioning the bookmarklet URL + a "check for
  updates" link on `/import` would help. Not urgent until something
  actually breaks.

- **Inspiration sources beyond Pinterest.** The pipeline is now
  source-agnostic: `lib/importCommit.js` holds the shared merge +
  palette-extraction tail (`resolveLibraryWriter` + `kickPaletteExtraction`),
  and a source is an adapter in `lib/sources/` that normalizes to the pin
  shape. Adding one is an adapter + a thin route, not a fork.
  - **Are.na — SHIPPED.** `lib/sources/arena.js` + `/api/import/arena` +
    the Are.na tab on `/import`. Server-side for authed, direct browser
    fetch for the signed-out playground (open CORS).
  - **Cosmos (cosmos.so) — possible, fragile.** No public API; would need
    the same bookmarklet-capture pattern as Pinterest and inherits its
    breakage risk. Also can’t be tested without an account.
  - **Behance — hardest.** Adobe closed its public API to new keys years
    ago; scraping is ToS-risky and brittle. Lowest priority.
  - **Rule going forward:** only build adapters against sources with a
    free/public read path we can actually test. No blind adapters (Savee,
    etc. deferred until testable).

---

## Resources & competitive map *(from Lorin’s bookmarks, 2026-05-26)*

Parsed 409 bookmarks by content (folders were unreliable — Klim was filed
under "Shopping list," 176 links sat in an unnamed root bucket). The signal,
and what it means for the build.

### The Type step is really two layers
Lorin collects **independent and premium foundries**, almost none on Google
Fonts. So the Type step can’t be only a Google Fonts search box — that’s not
where her taste lives. It’s:
1. A curated **foundry directory** (discover + link out — how designers
   actually find type), and
2. **Google Fonts** breadth for what loads live, sorted by designer facets
   (serif/sans, weight, contrast, width, mood).

Foundries from her bookmarks, ready to seed the directory:
- *Indie / open-source:* Lost Type Co-op, Open Foundry, The League of
  Moveable Type, Collletttivo, Tunera, Warsaw Types (kroje), Republish,
  Typothèque ESA, Death of Typography, ANRT, Type With Pride.
- *Premium / taste references:* Klim, Good Type Foundry (Adieu), TIGHTYPE,
  GT, Fontspring, Creative Market.

### Competitive map (the "tools like this" lens)
- **Fontjoy** — one-click font pairings. Direct prior art for the pairing
  suggestion layer (Phase 2b). Differentiate: it pairs algorithmically from
  nothing; we pair from the user’s *collected* type taste.
- **Huemint**, **EnigmaEasel** — AI palette generators. Same contrast:
  they generate; we synthesize from what the user already loves. Confirms
  the wedge is defensible — nobody’s doing taste-driven synthesis.
- **Font Brief** — font discovery by attributes. Study its facet schema
  before building the faceted browser.
- **learnui.design** — accessible-contrast tool, same space as the AA
  readout already shipped on Brand.

### Buildable gems
- **Name That Color** (chir.ag/ntc) — names any hex ("Burnt Sienna"). Tiny
  integration; every swatch could carry a human name. Delightful, on-brand.
- **Sanzo Wada** — bookmarked twice, independently validating the starter
  pool already shipped.
- Mesh-gradient generators (meshgradient, magicpattern, colorffy, noise &
  gradient) — could feed the Surface/Gradients step.

### `/resources` — a curated directory surface *(building now)*
Lorin wants a home for the resources she tracks, **especially accessibility
references for web design**. Built data-driven from `data/resources.json`
(category → items), categories: Type foundries, Color tools, Inspiration,
Accessibility, Similar tools. Side utility, not a path step. Seeded from the
bookmarks above plus canonical a11y references; designed to grow as she
curates. Foundry entries double as the Type-step directory source later.

---

## Useful pointers

- All swatches reuse the `Swatch` component in `/colors/page.js` for
  click-to-copy + star toggle. Same component is used for inspiration
  grid (retired), brand row, curated rows, and moodboard pool.
- Role mapping logic is duplicated in `BrandPreview.js`, `brand/page.js`,
  and `print/page.js`. Worth extracting to `lib/derivePreviewRoles.js`
  if it grows further.
- The `usePalette` hook merges static `POOLS` with two dynamic pools
  (moodboard, starred) hydrated from `/api/library/palette`. When adding
  a 3rd dynamic source (e.g., per-project favorites), follow the same
  pattern.
- Pin import flow: bookmarklet → JSON download → drop on `/import` → POST
  to `/api/import/pinterest` → background enrichment fetches each pin’s
  source URL with concurrency 6 → library updates incrementally (refresh
  to see new source badges).
