# Inkling — status (live)

**Read this first.** Current state, the ledger, and the next move. The *why* lives in memory
(`project_studio_system` first, then `project_product_direction`); the journey lives in git.
Keep this file short — it is state, not a log.

## Right now

- **Branch `v2`, on GitHub as `lorin-a/Inkling` (pushed 2026-08-27; it never had been).** The live
  work is `/studio` (`app/studio/`, `lib/studio/`, `app/api/studio/log/`). `npm run dev` →
  `localhost:3000/studio`. **Read `JOURNEY.md` before building anything on it:** the journey map,
  the structural review, the plan, her decisions, and the seven "beyond" features.
- **What `/studio` does today:** the real library arrives as a messy pile (Tidy ↔ Loosen); *Pull
  the colors out* reveals each strip and the aggregate spectrum; a **round** deals one card at a
  time into keep · maybe · no (1/2/3), **or drop a card in a lane**; click a card to change its
  vote; **carry** is a real drag or one explicit *Carry the keeps over*, and **a carry makes a
  linked copy** (original ghosted `→ 2`, copy carries `from`); **board 2**: draw a frame, name it,
  *…but not ______*, the group's own colors, a cluster halo with *Frame these N*, a *Stuck?* prompt;
  **note cards** (`N`); **undo** (`⌘Z`); a step strip derived from state. Every control's purpose
  and verdict is in `JOURNEY.md` §5.
- **Projects:** `data/projects/whelm/` is the 252-pin *test* board (active); **`data/projects/mc/`
  is her live project, empty until she imports.**
- **The record:** hers in `data/playtest/pt01-*.jsonl`; mine in `_claude/` (git-ignored). Every
  event carries `who`. **No real playtest has happened yet** (her one session was four minutes).
- Verified 2026-08-27 in a separate browser: build clean, 0 console errors, drop-to-vote + undo,
  the full carry cycle (copy, back, undo, no duplicate), notes persisting, reduced motion honored.
- **Not in it, on purpose:** a second person, the reveal, Try it on, locking, the brief, multiplayer.

## Next move (do this first)

1. **Her import (five minutes, her browser):** `/import` → project switcher → **mc** → drag the
   bookmarklet to the bookmarks bar → open `pinterest.com/lorinanderberg1/mc/` → click it → drop
   the JSON on `/import`. Then `/studio` shows her board; palettes extract in the background.
2. **Phase 1 — the second person** (`JOURNEY.md` §6, no date, cut line B): studio state on the
   server (project-scoped; replaces `localStorage["inkling-playtest-01"]`), a second member by
   invite link, private per-person votes, **the reveal** (both kept · both cut · split) as the
   first thing on screen when the meeting opens. Then the advocate round and the phone pass.
3. **The words:** every line that is mine carries `[provisional]` in `Studio.js`; list them for
   her once she has heard them in a real session.

**Then:** Phase 2, Try it on (outfits from a named group, her copy as the specimen, the fit map,
locking) → Phase 3, the brief in her shape with the provenance thread and the handoff page.

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
| 63 | "I am really excited about how this is looking but we need to do a deep check on the why and how. Put on your design systems hat and revisit the entire structure, the why of the build, the user flow, and the purpose of every interaction to make sure we are on track." | **Open — 2026-08-27.** The review is `JOURNEY.md` (replaces `FLOW_AUDIT.md`). |
| 64 | "The use case for the first test is this: me and my collaborator have both been adding inspiration to a moodboard for our project's brand. Now we want to play with that in a productive way." | **Open — 2026-08-27.** This is the test. Not Whelm: her live project, with a partner. See `JOURNEY.md` → the questions. |
| 65 | "Inkling needs to provide us the structure to go from a pool of undefined inspiration to a collaborative decision making process that helps translate the inspiration from an inkling to a solid deliverable, into what we need which is a color scheme, typeface options, etc." | **Open — 2026-08-27.** The build stops at named groups; the deliverable she names (color scheme, typeface options) is not on the surface yet. `JOURNEY.md` finding 1. |
| 66 | "The point of Inkling and why it is different than just a rebuild of figma is that it uses design workshop thinking to make the process of narrowing down a hunch playful and collaborative. It provides the step by step structure needed to achieve this. It is a process a tool and a workspace." | **Open — 2026-08-27.** The differentiator, in her words. The workshop mechanic the build is missing is *silent independent reaction, then reveal*. `JOURNEY.md` finding 2. |
| 67 | "Our project happens to have a name already but not every project will, some amount of brainstorming, word play, rapid fire, card sorting, generative exercises, shuffling, previewing, will all be helpful." | **Open — 2026-08-27.** The activity library, named. Mapped to the journey in `JOURNEY.md`; only card sorting exists today. |
| 68 | "It needs to balance freedom with structure. It should always make it easier for the user to get closer to their intuition." | **Open — 2026-08-27.** The design law for every surface. `JOURNEY.md` finding 9 (the freedom side is thin: no note cards, no words outside a group header). |
| 69 | "We likely need a user journey map." | **Done — 2026-08-27.** `JOURNEY.md` + the published artifact. |
| 70 | "If I have not clarified anythign enough, do not make assumptions, ask and help me figure it out. You are the expert, guide me." | **Open — 2026-08-27.** Six questions at the end of `JOURNEY.md`, each with my recommendation. Nothing in the plan assumes an answer. |
| 71 | "this is the project board but the one you have now is technically the mood builder test board. Here is my project: https://www.pinterest.com/lorinanderberg1/mc/" | **Answered — 2026-08-27.** Test 1 = the `mc` board. Project `mc` exists in the registry; the import is hers to run (steps under "Next move"). |
| 72 | "We want to do it all together. It could be interesting to have each of us do votes alone or without the other seeing to organically see where there is overlap?" | **Answered — 2026-08-27.** Together, on two devices, with private votes and a reveal. Phase 1 is in scope for the meeting. |
| 73 | "describe in plain text what the brand voice, feel, and values are as context copy, then have a pool of color pallettes that are approved, then a set of typefaces that feel close to right, they may want to include a few key references of an ideal state or perhaps even design a little mood board that combines all of this into a nice neat or messy collage to show a graphic design collaborator." | **Answered — 2026-08-27.** This is the brief, in her words: voice/feel/values copy · an approved palette pool · typefaces close to right · key references · optionally a collage. Stage 7 is designed to this. |
| 74 | "just build smart don't rush no stress." | **Answered — 2026-08-27.** No date; cut line B; dependency order. |
| 75 | "link" (partner joins by link, no account) | **Answered — 2026-08-27.** |
| 76 | "I do like a way to measure how accurate it feels compared to the inner vision, like maybe even a percentage of how much it hits home BUT its hard because there may be important context as to why it is or is not meeting the standard, i.e. colors are good logo is too corporate and typeface is 50% there but not quite. Which makes the ability to add your notes a useful skill." | **Open — 2026-08-27.** Designed as the *fit map*: her hand sets a closeness per aspect, with a note in her words; the tool never computes it. JOURNEY.md → Beyond. |
| 77 | "I also want you to come up with important features or processes that I have not thought of or is completely beyond my capabilities that would make this the BEST tool to use to get your ideas molded into artifacts for brand designers and creatives" | **Open — 2026-08-27.** JOURNEY.md → Beyond: seven, ranked, each with what it produces and the law it must pass. |

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
- **`JOURNEY.md` (2026-08-27) — the journey map, the structural review of `/studio`, the plan in
  dependency order, and the six open questions.** Read it before building anything on the studio.
- `RIGHTS.md` (sourcing/rights — read before touching import), `PITCH.md` (the claim + diagram;
  two reframes stale, kept for the diagram).
- Live surface: `app/studio/` + `lib/studio/`. Parked prototype: `public/make-inkling.html`.
