# Moodbuilder — next session plan

State of the tool at the end of the 2026-05-13 session, and the natural next
moves. Read this top-to-bottom before picking up.

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
inherits Whelm's marks, which is wrong.
**Fix:** move marks under `public/projects/{slug}/marks/`. Add a
`/marks` page or library-style upload UI for dropping SVGs into the
active project. `MarksFrame` reads from the active project's marks
directory.

### No project switcher on sub-pages
Today the only way to switch projects is going back to `/`. Sub-page
toolbars (`/brand`, `/library`, etc.) should show a small project chip
near the title with a dropdown to switch without losing your spot.

### Saved palettes (★ Save) aren't project-scoped
They use a single `localStorage` key (`moodbuilder.favorites.v1`). When
you switch projects, you see Whelm's saved palettes inside the new
project. Should be `moodbuilder.favorites.v1.{slug}` per project.

### Pinterest bookmarklet has no project target
The bookmarklet downloads JSON; the `/import` drop zone commits to
whichever project is active right now. Two improvements worth
considering:
- Add a project picker inside the `/import` page before commit.
- Or stamp the bookmarklet's filename with the active slug at the time
  of capture so it carries intent.

### Brand-page picker variants
Light variant flips bg↔ink in auto-derivation, but role *overrides* are
fully independent per variant. If a user only overrides dark and never
touches light, light still auto-derives from the same palette — that's
the right default. Worth documenting in tooltips so it's obvious.

### Font pairing (deferred from earlier)
Display / Body slots with Google Fonts search + Fontshare + local upload
+ custom URL. Designed but not built. Lives next to color in the Brand
page identity. Saved Brand Presets should capture palette + fonts as one
object — already structured in `lib/exportFormats.js` for the JSON
preset, just needs UI.

### PDF export is browser-print only
Works fine but depends on the user clicking Cmd+P. An `/api/brand/export.pdf`
endpoint via Puppeteer would let "Download PDF" be one click. Adds ~300MB
to deps (Chrome). Worth doing once we're closer to publishing.

### Figma plugin
"Open in Figma" is currently a JSON download with import instructions.
Publishing a real Figma plugin (`Moodbuilder` in the Community plugins)
would make it a one-click pull. Separate small project — talk through it
when ready.

---

## Recommended next-session order

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
   `lib/exportFormats.js`; the UI is what's missing.
   Open: replace `★ Save`, or live alongside as `Save preset`?

7. **Crowd voting on Brand Presets** *(major, days)*
   Vision: share the tool with users + teams, let them explore, save
   options, and vote — the audience designs the brand. Voting needs:
   - Persistence beyond local filesystem (DB or hosted KV).
   - Shareable URLs per voting session.
   - Voter identity (lightweight session + optional name).
   - Configurable per-share: private invite-only or public-with-link.
   - Configurable per-share: vote on whole Brand Presets or on
     individual elements (palette, fonts, marks).
   - Results view: aggregate scores, comments, top picks.
   Precondition: Brand Presets (#6) must land first. Architecture
   shift from local-first to hosted — talk through deployment target
   before starting.

8. **Figma plugin scaffold** *(separate small project, 1-2 days)*
   `npx create-figma-plugin` boilerplate. Reads from the local
   Moodbuilder server (or a deployed instance) and writes Figma
   Variables + text styles. Publish to Figma community.

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
  to `/api/import/pinterest` → background enrichment fetches each pin's
  source URL with concurrency 6 → library updates incrementally (refresh
  to see new source badges).
