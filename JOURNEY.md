# Inkling — the journey, and where the build stands against it

Date: 2026-08-27. Branch `v2`. Author: Claude, for Lorin, in reply to note 63 ("put on your
design systems hat and revisit the entire structure, the why of the build, the user flow, and
the purpose of every interaction"). Replaces `FLOW_AUDIT.md` (2026-06-09), which audited a
product model two reframes ago.

**Read order:** §1 the use case in her words → §2 what the record actually shows → §3 the
journey map → §4 findings → §5 the interaction audit → §6 the plan → §7 the questions →
**§8 her answers, as decisions → §9 beyond: what would make it the best tool.** §6 was written
before §7 was answered; §8 says what the answers changed.

Everything below traces to something opened this session: `STATUS.md`, `VISION.md`,
`PRODUCT.md`, `PITCH.md`, `DESIGN.md`, `RIGHTS.md`, the memory files (`project_studio_system`,
`project_product_direction`, `project_color_theory_research`, the feedback files),
`app/studio/*`, `lib/studio/*`, the migrations, the share/vote surfaces, and both playtest logs.

---

## 1. The use case, in her words (2026-08-27)

> "The use case for the first test is this: me and my collaborator have both been adding
> inspiration to a moodboard for our project's brand. Now we want to play with that in a
> productive way."

> "Inkling needs to provide us the structure to go from a pool of undefined inspiration to a
> collaborative decision making process that helps translate the inspiration from an inkling to
> a solid deliverable, into what we need which is a color scheme, typeface options, etc."

> "The point of Inkling and why it is different than just a rebuild of figma is that it uses
> design workshop thinking to make the process of narrowing down a hunch playful and
> collaborative. It provides the step by step structure needed to achieve this. It is a process
> a tool and a workspace."

> "Our project happens to have a name already but not every project will, some amount of
> brainstorming, word play, rapid fire, card sorting, generative exercises, shuffling,
> previewing, will all be helpful."

> "It needs to balance freedom with structure. It should always make it easier for the user to
> get closer to their intuition."

Four things in that statement are load-bearing for everything below:

1. **Two people, one pool, already gathered.** The test starts *after* gathering. Attribution
   (who brought what) is the first thing the tool has to know and does not.
2. **"Collaborative decision making process."** Not a shared canvas. A *process* two people go
   through, and the tool structures it. The workshop mechanic that makes a group decision
   honest is the one thing the build has none of (§4, finding 2).
3. **The deliverable is named:** a color scheme, typeface options. The build ends at named
   groups of references. The deliverable is not on the surface (§4, finding 1).
4. **"Process, tool, workspace."** Three nouns; the build has the workspace (canvas, boards,
   cards), half the tool (rounds, groups), and the process only as a step strip that ends in
   "not in this build yet."

---

## 2. What the record actually shows

STATUS says: *"Every action writes to `data/playtest/<session>.jsonl`. Read the log, not your
memory."* I read it. Two things a plan has to be honest about:

**No playtest has happened.** There are two session files. `pt01-…-2n7y` is the Playwright
profile: on 2026-08-21 it voted 296 cards in 51 seconds (0.2 s per card), and on 2026-08-27
it wrote the group name "Handmade, not designed" seven times. That is me, testing.
`pt01-…-hub8` is Lorin's browser: **four minutes** on 2026-08-21 (18:11–18:15), 18 votes at
1.3 s per card, four cards dragged to board 2 and all four dragged back, one round started and
abandoned after 44 seconds. That, plus notes 50–62, is the entire body of real evidence. Q1–Q7
are unanswered. Everything STATUS calls "verified" is verified by me, not validated by her.
Those are different words and the plan should use the right one.

**The instrument contaminates itself.** The log has no `who`. Playwright's sessions land in the
same directory with the same shape as hers, and my test strings are now in the record STATUS
says to trust over memory. Fix before the meeting: a tester stamp on my sessions (separate
directory) and a `who` on every event, which the attribution requirement needs anyway.

---

## 3. The journey map

Three time-scales, not one session. The build models only the middle one, and the workshop
mechanic that makes two people's decision honest lives in the first.

```
                 BEFORE                        THE MEETING                       AFTER
              (async, alone,                (together, on a call             (async, alone,
               own devices)                   or in a room)                   own devices)

   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ 0 BRING  │ │ 1 LOOK   │ │ 2 REACT  │ │ 3 REVEAL │ │ 4 NAME   │ │ 5 TRY    │ │ 6 ROUND  │ │ 7 BRIEF  │
   │  IT IN   │▶│  AT ALL  │▶│  ALONE   │▶│          │▶│  IT      │▶│  IT ON   │▶│  TWO     │▶│          │
   └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
   overwhelm ─────────────────────────────▶ relief ────────────────▶ recognition ──────────▶ tangible
```

| # | Stage | She does | Her partner does | The tool's move | Artifact out | Workshop method it borrows | Tests | Built? |
|---|---|---|---|---|---|---|---|---|
| 0 | **Bring it in** | Imports her sources, before the meeting, never during (note 13) | Imports theirs, or hands her the board | One pool; every card stamped with who brought it (note 17) | The pool, attributed | The big basket: gather with no judgment (note 41) | Q4 | Import ✔ (bookmarklet, Are.na) · one pool ✔ · **who-brought-it ✗** · **a second person ✗** (`projects` is single-owner) |
| 1 | **Look at all of it** | Rummages the pile; tidies or loosens; pulls the colors out; sees the spectrum | Same, on their own screen | The messy arrival, Tidy ↔ Loosen, the strips, "what you keep reaching for" | The pile, seen whole | Gallery walk | Q4, Q7 | ✔ |
| 2 | **React alone** | Round 1: keep · maybe · no, one card at a time, or by dragging into lanes | Same, privately; neither sees the other's votes | Private votes per person; a rising bar per round | Two independent sorts | Silent dot-vote / card sort, before anyone speaks (VISION §4: "silent independent reaction before the group reveal so no one anchors on the loudest voice") | Q2, Q3, Q4 | Round ✔ · click-to-vote ✔ · **drag-into-lane does not vote ✗** (§5) · **private per person ✗** (one browser's localStorage) |
| 3 | **Reveal** | Opens the meeting on the reveal | Reads it with her | Three piles that did not exist before: **both kept · both cut · split**. The split pile is where the conversation is | The agreement and the tension, visible | The reveal; consensus + tensions (VISION §7: "the divergence/tension map is the unique value") | Q6 | **✗** |
| 4 | **Name it** | Pulls what belongs together near each other, frames it, names it, says what it is not | Talks; drags too if on their own device | Board 2 as built today: lasso, group panel with its own colors, name + not-this, the cluster halo, the "Stuck?" prompts | Groups = a value with its rejected pole and its references | Affinity mapping; "I like / I wish / what if" (VISION §3) | **Q5** | ✔ (2026-08-27) |
| 5 | **Try it on** | From a named group: sees 3–5 outfits (a palette with roles + a type pairing + one of the group's own references) in context; runs a round on them: *does it make you sing?*; locks what works | Votes too; the split shows again | The generator, constrained by locks; each outfit traces to the group it came from | **Locked color scheme, locked type candidates**: the deliverable she named | Rapid prototyping; head-to-head (note 25); try-on interleaved with rounds (note 41) | (new) | **✗ on the surface.** The engine exists off it: `composePalette.js` + `colorTheory.js` (role-aware, OKLCH), `fontPairings.js` (mood-weighted pairings), `MiniBrandPreview`, `DirectionCard` |
| 6 | **Round two** | Round from the maybes; reacts to outfits her partner made | Same | Same round, rising bar; "20 to 20 to 5 to 2" | The narrowed set | Repeated narrowing (note 41) | Q3 | Round-from-maybes ✔ · partner ✗ |
| 7 | **The brief** | Reads it; exports it | Reads it | Assembles only from locks: values + rejected poles + references, palette with roles, type with a reason, **the NOs** and why | A one-page taste spec + tokens | The synthesis presented back (VISION §5, Nadia) | (thesis) | **✗**. Seams exist: `app/print` (puppeteer PDF), `app/api/brand/export`, the two-layer token contract in memory |

**Projects without a name** (note 67): a word-play activity sits *beside* stage 4, offered
never imposed: rapid-fire words on note cards, sort them like references, name from the
survivors. It is the same round on a different kind of card. The **generative-questions
door** (persona, "what would it never do") opens only if Q5 fails, per the playtest plan.
Neither is in test 1; both have a slot in the map so the build does not have to be
re-architected to admit them.

---

## 4. Findings, ranked

Each one: what I read, why it matters, what it implies. A gap is a next step, not a verdict.

### 1. The build ends where the use case starts to pay off

She named the deliverable: "a color scheme, typeface options." The studio's step 5 caption
reads *"Not in this build yet — it assembles from what you carried."* Board 2 produces named
groups and then stops. Everything that turns a group into a palette or a type option lives in
the routes STATUS is retiring (`/brand`, `/type`, `/colors`), each with its own interaction
model, which is the six-destinations problem the system was built to end.

*Implies:* stage 5, **Try it on**, is the next structural piece, not a later one. It is also
the only place locking can exist honestly: note 39 says a lock must constrain a generator or
it is a badge, and this is the generator. The engine is already written; the work is a
**third board region and outfit cards on the one canvas**, summoning the existing
composition code rather than linking out to it.

### 2. "Collaborative" is the center of the use case and the build has no second person

Her partner cannot get in: `projects` is one-owner (`002_auth_users_projects.sql`), pins carry
no `brought_by`, and the studio's state (votes, positions, groups) lives in one browser's
localStorage, so even a screen share is one driver and one watcher. Q6 was written to detect
exactly that, but it is the least interesting version of the question.

What her own earlier decisions say the collaborative mechanic *is* (VISION §4, §5 Nadia,
`project_product_direction` "react-then-reveal, anti-anchor, a hard rule"): **each person
reacts silently and independently first; then the group reveals; then they talk about the
split.** A shared-screen round with one person clicking destroys that on purpose. And live
cursors (the multiplayer she has accepted and I have costed as the largest single item) are not
what makes the decision honest. Independence is.

*Implies:* the cheapest true collaboration is **stages 2–3: private rounds on your own device
before the meeting, and a reveal the meeting opens on.** That needs server-side studio state
(project-scoped, not localStorage), a second member, and votes keyed by person. The Moodvote
schema (`instances` · `invites` · `sessions` · `votes`, migration 001) already has the shape;
`target_type` gains `reference`. It does not need Liveblocks. This also changes what the
meeting is *for*: not voting, which is faster alone, but reading the split and naming
together, which is the part that needs two people talking.

### 3. Nothing is on the server

Restating finding 2's mechanism on its own, because it governs sequencing: `Studio.js` persists
to `localStorage["inkling-playtest-01"]` and writes only the event log to disk. Positions,
votes, groups, names: one browser. A second device, a second person, a phone, a reload on
another machine: nothing. Every collaborative stage in §3 sits behind this one move.

### 4. Carrying moves the card; the law says it copies

`project_studio_system`: *"a carry makes a linked copy (the original stays, marked) so the
board behind you is a record of the stage, not of loss."* Note 30: *"It is good to be able to
witness the progression, to go back and look at things."* In `Studio.js`, `carryKeeps` and
`onCardPointerUp` set `board: "groups"`; the card leaves. After a carry the Keep lane on board 1
is empty, and board 1 no longer records what was kept. Cheap to fix (a marked original stays;
the copy carries a `from`), and it is the provenance the brief is assembled from.

### 5. The lanes look like drop targets and are not

Once voting starts, board 1 shows four framed, headed columns: Not looked at yet · Keep · Maybe
· No. Dropping a card in "Keep" does nothing to its vote (`onCardPointerUp` changes `board` and
`pinned`, never `tag`). Every framed column in a card-sort is a place you can put things; the
frame is the promise. `project_product_direction` also says *"see-all-and-sort is PRIMARY;
one-at-a-time is the optional power-tool."* Her shopping story has both in sequence (tour
everything, then try on), so both belong, but the drag one has to work. Small fix; it also
gives her partner a way to sort by hand on a phone without the round overlay.

### 6. Color is a spectator until stage 5

"Pull the colors out" and the spectrum serve Q7 and are worth keeping. But nothing downstream
consumes color: the group strip added today is the first place a group's colors are pooled,
and it is a reading, not an input. The role-aware engine (memory: "pick colors to serve roles,
not the other way around"; OKLCH; the Untitled UI two-layer token contract) is the bridge from
a named group to a color scheme. It is written. It has no home on the surface.

### 7. Words have one home, and it is a group header

Notes 2 and 5 (define it in language; words, values, principles, mission), 24 (persona), and
today's list (brainstorming, word play, rapid fire, generative exercises). The build's only
word-shaped thing is the group name and its "…but not." That is the right atom (a value with
its rejected pole) and it should stay the atom. But there is no way to put a word on the
canvas that is not a group. A **note card** (any word or sentence, anywhere, sortable like a
reference) is the smallest thing that makes "freedom" real on board 1, gives word play a home,
and keeps *Blank is always present* true.

### 8. Three motion and copy conflicts with the locked design language

- `DESIGN.md` and `PRODUCT.md`: *"No motion that bounces, springs, or overshoots."*
  `studio.module.css` uses `--ease-spring` on the arrival, the carry prompt, the group panel,
  the cluster offer, and the color strips. Swap to `--ease-out`; ten minutes.
- `feedback_collab_process`: *"Direct over poetic in functional copy."* "What you keep reaching
  for" is a good heading and a poetic button. "Show the spectrum" as the control; keep the line
  as the panel's title.
- The round questions after the first ("Does it fit what you've named?", "Does it make you
  sing?", "Still?") and the five naming prompts are my words on her surface. "Does it make you
  sing?" is hers (note 42). The rest need her acceptance or `[LORIN TO WRITE]`.

### 9. Freedom is thin; structure is fine

Her law: "balance freedom with structure." The structure side is in good shape and honors the
laws (steps derived from state, never advanced by hand; activities offered; nothing
auto-promoted). The freedom side on board 1 is: move a card. No notes, no words, no undo. In a
live session with one gesture for everything, **undo** is not a nicety. Groups can be released
and votes changed, but a mis-drag of forty cards has no way back.

### 10. Two nouns still leak

The canvas calls the boards "1 · Everything you gathered" and "2 · What it's about"; the code
calls them `pile` and `groups`; the step strip calls stage 4 "Say what it's about." Fine for a
playtest, but the brief will need stable names for the stages because the brief cites them
("kept in round 2 · named *Handmade* on the second board"). Settle the stage names once, in
her words, before stage 7 exists.

---

## 5. The purpose of every interaction on `/studio` today

Every control, what it is for, which question it serves, and the verdict. Anything with no
question is a cut candidate by the playtest's own rule.

| Interaction | Purpose | Serves | Verdict |
|---|---|---|---|
| References *arrive* on first load | Witness the upload (note 52) | Q4 | Keep. Ease: spring → out. |
| Pile ↔ Tidy | The mess is default, the grid is opt-in (note 53) | Q4 | Keep. |
| Pull the colors out | Watch the extraction; the strips appear on each card (note 35) | Q7 | Keep. |
| The spectrum (two readings) | "What you keep reaching for" | Q7 | Keep; rename the control. |
| Drop the colors in | Swatch cards mixed among references | **Q2** | Keep for test 1. |
| Start a round · Another round · Round from the maybes | One card at a time, keep · maybe · no, rising bar | Q3, Q4 | Keep. |
| Keys 1 / 2 / 3 / 0 / Esc | Speed; undecide; leave | Q3 | Keep. |
| Click a card → vote for it | Change or undo one vote (notes 60, 61) | Q3 | Keep. |
| The four lanes, Spread/Stack | The pile visibly goes down (notes 56, 58) | Q3, Q4 | **Fix:** dropping in a lane must vote. |
| Carry the keeps over (one gesture) | Not automatic, by law (note 57) | Q1 | **Fix:** copy, don't move (finding 4). |
| Drag a card across the canvas | The embodied carry; no "send to board" button on purpose | **Q1** | Keep. Copy, don't move. |
| Lasso on board 2 | Cluster first, frame second | **Q5** | Keep (built 2026-08-27). |
| Group panel: colors · name · not-this · count · release · resize · move | A value with its rejected pole; the NOs are not a footnote | **Q5** | Keep. Move-shoves-bystanders stays. |
| Cluster halo + "Frame these N" | The tool reflects her hands; never draws | Q5 | Keep. Watch whether it nags. |
| "Stuck?" prompts | A question, never a word; reaching for it is the Q5 signal | Q5 | Keep; words are hers to accept. |
| Tidy what is loose · + Empty group | Fallbacks | Q5 | Keep. |
| Step strip 1–5 | Where you are and what the step is for (note 54) | all | Keep. Step 5 is a dead end until stage 7. |
| Zoom: Board 1 · Board 2 · Both · % | Orientation | Q1 | Keep. |
| The tally (counts, N of M named) | Progress in numbers | Q3, Q5 | Keep. |
| Event log | Review by record | all | **Fix:** `who`, tester stamp, separate dir. |
| *(missing)* Note card | A word anywhere | Q5, note 67 | **Add.** |
| *(missing)* Undo | A way back from a mis-drag | all | **Add.** |
| *(missing)* Drop-to-vote on lanes | See-all-and-sort | Q3 | **Add** (same as the lane fix). |
| *(cut, deliberately)* Locking · outfit cards · the brief · multiplayer · the generative door · "what now?" | Would test nothing yet | — | Stay cut for test 1; stages 5 and 7 give the first three a real home. |

---

## 6. The plan, in dependency order

Sized S / M / L. The meeting date is unknown (STATUS), so there are two cut lines. Nothing
here assumes an answer in §7; the questions change *which* board is imported and *how* the
partner participates, not the order.

### Phase 0 · Make test 1 honest (S, days) — before any meeting

1. **The instrument.** `who` on every event; Playwright sessions stamped and written to
   `data/playtest/_claude/`; her sessions untouched.
2. **Drop-to-vote on the lanes.** Dropping in Keep / Maybe / No votes; the round stays the
   power tool.
3. **Carry copies.** The original stays on board 1, marked; the copy carries `from`.
4. **Note cards.** One key, one word, anywhere; sorts like a reference.
5. **Undo** for moves and carries (a small history of card positions; groups already release).
6. **Motion:** `--ease-spring` → `--ease-out` throughout the studio.
7. **Copy:** "Show the spectrum"; the round questions and naming prompts to Lorin for a yes or
   a rewrite.
8. **Import the real board** once §7 Q1 is answered, before the meeting, never during.

*Cut line A: if the meeting is within a week, this is the build, and the meeting runs on one
screen. The tool is being tested as a solo narrowing instrument with a witness. Say so in the
notes; it still answers Q1–Q5 and Q7.*

### Phase 1 · The second person (M–L, one to two weeks)

1. **Studio state on the server**, project-scoped (`studio_state` on the project, or a table),
   replacing `localStorage["inkling-playtest-01"]`. Whole-document PUT is acceptable for two
   people *reacting alone at different times*; it is not acceptable for two people on one
   board at once, which is why stage 4 stays one-driver until multiplayer.
2. **A second member** via an invite link (the `invites` token pattern from migration 001), no
   account needed for them; `brought_by` on pins; the pool stamped at import.
3. **Private rounds:** votes keyed by person (`votes` with `target_type = 'reference'`), hidden
   from the other until reveal.
4. **The reveal:** three new lanes on board 1: both kept · both cut · **split**. Split is the
   first thing on screen when the meeting opens. This is stage 3 and it is the workshop.

*Cut line B: with two-plus weeks, the meeting opens on the reveal and Q6 gets a real answer
instead of "one clicked, one watched."*

### Phase 2 · Try it on (L, after the meeting or as its second half)

1. **A third board region** on the same canvas. A named group can be *tried on*: the tool
   composes 3–5 **outfit cards** (working name; "combination card" as plain fallback; the word
   is hers), each = a role-aware palette from the group's pooled colors (`composePalette`,
   OKLCH, AA-checked) + a type pairing weighted by the palette's mood (`fontPairings`) + one of
   the group's own references, rendered in a small context preview (`MiniBrandPreview`).
2. **The same round** runs on outfits, ending at *does it make you sing?*
3. **Locking** arrives here because there is finally a generator to constrain: lock a palette
   role or a face and the next outfits vary only what is still liquid. Locks are reversible and
   show what fell out of contention.

This is the stage that produces what she asked for: a color scheme and typeface options,
traceable to a named group, traceable to the references, traceable to who brought them.

### Phase 3 · The brief (M)

Assembles only from locks: each named group as a value with its rejected pole and its
references; the palette with roles; the type pairing with the group it came from; **the NOs**
(what was cut, in which round, and the "…but not" lines). Print via the existing `app/print`
seam; tokens in the two-layer contract already specified in memory. Stage 7 is the deliverable;
a brief a designer or a system tool consumes, not a brand book.

### Later, in the order the evidence calls for them

Multiplayer live on one board (Liveblocks; after Q6). The word-play activity and the
generative door (after Q5). The browser extension. `RIGHTS.md` Phase 0 before anything public.
Retire `/brand`, `/type`, `/colors`, `/gradients`, `/decide`, `/recognize`, `/probe`, `/spike*`
once stage 5 has absorbed their engines.

---

## 7. The questions (only she can answer these)

Each with my recommendation. None of them blocks Phase 0.

1. **Which board is test 1, and where does it live today?** The loaded library is the 252-
   reference Whelm set; note 27 says the live project's board is 50–100 pins and has a name.
   Is that board one shared Pinterest board, two boards, Are.na, a folder? *Recommendation:*
   the live project, not Whelm; if it is one shared Pinterest board, we import once and stamp
   who-brought-what by hand in a five-minute pass at import (automatic attribution from a
   shared board is not possible and note 17 already chose "many sources, one pool").
2. **Same screen, or each of you on your own device? Is the meeting a call?** Your partner is
   remote per the record. *Recommendation:* each of you runs round 1 alone on your own device
   before the call; the call opens on the reveal (Phase 1). If the date makes that impossible,
   one screen, and we name it as the solo test it is.
3. **What must be on screen by the end of the meeting?** Named groups (stage 4), or palette and
   type candidates too (stage 5)? *Recommendation:* named groups plus one try-on if time; the
   brief assembles afterward. "20 to 20 to 5 to 2" is not one sitting, and the tool should not
   pretend it is.
4. **The meeting date.** It sets cut line A or B.
5. **Does your partner get an account or a link?** *Recommendation:* a link, no account; the
   invite-token pattern exists.
6. **The words.** "Does it make you sing?" is yours. "Does it fit what you've named?",
   "Still?", and the five naming prompts ("If these were one place, where are you standing?"
   and the others) are mine. Accept, rewrite, or mark `[LORIN TO WRITE]`; and the stage names
   themselves (gather · look · react · reveal · name · try it on · the brief) are proposals for
   your words, not decisions.

---

## 8. Decisions (2026-08-27, from her answers to §7)

| # | Her answer | Decision | What it changes |
|---|---|---|---|
| 1 | "this is the project board but the one you have now is technically the mood builder test board. Here is my project: https://www.pinterest.com/lorinanderberg1/mc/" | **Test 1 runs on the `mc` board.** The 252-pin library at `data/projects/whelm/` is the test board and stays as its own project. | Phase 0 gains: create project `mc` in the registry, she runs the bookmarklet on the `mc` board in her own browser, drops the JSON on `/import` (signed-out, it lands in `data/projects/mc/library.json`; palettes extract in the background). The studio reads whichever project is active. |
| 2 | "We want to do it all together. It could be interesting to have each of us do votes alone or without the other seeing to organically see where there is overlap?" | **Together, on two devices, with private votes and a reveal.** | Phase 1 is in scope for the meeting, not after it. The round overlay becomes the phone surface. The reveal (both kept · both cut · split) opens the meeting. |
| 3 | "describe in plain text what the brand voice, feel, and values are as context copy, then have a pool of color pallettes that are approved, then a set of typefaces that feel close to right, they may want to include a few key references of an ideal state or perhaps even design a little mood board that combines all of this into a nice neat or messy collage to show a graphic design collaborator." | **The brief has her shape:** voice · feel · values as plain copy → an approved palette pool → typefaces close to right → key references → optionally a collage. | Stage 7 is designed to exactly this list. Stage 5 (Try it on) exists to produce the approved pool and the close-to-right faces. The collage reuses the existing board surface (`/moodboard`, sections, comment pins), summoned onto the canvas, not linked out to. **Her copy becomes the type specimen** (§9, no. 2). |
| 4 | "just build smart don't rush no stress." | **No date. Cut line B. Dependency order.** | Phases 0 → 1 → 2 → 3 in order, each shown working before the next. |
| 5 | "link" | **Partner joins by link, no account.** | Phase 1 uses the `invites` token pattern from migration 001. |
| 6 | "hmm not sure on this" + the inner-vision gauge idea | **The words stay provisional** on the surface until she hears them in a real session; nothing is locked. **The gauge becomes the fit map** (§9, no. 1). | Add a `provisional` marker in the code next to every line that is mine, so the wrapup can list them for her. |

---

## 9. Beyond: what would make it the best tool for this

Her ask (note 77): *"come up with important features or processes that I have not thought of or is
completely beyond my capabilities that would make this the BEST tool to use to get your ideas
molded into artifacts for brand designers and creatives."*

Ranked. Each one says what it produces, which law it has to pass, and what it costs. The test
for every entry is the system's own: **if its output does not survive into the brief, cut it.**

### 1. The fit map (her idea, made into a system)

Six aspects, the ones locking already measures: **color · type · imagery · voice · mark ·
texture.** On any candidate (an outfit, a palette, a face, a mark) she sets, by hand, how close
it is to the thing in her head: a dial that reads as a number ("hits home: 72") and a note in
her words ("colors are good, the logo is too corporate, the typeface is 50% there but not
quite"). Two things fall out of that without any extra work from her:

- **The whole-brand reading.** Six aspects, each at its best candidate's closeness. It rises
  as locks land: *color 90 · type 50 · mark 20 · voice 80.* This is the progress instrument
  note 39 asked locking to be, and it answers "how far are we" at a glance across sessions.
- **The NOs with reasons.** "Too corporate" goes straight into the brief as an avoid, next to
  the thing it was said about.

With two people, each sets their own; the gap between the two readings, per aspect, is the
tension map again, one level down. *Law it passes:* the number is hers, never computed. The
tool never says how close anything is. *Cost:* M. *Lands in:* stage 5 and 7.

### 2. Your words are the specimen

The voice · feel · values copy she writes (decision 3) is what every typeface is set in, on
every outfit, from the first try-on. No lorem, no fox, no sample sentence of ours. She judges
a face reading her own line about her brand, in her palette, next to her reference. The
specimen engine splits her paragraph into title · subhead · body roles on its own. The same
copy fills the mini brand preview (her project name, her line).

This inverts the order she might expect: rough words first, even three of them, then try on.
It is also what makes note 23 true in practice: color, type, and imagery judged together, and
now *voice* with them. *Law:* synthesis from her material only. *Cost:* S once stage 5 exists.

### 3. Rapid words (the generative activity that writes the copy)

The word-association exercise from design workshops, run on her own pile. A kept reference
appears for five seconds; she types the first word; the next appears. Twenty to thirty words in
two minutes. Both people do it alone; the reveal shows the overlap. The words become note
cards, sorted with the same round as everything else; the survivors become the *feel* line of
the brief and, for a project without a name, the candidate names. *Law:* activities are
offered never imposed; output survives into the spec (it *is* the copy). *Cost:* S–M.

### 4. The provenance thread

Every item in the brief is a link back to its trail: this palette ← the group "…" ← six
references ← who brought each ← kept in round 2 by both ← rated 90 by her, 60 by him. For the
designer receiving the brief, it is the *why* without a meeting. For her, it is "you stay the
author" as evidence, not a slogan. *Law:* the carry makes a linked copy (finding 4); private
votes are per person (Phase 1). Both are prerequisites, so this is nearly free once they land.
*Cost:* M. *Beyond:* no tool she could pick up records the why; this one does it as a
by-product of using it.

### 5. The advocate round on the split

After the reveal, every split card gets one line from each of them: *why I kept it · why I cut
it.* Then a re-vote. The lines land in the brief either as a keep with two voices or as a NO
with a reason. It turns disagreement into language, which is the point of putting two people
in a room. *Law:* the tool asks, never decides. *Cost:* S after Phase 1.

### 6. The round on a phone, and for a third person

The one-card-at-a-time overlay is already phone-shaped. Her partner reacts in five minutes on
a phone before the call. The same link, with a `react only` scope, lets a third person (the
designer, a friend) run a round without an account and without seeing the board. Their votes
show up as a third column on the reveal. *Cost:* S after Phase 1 (a responsive pass on the
round overlay + the scope flag).

### 7. The handoff page

The brief as a read-only link the designer opens: the copy, the approved pool with roles and
contrast verdicts, the faces with their reason, the key references, the NOs. **Rights-aware**
by construction: references that are not publishable appear as palette + credit, never as
pixels (`RIGHTS.md`). **Tokens as Figma variables** in the two-layer contract (primitive ramps
+ semantic aliases), and a print PDF through the existing seam. The designer can leave comment
pins on it (the schema exists); comments come back onto the canvas as cards. *Cost:* M–L.
*Beyond:* the token export and the rights gating are the parts she could not build herself,
and they are what make the handoff professional rather than a screenshot.

### Later, only if the evidence asks for them

- **The session film.** Everything is logged, so the narrowing can be replayed: cards moving,
  names appearing, the split resolving. "Witness the progression" (note 30) as a story to show
  a client or a team. Its output is a process artifact, not spec content, so it waits.
- **Siblings in the pile.** "More like this" *within her own pool*: by palette distance now
  (OKLab exists, cheap), by image embedding later (a local model; L). Offered as a halo of
  suggested neighbors while naming, never auto-grouped. Passes synthesis-from-your-taste
  because it never leaves her material.

### What this does to the plan

Phase 0 adds the `mc` project and its import. Phase 1 adds the advocate round and the phone
pass (5, 6). Phase 2 is Try it on with her words as the specimen and the fit map (1, 2).
Phase 3 is the brief in her shape with the provenance thread (4) and the handoff page (7).
Rapid words (3) slots beside stage 4 whenever she wants a name or the copy; it does not block
anything.
