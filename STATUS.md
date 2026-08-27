# Inkling — status (live)

**Read this first.** Current state, the ledger, and the next move. The *why* lives in memory
(`project_studio_system` first, then `project_product_direction`); the journey lives in git.
Keep this file short — it is state, not a log.

## Right now

- **Branch `v2`. The live work is `/studio`** — the playtest 01 build (`app/studio/`,
  `lib/studio/spectrum.js`, `app/api/studio/log/`). Run `npm run dev` → `localhost:3000/studio`.
- **Second pass (notes 50–62) landed:** references *arrive* on first load; a **step strip** (1–5) names
  where you are and what the step is for; **Tidy ↔ Loosen** makes the grid opt-in and the mess the
  default; once voting starts the board becomes **four framed, headed columns** and *Not looked at yet*
  visibly shrinks; **keep** spreads, **maybe** fans, **no** collapses to a deck (Spread/Stack toggles);
  **clicking a card opens the vote for it** (change it, or undecide); when everything is voted, one
  explicit **Carry the keeps over** gesture moves them; board 2 states its job in writing.
- Loads the real library (252 references, palettes already extracted) as a **messy organic pile**;
  *Pull the colors out* reveals each card's strip and blooms the **aggregate spectrum** in two
  readings (everything · setting the neutrals aside); *Start a round* deals one card at a time into
  **keep · maybe · no** (keys 1/2/3), and the results settle back into lanes on the board; carrying
  to *What it's about* is a **real drag across the canvas** (no "send to board" button — that
  absence is the Q1 instrument); groups take a name and a *"…but not ______"*.
- **Board 2 built (2026-08-27).** Carried keeps arrive as a **legible grid**, not a second pile,
  and read smaller than on board 1 because this board is for seeing a pattern across sixty things,
  not judging one. The gesture is **draw a frame**: drag anywhere on board 2 and whatever you
  encircle becomes a group (hold ⌥ to pan instead). A group is **a card with a header** — its own
  aggregate color strip, the member count, and two *equal* fields: *What do these have in common?*
  and *…but not ______* (the NOs are the differentiator, so they are not a footnote). Groups
  **move and resize**, carry their cards with them, and **shove non-members out** rather than
  silently swallowing them. Loose cards sitting together get a soft halo and a **"Frame these N"**
  offer — the tool reflects the cluster her hands made and never draws it itself. A **"Stuck?"**
  prompt asks a projective question and never proposes a word; every reveal is logged, because
  *needing* it is the Q5 signal. **Release** frees a group without deleting anything, and the step
  strip carries `N of M named`.
- Every action writes to `data/playtest/<session>.jsonl`. **Read the log, not your memory.**
- Verified: build clean, 0 console errors/warnings, zoom-to-fit frames the whole pile on arrival,
  keyboard round (1/2/3) and keyboard carry (arrows) both work, `prefers-reduced-motion` honored.
- **Not in it, on purpose:** locking, outfit cards, the taste spec, multiplayer, the second door.

## Next move (do this first)

**Open `localhost:3000/studio` in a real browser and run the flow yourself for twenty minutes**
— gather → pull the colors → a round → carry the keeps → make a group and name it. Not to check
the work: to find what the next pass should fix before her collaborator sees it. Then:

1. ~~**Design board 2 properly.**~~ **Done 2026-08-27** — see "Board 2" below.
2. **Decide the session board.** Whelm (252 refs, loaded, a harder case) or her current 50–100
   board — which needs a bookmarklet import **before** the meeting, never during it.
3. **The meeting date is still unknown.** It sets whether anything else fits.

**Then:** run playtest 01, read `data/playtest/*.jsonl`, and let Q1–Q7 decide what gets built —
locking and outfit cards only once there is a generator for them to constrain.

## The system (locked — the full why is in `project_studio_system`)

One studio canvas; **boards** are framed regions on it. **Everything is a card**, and cards nest.
You **gather with no judgment**, then **narrow in repeatable rounds** (keep · maybe · no, rising
bar, ending at *"does it make you sing?"*). Cards **lock** one at a time, and the locked set *is*
the deliverable — a **taste spec that is a brief**, including the NOs, not a design system.

Non-negotiables: **nothing is auto-promoted** (a carry is her hand, and it makes a linked copy so
the board behind her survives) · **no new destinations, ever** · **the atom of comparison is the
combination, not the ingredient** · activities are offered, never imposed, and Blank is always
present · if an activity's output does not survive into the spec, cut the activity.

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
| 41 | The shopping anecdote: "I tour the entire store with a big basket, i collect anything that catches my eye and only once I have seen everything do I sit down… if it fits (try on), if it has potential, if it is worth the money, but most of all if it makes me SING inside… 20 to 20 to 5 to 2." | **The process model.** Collapses gut-pass and head-to-head into ONE repeatable **narrowing round**. Gather without judgment; judge only when everything is in. |
| 42 | "most of all if it makes me SING inside" | **Her word — preserve verbatim.** Proposed as the tool's final criterion. Copy is hers to accept or replace. |
| 43 | "Direction is NOT working for 'brand direction' it is not intuitive to understand." | **Retired.** Replacement proposed: **outfit card** (from her own try-on metaphor); plain fallback: combination card. Her call. |
| 44 | "i liked the idea of types of cards like activity card, moodboard card, note card, collection card whatever the purpose may be" | Adopted — cards named by **purpose**, in plain language, and they **nest** (a board reads as a card when you zoom out). |
| 45 | "it would be cute to have all the pins upload in as a pile that looks intentionally messy and organic then the user says to 'organize and sort' or something and 'extract colors' and each step has these beautiful satisfying animations/motion effects" | **Answers "what is the first board."** A messy organic pile; every transformation is user-triggered, never automatic; motion is the payoff. |
| 46 | "they may need to start with a step by step like 1. Do you have inspiration to upload?… if they have it they upload it if they dont maybe the start with the activities" | **Two doors, one room.** Bring material, or *make* material with a generative activity. Both converge on a pile. One question, not a wizard. |
| 47 | "any other sourcing we can make easy through API or inventing a scraper" | Answered — bookmarklet now (the user acting on their own data), **browser extension** later, Are.na API, drag/paste for everything else. **No server-side scraper** (`RIGHTS.md` Phase 0). |
| 48 | "it might need to be flexible and obnboarding will be key in showing them how to use it per their circumstance" | Open — onboarding is not a tour: a persistent quiet "what now?" that always offers the next 2–3 moves given your actual state. |
| 49 | "I think its time to play test, so work on building BUT make sure that before you do you have in mind what questions this play test should answer (i.e. is it one process or a series of repeated processes per fascet?)… We should always know what we are testing and make everything included in the build have a purpose" | **Built — 2026-08-21.** Plan below; `/studio` ships against it. Every element maps to a question; the cut list names what tests nothing. |
| 50 | "nav bar looks too small and not accessible in size/color etc." | **Fixed** — 44px targets, ink-contrast labels, larger type. |
| 51 | "The boards and colors are a little too faint and close together to know where one thing starts and another ends." | **Fixed** — real board frames, headed lanes, stronger separation. |
| 52 | "I did not get to witness the upload process." | **Fixed** — the references now *arrive*: staggered settle into the pile on first load. |
| 53 | "I LOVE the pile but we need an optional organize for those who don't want the mess to snap into grid." | **Fixed** — Tidy ↔ Loosen. The mess is the default; the grid is opt-in. |
| 54 | "It also might help to see something like 'Step 1/5' and the theme of that step." | **Fixed** — a step strip derived from actual state, with a caption saying what this step is for. |
| 55 | "I started dragging before noticing 'start a round' no clue what that meant." | **Fixed** — the step caption names the move; the round button is primary and labelled with what it does. |
| 56 | "its all too crowded in the pile, I would like to see the pile go down and not overwhelm" | **Fixed** — once voting starts the board becomes columns and the **unsorted column visibly shrinks** as she votes. |
| 57 | "board 1 is all of the pins pile or organized, user starts voting round to narrow down, all votes finished auto move to board 2 in their respective groups" | **Partly taken, with one pushback.** Sorted piles stay on board 1 (they are states of the same material). When every card is voted, one explicit gesture carries the keeps over — not automatic, because auto-promotion is the law we set (note 31). |
| 58 | "this also needs more design i just see the word 'no' with no frame or visual differentiation" | **Fixed** — each lane is framed and headed with its count; keep spreads, maybe fans, no collapses into a deck. |
| 59 | "the fade out is a nice touch" | Kept. |
| 60 | "I may want to unfade something." | **Fixed** — any vote is changeable, including back to undecided. |
| 61 | "It would be good if I clicked on something and it opened the vote for that item." | **Fixed** — click (without dragging) opens the vote for that card. |
| 62 | "Idk what to do in your second board" | **Fixed properly — 2026-08-27.** The first pass only *named* the board; the board still had no gesture. Now it has one: keeps arrive as a legible grid, a drag draws a frame around whatever it encircles, the frame carries the group's own colors and its two equal fields (what these have in common · …but not ______), groups move and resize and carry their cards, the tool notices a cluster her hands already made and offers to frame it, and a "Stuck?" prompt asks a question without ever proposing the word. |

## Playtest 01 — what we are testing (2026-08-21)

Build target: `/studio`. **A playtest that tests everything tests nothing**, so this build answers
seven questions and nothing else. Each has a signal we can actually observe and a consequence if it
fails.

| # | Question | Signal to watch | If it fails |
|---|---|---|---|
| **Q1** | **Does carrying feel embodied?** (note 31 — load-bearing) | Does she drag board-to-board unprompted? Does she ever wish for a button instead? | If she asks for "send to board" / multi-select-move inside the first ~10 carries, the gesture is not the point and the spatial model loses its justification. |
| **Q2** | **One process, or repeated per facet?** (her question) | Seed the pile with extracted **swatch cards mixed among references**. Does she sort them together, or immediately separate colors from images? | Together → one narrowing loop over everything. Separate → per-facet loops, locking becomes per-facet, and the board structure changes. |
| **Q3** | **Does the maybe pile do work, or become a landfill?** | Size of *maybe* after round 1 vs *keep*. Does round 2 actually draw from it? | If *maybe* holds >50% of the pool, the round is not forcing anything: cap it, or change the question. |
| **Q4** | **Does gather-without-judgment hold?** | Does she try to react / star / sort *during* the pile stage? | If she wants to react while gathering, the no-judgment law is wrong and reaction belongs inside gathering. |
| **Q5** | **Do names emerge from piles?** (the conversion event — the thesis) | Time-to-name after a group forms. Are the names words she would defend, or filler? Is *not-this* easy or hard? | If she cannot name groups without prompting, "sorting produces the language" is wrong, and generative questions must come **first**, not second. |
| **Q6** | **Two people on one screen: equals, or driver + watcher?** | How often control changes hands. Does her partner disengage? | Decides whether **multiplayer is urgent** (the biggest single item in the system) or can wait. |
| **Q7** | **Does the aggregate spectrum land?** | Does it produce a sentence about her taste she did not have before, or a shrug? | Cheap desirability check; changes nothing structural. |

### In the build, and why (every element maps to a question)

| Element | Serves |
|---|---|
| Her real board, **pre-loaded** as a messy organic pile | Q4, Q7 — and note 13 (import leaves the session) |
| **Extract colors**, user-triggered and watchable | Q7 |
| The **aggregate spectrum** ("what you keep reaching for") | Q7 |
| Swatch cards **mixed into** the pile | **Q2** |
| A **narrowing round**: one card at a time, **keep · maybe · no** | Q3, Q4 |
| **Round 2 drawing from *maybe*** | Q3 |
| A **second board**, reached only by dragging | **Q1** |
| **Draw-a-frame grouping, name + not-this, the naming prompt** on board 2 | **Q5** |
| An **event log** (JSONL, timestamped) | all — review by record, not memory |

### Deliberately NOT in this build

- **Locking** — its only real job is constraining a generator, and there is no generator here yet. It
  would be a badge, which is exactly what note 39 says it must not be. Tests nothing.
- **Outfit cards** — the atom of a *later* round.
- **The taste spec** — assembles from carries across more rounds than one session holds.
- **Multiplayer** — Q6 is the thing that decides whether to build it.
- **The generative-questions door** — build it only if Q5 fails.
- **Collections · boards-as-cards · the activities menu · "what now?"** — no question depends on them.

### Session shape (~45 min)

pre-loaded pile → *extract the colors* (watch) → the spectrum → **round 1** → carry to board 2 →
group + name + not-this → **round 2 from the maybe pile**.

## What it is
**Inkling — the intuitive's creative home base.** One place that replaces the 5 apps + 10 tabs a visual
person scatters inspiration across. For people who *know it when they see it* and play their way to
clarity. The spine (product = onboarding = story): idea → feeling → seek → **gather → play → make
tangible → collaborate & refine** → A-to-Z. Wedge: synthesis from *your* taste, you stay the author.
Brand: `inkling.`, newsprint + warm ink, ultraviolet+tangerine spark (surgical), Fraunces + mono,
editorial rigor. Locked decisions + brand → memory.

## The plan

**Track A — the prototype (`public/make-inkling.html`) — PARKED (2026-08-21).** The full
Name → Gather → Colors → Type → Moodboard → painted-home flow and the ink-pour opening
(`public/opening-draft.html`, `public/marks/`) are intact and unchanged. They are an onboarding
story for a product that is no longer the live question. Don't polish them; don't delete them.

**Track B — the real app — LIVE.** `/studio` is the working surface. In dependency order after
playtest 01: board 2 · the color engine's role-aware composition (`project_color_theory_research`)
· `project_members` + `brought_by` attribution · outfit cards + locking · the spec export
(`app/print` + `app/api/brand/export` are the seam) · then multiplayer, which is the largest single
item and needs Liveblocks plus a move off whole-document PUT.

**Retiring:** `/colors`, `/type`, `/brand`, `/gradients`, `/decide`, `/recognize`, `/probe`,
`/spike*`. They are the six-destinations problem. Keep `/import` (moving out of the session),
`/library`, `/moodboard`, and the palette + font data.

## Pre-launch must (legal/ethics)
**`RIGHTS.md` Phase 0** before any public launch: delete `lib/pinterestSourceFetcher.js` + stop the
bookmarklet auto-scroll. Reference-don't-replicate; gate publishing to owned/licensed; Pexels then
Unsplash. Read `RIGHTS.md` before touching import.

## Docs map
- **Why / locked decisions** → `memory/` (`project_studio_system` first, then
  `project_product_direction`; `project_repo_tripwires` before touching routes or state).
- **This file** → live state, the ledger, the next move.
- `RIGHTS.md` (sourcing/rights — read before touching import), `FLOW_AUDIT.md` (per-surface
  keep/cut, now largely superseded by the retire list above), `PITCH.md` (the claim + diagram).
- Live surface: `app/studio/` + `lib/studio/`. Parked prototype: `public/make-inkling.html`.
