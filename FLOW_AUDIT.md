# Flow audit — every surface, what it's for, keep/simplify/cut

Date: 2026-06-09. Branch: v2. Author: Claude + Lorin.

**Why this exists:** to see the whole flow at once and cut to the simplest version
where every step earns its place and nothing is a duplicate or an orphan. Grounded in
the code (what is real), cross-checked against the `project_product_direction` memory
(what is validated). Where the two disagree, that gap is itself a finding.

**This supersedes** the "journey" and step-by-step inventory framing in NEXT.md and
VISION.md. Once Lorin signs off on the verdicts below, those stale sections get
trimmed (the one-in, one-out).

## How to read each entry

- **Evidence** is the honest status: *validated* (Lorin dogfooded it and it landed),
  *built-untested*, *speculative* (built from spec, never confirmed as a need),
  *orphaned* (wired to nothing or only reachable by legacy nav).
- **Verdict** is a call, not a survey: KEEP / SIMPLIFY / MERGE / CUT / DEFER, with a
  one-line why. The genuinely-Lorin's-to-decide ones are marked **(your call)**.
- **North-star** = which stated principle it serves: overwhelm→relief, you-stay-the-
  author, mess→order, recognition-not-articulation, connected-to-source. "None" is a
  cut signal.

---

## The proposed spine (the frame for every verdict)

> **Inspiration → Direction → Brand**

Three nouns. Everything you gather is your **inspiration**. You narrow it into a
**direction** (the through-line artifact, the protagonist). A direction composes into
a **brand**. The four things you *do* (gather, organize, narrow, compose) are the
verbs over those nouns, not extra objects to memorize.

Everything below is judged against: does it serve that spine, and does it add a word a
new user has to learn?

---

# GATHER — get inspiration in, react, pull what resonates

### 1. Import  (`/import`)
- **Does / why:** brings pins in from Pinterest (bookmarklet → JSON) and Are.na
  (paste a channel). The front door; the Pinterest origin is the reason the tool exists.
- **Interaction:** install bookmarklet → capture a board → drop the JSON; or paste an
  Are.na link. Commits to localStorage (signed out) or DB (signed in).
- **Evidence:** validated (the origin job). Live, linked from home, `/library`, `/colors`.
- **Overlaps:** none for ingestion. `/library` is a *view* of the same data, not a second importer.
- **North-star:** connected-to-source. Strong.
- **Verdict:** **KEEP.** The one true front door. Only nit: it's a multi-step bookmarklet
  dance; smoothing that is later polish, not now.

### 2. Gather: Color  (`/recognize`, H1 "Gather")
- **Does / why:** react to each pin (YES/Sure/Maybe/Meh/Nope), the colors of what you
  keep collect on the right, you put the direction in *your own words*, then "Make a
  moodboard" auto-sorts it onto your board. The eyedropper lets you hand-pick a pin's colors.
- **Interaction:** react in any order (whole field visible), tune colors per pin, write
  the "why," make the moodboard → lands on `/moodboard`.
- **Evidence:** **validated and loved** (the react loop narrows; "saw it organized FOR
  me" relief; the reflective question honors cultivate-don't-supply). This is the part
  Lorin explicitly said she likes.
- **Overlaps:** color curation also happens on `/colors` (star palettes) and on the
  board (swatches). The reflective "in your own words" overlaps the "why" on DirectionCard.
- **North-star:** recognition, author, overwhelm→relief. Core.
- **Verdict:** **KEEP, it's the heart of Gather.** Resolve the color-curation overlap by
  making this the *one* place color gets curated from pins (see `/colors`, item 30).

### 3. Gather: Type  (`/type`)
- **Does / why:** browse Google Fonts + Fontshare + bring-your-own, see faces live in
  your brand name, keep faces or curated pairings, add them to the board's Type zone.
- **Interaction:** type your name → browse single faces or 46 ranked pairings → Keep →
  "Add N to your board."
- **Evidence:** built-untested as part of the validated spine (the react-color loop is
  what's validated; type-gathering is built but less dogfooded).
- **Overlaps:** **two type UIs** — this full browser AND `TypePanel` on `/brand` (a
  three-slot picker). They draw from the same `fontPairings.js`.
- **North-star:** author, connected-to-source (free type, no paid plugin). Fits.
- **Verdict:** **KEEP, consolidate the two type UIs.** Decide one home for choosing type.
  My lean: gather/browse type here; on Compose just *show* the chosen faces, don't run a
  second picker.

---

# ORGANIZE — the board, where mess resolves to order

### 4. The board surface  (`/moodboard`)
- **Does / why:** the freeform spatial canvas your curation lands on and you arrange.
  Absolute-positioned blocks, scroll, undo/redo, autosave, multiple boards per project.
- **Evidence:** validated (the auto-sorted landing is the relief moment).
- **North-star:** author, mess→order. Core surface.
- **Verdict:** **KEEP.** This is the Organize stage and the home of the Direction. It is
  also where the mess ⇄ tidy toggle (the new idea) should live.
- **Naming:** "moodboard / board / canvas / direction" are four words for this. Collapse:
  the surface is your **board**; a board heading toward identity is a **direction**.

### 5. The pile  (new, `components/canvas/Pile.js`)
- **Does / why:** your imported pins as a tactile, hand-tossed stack you rifle and pull
  from onto the board. Built this session.
- **Evidence:** *feeling* validated (the `/spike` "you nailed it"); integration built
  today, not yet dogfooded in the real flow.
- **Overlaps:** the old `PinTray`/`well`/`sources` (same job, four names); the
  `/recognize` pull (both = "pull what resonates").
- **North-star:** overwhelm→relief, author, mess→order. Strong.
- **Verdict:** **KEEP, and make it the *mess view* of one board, not a separate noun.**
  Per the agreed direction: pile (mess) ⇄ tidy (neat per-dimension lanes) as two views of
  the same material, toggled and reversible, your arrangement preserved. This *absorbs*
  the auto-sort zones (item 6) into a gesture instead of a one-time event.

### 6. Auto-sort into zones  (`makeDirection.js` → Color / Imagery / Type zones)
- **Does / why:** when you "make a moodboard," your kept colors/images/type land
  pre-sorted into labeled zones. The validated "organized FOR me" relief.
- **Evidence:** validated.
- **Overlaps:** this *is* the "tidy view" the mess⇄tidy idea proposes, done once upstream
  instead of as a reversible toggle.
- **North-star:** overwhelm→relief. Core.
- **Verdict:** **MERGE into the mess ⇄ tidy toggle.** Keep the relief; promote it from a
  one-time auto-sort to a state you can flip to and back from on the board.

### 7. Block types: image / swatch / text / shape
- **Does / why:** the things you place on a board. Image (a pin), swatch (a color), text,
  shape (rect/line).
- **Evidence:** image + swatch validated (they carry the direction); text + shape
  built-untested (collage extras).
- **North-star:** author. Fits.
- **Verdict:** **KEEP image + swatch; KEEP text + shape as quiet collage extras.** No new
  vocabulary cost (a user sees "add a color," not "swatch block").

### 8. Per-image finishes  (Riso / grain / duotone / halftone)
- **Does / why:** apply a printed-texture finish per image on the board.
- **Evidence:** speculative. Built per the "texture is a finish" decision, never confirmed
  as a need in dogfooding. The validated grain is the *pile's* tactile feel, not a per-image control.
- **Overlaps:** `TexturePanel` on `/brand` (item 21) is another texture surface.
- **North-star:** weak. It's a finish on a divergent-stage reference, where the memory
  says references should read *true*.
- **Verdict:** **DEFER (your call).** Pull it out of the first-run board to reduce control
  clutter; the warm grain already lives in the pile's design language. Revisit if you miss it.

### 9. Crop  (focal / zoom on image blocks)
- **Does / why:** reframe a pin on the board.
- **Evidence:** built-untested.
- **North-star:** author. Mild.
- **Verdict:** **KEEP, low priority.** Useful, not load-bearing, no vocabulary cost.

### 10. Sections  (hand-framed clusters)
- **Does / why:** draw a labeled frame around blocks to make your own cluster. Membership
  is spatial (computed, never moves your blocks).
- **Evidence:** the *auto* zones are validated; the manual "add a section" is the trimmed
  remainder after Lorin cut the "Affinity starter" button.
- **Overlaps:** with zones (item 6) — both are "labeled regions."
- **North-star:** author. Fits.
- **Verdict:** **KEEP as one quiet "frame a cluster" affordance; unify with zones** so
  there's one concept of "a labeled region," not two.

### 11. Comment pins
- **Does / why:** Figma-style numbered pins droppable anywhere, each a short thread;
  share-ready (the seed of the client-comment layer).
- **Evidence:** validated as the chosen annotation primitive (Lorin picked pins over
  per-item notes).
- **North-star:** author, co-design. Fits.
- **Verdict:** **KEEP.** Earns its place; same primitive serves private notes now and
  client comments later.

### 12. The well / atoms  (cross-project saved references)
- **Does / why:** a tenant-level store of tagged references (image crops, colors, type)
  pulled from any board, meant to persist across projects.
- **Evidence:** **orphaned / half-built.** `atoms.js` builders are wired; `atomsStore.js`
  is callable; but there's no real well UI and the pull-to-well-from-source path was just
  removed when the pile replaced the tray. No validation it's a need.
- **Overlaps:** "well / atoms / library / sources" — the worst of the vocabulary pile-up.
- **North-star:** maps loosely to "my resource bundle," but that want is better served by
  the per-project inspiration than a separate cross-project atom store.
- **Verdict:** **CUT the user-facing "well" and "atom" words; shelve the cross-project
  store (your call).** It's a whole vocabulary for an unvalidated capability. Keep the
  board→reference *pull* gesture if useful, but drop "atom/well" as concepts a user meets.

### 13. WellTray / pull-to-well
- **Does / why:** the panel that shows the atoms well; the tag-and-save flow.
- **Evidence:** orphaned (depends on item 12).
- **Verdict:** **CUT with item 12.** Folds away when the well is shelved.

---

# NARROW — pull a few directions out of everything

### 14. Carve  (split-view: everything board → a new direction board)
- **Does / why:** side-by-side, drag pieces from your master board onto a fresh
  "direction" board (copies, never moves). The funnel's "one master → a few directions."
- **Evidence:** built-untested. The *concept* (carve a direction) is validated as needed;
  the split-view interaction itself hasn't been confirmed as the right gesture.
- **Overlaps:** conceptually with the pile-pull (both are "pull onto a board").
- **North-star:** overwhelm→relief (a few directions out of the pile), author. Fits.
- **Verdict:** **KEEP the act, re-examine the gesture.** With mess⇄tidy on the board, ask
  whether "narrow" is its own split-view mode or just "make a new board and pull onto it"
  using the same pile gesture. Lean: reuse the pile gesture, drop the bespoke split-view.

---

# COMPOSE — make the brand  (`/brand`)

> Confirmed overcrowded: a 10-button toolbar plus a rail stacking DirectionCard, Roles,
> Legibility, Type, Texture, Presets, Slots, Saved palettes, then two previews and Marks,
> plus four modals. This is the "9-panel dump." The V2 plan is to rebuild it. The audit
> below is the cut list for that rebuild.

### 15. DirectionCard  (the artifact lead)
- **Does / why:** names the direction, holds the "why" in your words, shows provenance +
  a fill readout. The protagonist made visible.
- **Evidence:** validated direction (V2 thesis); built slice 1.
- **Verdict:** **KEEP, make it travel.** This should lead Compose *and* appear on the
  board, filling across stages. The heart of "intuitive flow."

### 16. Palette shuffle + pools + Source selector
- **Does / why:** shuffle a role-aware palette from a source pool; a Source dropdown picks
  among six pools (board / starred / moodboard / brand / curated / sanzo).
- **Evidence:** shuffle validated as a power-tool; the *six pools + Source selector* are
  engineer-facing and were the cause of "a carved direction didn't feed the shuffle."
- **Overlaps:** three of the pools (starred, moodboard, board) are three different "your
  colors" — the same overlap as `/colors` vs `/recognize` vs board.
- **North-star:** shuffle = author's power-tool (good); the pool selector = app-machinery (off).
- **Verdict:** **SIMPLIFY hard.** Compose from your *direction* by default, silently. Hide
  the pool abstraction; "shuffle from a different source" becomes one advanced toggle, not
  a dropdown of six engine terms.

### 17. Slots  (2–10 palette size)
- **Verdict:** **KEEP, de-emphasize.** A useful dial; doesn't need toolbar prominence.

### 18. Roles panel + Floating role picker  (assign bg/ink/accent/muted)
- **Does / why:** assign which color plays which role, per dark/light variant. Two ways to
  do it: a grid panel in the rail AND click-an-element-on-the-preview.
- **Evidence:** built-untested. The memory says functional roles belong to compose (right
  stage) but this is *two* mechanisms for one job.
- **Overlaps:** RolesPanel grid vs FloatingRolePicker (click on preview) = redundant.
- **Verdict:** **SIMPLIFY to one: click the element on the preview to recolor it.** Drop
  the separate RolesPanel grid. Direct manipulation on the thing you see beats a parallel grid.

### 19. Legibility / contrast readout
- **Does / why:** plain-language WCAG AA check of text/accent against background.
- **Evidence:** built-untested, but genuinely useful and on-values (accessible by default).
- **Verdict:** **KEEP, fold into the preview.** Show it with the previews, not as a separate panel.

### 20. TypePanel  (on `/brand`)
- **Overlaps:** the `/type` browser (item 3).
- **Verdict:** **MERGE with item 3.** One place to choose type; Compose displays it.

### 21. TexturePanel  (on `/brand`)
- **Evidence:** speculative (textures deferred per memory).
- **Overlaps:** per-image finishes (item 8).
- **Verdict:** **DEFER (your call).** Off the first rebuild of Compose.

### 22. Presets vs Saved palettes  (two save systems)
- **Does / why:** PresetsPanel saves a *full brand* (palette+type+texture); "Saved
  palettes" (favorites) saves *colors only*. Both in the rail.
- **Evidence:** built-untested; the split confuses (two "save" buttons doing different things).
- **Verdict:** **MERGE into one "save this direction."** One save concept. If colors-only
  is ever needed, it's a facet of the same saved thing, not a parallel system.

### 23. MarksFrame  (logo marks)
- **Does / why:** add/recolor SVG marks (logos).
- **Evidence:** speculative + incomplete (overrides not even persisted to DB).
- **North-star:** marks are a real identity dimension, but underbuilt and unvalidated.
- **Verdict:** **DEFER (your call).** Off the Compose rebuild until there's a validated need
  (and the named "generate lettermark from the name" idea is the better future entry).

### 24. BrandPreview, dark + light  (the two hero previews)
- **Does / why:** see your identity composed, full fidelity, both variants, with inline
  text + recolor editing.
- **Evidence:** validated (this *is* Compose's payoff).
- **Verdict:** **KEEP — this is the core of Compose.** Almost everything else in the rail
  is scaffolding around this.

### 25. Export modal  (6 formats: CSS, Figma vars, Tailwind, hex, preset, PDF)
- **Evidence:** speculative breadth. The memory: Figma export = *tokens*, and it's
  *deferred until after the Compose redesign*. Six formats is premature richness.
- **Overlaps:** PDF here duplicates `/print`'s download; "preset" duplicates item 22.
- **Verdict:** **SIMPLIFY to the validated deliverable.** Keep the brand-book/PDF path
  (item 28) and a token export when Compose is stable. Cut the long format list for now.

### 26. Share for voting
- **Does / why:** publish the brand to a share link for collaborators to react/vote.
- **Evidence:** the *async share-for-feedback* job is validated as core (Whelm: "bring to
  my team to vote"); the implementation is built-untested and wired to brand *presets*, not
  *directions* (a flagged gap).
- **North-star:** co-design, done-state. Core job.
- **Verdict:** **KEEP the job, re-aim it at the *direction*,** not a brand preset. Likely
  belongs to the Direction artifact, so it travels.

---

# DECIDE / DELIVER — the post-compose tail

### 27. Decide  (`/decide`, compare)
- **Does / why:** compare presets/palettes side by side.
- **Evidence:** built-untested; reachable only via the *legacy* PathFooter, not StageNav.
- **North-star:** the memory says "decide is a moment *inside* Compose, not its own stage."
- **Verdict:** **MERGE into Compose.** Comparing variants is a Compose gesture, not a room.

### 28. Brand book / print  (`/print`, PDF export)
- **Does / why:** a 5-page printable/PDF brand book. The tangible deliverable.
- **Evidence:** the *tangible export* job is validated as the endpoint; the page is
  built-untested and reachable via legacy nav.
- **North-star:** tangible, done-state. Core job.
- **Verdict:** **KEEP as *the* deliver endpoint, downstream of Compose.** This is where
  "export broadly" lives. Re-home it under the new nav (it's currently orphaned to PathFooter).

### 29. Gradients  (`/gradients`)
- **Does / why:** a standalone gradient builder from the color pool.
- **Evidence:** speculative; legacy-nav only; not in any validated job.
- **North-star:** none stated.
- **Verdict:** **CUT as a standalone route (your call).** If gradients matter, they're a
  facet of compose/export, not a room of their own.

### 30. Colors  (`/colors`, rate palettes + save colors)
- **Does / why:** star palettes to mark "top picks" (trains the shuffle's "starred" pool),
  save individual hexes, browse extracted palettes.
- **Evidence:** built-untested; legacy-nav only. The "rate palettes to *train* the shuffle"
  framing is app-centric and rubs against "I don't need the machine to tell me my taste."
- **Overlaps:** **heavy** — it's a third color-curation surface (after `/recognize` and the
  board) and the source of the hidden "starred" default pool on Compose.
- **North-star:** weak; the "train the engine" framing is off-thesis.
- **Verdict:** **MERGE into `/recognize` + the board (your call).** Color gets curated where
  you react to pins and on your board; a separate rate-to-train room is the redundancy to cut.
  This also removes Compose's hidden dependency on having visited `/colors`.

---

# REFERENCE / SIDE — not on the spine

### 31. Library  (`/library`, inventory + extraction)
- **Does / why:** grid of all your pins; runs palette extraction (auto + manual); upload;
  star.
- **Evidence:** validated as the inventory; the *manual extraction chore* is plumbing
  surfaced as a task.
- **Overlaps:** the pile (both show your pins); extraction overlaps the background job.
- **Verdict:** **MERGE the inventory into "your inspiration" (the pile/board source);
  make extraction fully automatic** so it's never a user chore. "Library" stops being a word.

### 32. Resources  (`/resources`, public toolbox)
- **Does / why:** a curated directory of foundries, color tools, accessibility refs.
- **Evidence:** built; it's a public reference page, NOT your private bookmark store (the
  job-#2 gap the memory flags).
- **North-star:** the "one place for my links" want — but unfilled (this is public, not yours).
- **Verdict:** **KEEP as a side utility, off the core spine.** Don't let it borrow the word
  "library." The real job-#2 (your private inspiration inbox) is a separate future build.

---

# NAVIGATION — the structural finding

### 33. StageNav vs PathFooter + `lib/steps.js`  (two nav systems)
- **What:** `StageNav` = the new Gather→Organize→Narrow→Compose stepper. `PathFooter` +
  `lib/steps.js` = the *old* 7-step path (Curate/Blend/Compare/Deliver) that still renders
  on the home page and stitches `/colors`, `/gradients`, `/decide`, `/print` together with
  prev/next arrows.
- **Evidence:** the old path directly contradicts the locked "no segmented pipeline" rule.
- **Verdict:** **CUT PathFooter + `lib/steps.js`.** One nav: the stages. The orphan routes
  it links each get a verdict above (merge or cut). This is the single highest-leverage
  simplification: it removes a whole parallel mental model.

---

# PLUMBING — audit lightly (not user vocabulary)

### 34. Storage, project model, palette extraction
- **3 backends:** DB (authed), localStorage (signed-out), and a legacy file backend the
  memory says to retire. **Verdict: collapse to 2** (DB + localStorage), retire the file path.
- **`paletteStore.js` (`palette.json`):** flagged as possibly orphaned (no route imports it).
  **Verdict: confirm and delete if dead.**
- **Palette extraction (`paletteEnricher`):** keep, but make it fully background so it never
  surfaces as a manual "Extract" chore (see item 31).
- **Project / boards models:** keep; sound.

---

# Overlap map (where the duplication actually is)

1. **"Your inspiration" has ~6 names:** well, pile, library, sources, tray, atoms. → one
   word ("inspiration"), pile = its mess view, library folds in, well/atoms/tray/sources cut.
2. **Color gets curated in 3 places:** `/recognize`, `/colors`, the board. → one place
   (`/recognize` + board); cut `/colors`.
3. **Compose has 3 color "pools" that are all "your colors":** starred, moodboard, board. →
   compose from the direction; hide the pool machinery.
4. **Two type pickers:** `/type` browser and `/brand` TypePanel. → one.
5. **Two ways to assign roles:** RolesPanel grid and click-on-preview. → click-on-preview.
6. **Two save systems on Compose:** Presets (full brand) and Saved palettes (colors). → one.
7. **Two texture surfaces:** per-image finishes and TexturePanel. → defer both for now.
8. **Two export paths to PDF:** Export modal and `/print`. → one deliver endpoint.
9. **Two navigation systems:** StageNav and PathFooter/steps.js. → StageNav only.
10. **Two "labeled region" concepts:** auto zones and manual sections. → one.

# Proposed minimal flow (the synthesis)

Everything validated, nothing orphaned, the spine in three nouns:

1. **Inspiration in** — Import. Pins land; palettes extract silently.
2. **Gather** — react to your inspiration, pull what resonates, colors collect, say the
   "why" in your words. (Absorbs `/colors`. Type gathered here too.)
3. **Organize** — your board, with the **mess ⇄ tidy** toggle: rifle the pile, pull onto
   the board, flip to neat per-dimension lanes and back, never losing your arrangement.
   Annotate with comment pins. (Absorbs auto-zones, sections, library inventory.)
4. **Narrow** — pull a few **directions** out of the board (reuse the pile gesture).
5. **Compose** — the **DirectionCard** + two **brand** previews + shuffle + click-to-
   recolor + chosen type + a legibility check. Decide (compare) and Share (for voting) are
   moments here, aimed at the direction. Everything else in today's rail is deferred.
6. **Deliver** — the brand book / export, downstream of Compose.

# Rename list

- inspiration store: well / library / sources / tray / atoms → **your inspiration**
- the messy view of it → **the pile** (a view, not a place)
- working surface: moodboard / canvas → **board**; a board toward identity → **direction**
- internal-only, never user-facing: atom, block, pool, swatch (UI says "a color")

# Cut / defer list (pending Lorin's sign-off)

- **CUT:** PathFooter + `lib/steps.js` (legacy nav); `/gradients` (standalone); the cross-
  project well/atoms (`atomsStore`, WellTray, atom vocabulary); the legacy file backend.
- **MERGE:** `/colors` → `/recognize` + board; `/decide` → Compose; `/library` inventory →
  the pile/board source; the two type pickers → one; two role mechanisms → one; two save
  systems → one; auto-zones + sections → one "region."
- **DEFER (your call):** per-image finishes, TexturePanel, MarksFrame, the 6-format export
  breadth.
- **KEEP, re-aimed:** Share-for-voting → at the direction; `/print` → the deliver endpoint
  under the new nav.

# Open questions for Lorin

1. `/colors` cut — you said you like the *recognize* color extraction; `/colors` is the
   separate "rate palettes to train the shuffle" room. Confirm it folds away?
2. Marks, textures, gradients — defer all three off the rebuild, or is one of them load-bearing?
3. The cross-project "well" — shelve it, or is keeping references across projects a real need
   you have (Whelm + client work)?
4. Narrow — its own split-view, or just "new board + the pile gesture"?
