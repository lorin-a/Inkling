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

## Direction *(locked 2026-05-25, refined later same day)*

**Free + profile-less by default. Profile is opt-in for cloud sync.**
The public default at moodvote.app is the full editor working from
in-browser storage with a curated Sample Studio loaded. Signing in is
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
  through `withLock(file, …)` — concurrent extract workers can't corrupt
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

**Phase 2b — Font pairing engine** *(~4 hrs)*
- Curated library of 30-50 pairings (display + body + optional subhead),
  each tagged by mood: refined / brutalist / soft / editorial / etc.
- Shuffle proposes a pair alongside the palette. Lock-and-keep slots like
  palette slots. Per-mood weighting derived from the palette's saturation
  and luminance profile (soft palette → soft pairing, etc.).
- Single biggest manual step in the tool today; biggest win for the
  "generative identity sketchpad" feeling.

**Phase 2c — Starter pool + auto-promote brand colors** *(~3 hrs)*
- Sanzo Wada starter pool (MIT, 348 historical combinations, ready in
  memory) seeds new projects so shuffle works on day one before import.
- When a project's moodboard contains 5+ colors appearing in 3+ pins each,
  the tool proposes them as the project's brand palette. One-click promote
  into `data/projects/{slug}/palette.json`.

**Phase 2d — Library auto-backup + restore-on-corruption** *(~2 hrs)*
- Versioned backups in `data/projects/{slug}/.backups/` — last 10 writes
  plus daily rollups, automatic. When `readLibrary` hits a JSON parse
  error it auto-restores from the most recent valid backup instead of
  silently returning EMPTY (which is what corrupted the file on 2026-05-25
  and made it look like the Pinterest board had vanished).

**Phase 2e — Mobile pass** *(~6 hrs)*
- Mobile's job is *decide and consume*, not *compose*. Compose pages
  (`/brand`, `/library`, `/import`) stay desktop-first and degrade
  gracefully on phones (no broken layouts, no claims they work).
  Real mobile design goes into the Decide surface (Phase 3) and the
  hosted `/v/[token]` viewer.
- Concrete cleanups along the way: barMeta wrap at 390px (`/library`,
  `/colors` clip meta items today); strip the `globals.css` font 404s
  by removing the dead `@font-face` blocks pointing at missing files;
  TypePanel sample text and `/probe` page de-Whelm.

**Phase 3 — Combos as the sketch unit + Decide surface** *(~6 hrs)*
- New lightweight object: `Combo` = palette + font pair, lives in
  `data/projects/{slug}/combos.json`. Cheap to make, cheap to discard.
  Distinct from Brand Presets (full identity snapshots).
- `/decide` page: pick 3-5 Combos or Presets, see them side-by-side at
  full Brand-page fidelity. This is the missing finishing room.
- Promote button on a Combo card creates a Preset seeded from it.

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
  what you compose, they don't add material.

**Phase 6 — Multi-tenant migration** *(in progress; ~70% shipped 2026-05-25)*

The shift from "Lorin's local studio" to "a service strangers can sign
into." File-based editor stays as a fallback during the transition,
controlled by `AUTH_REQUIRED` env flag.

- **6a.0. Multi-tenant DB schema** ✅ shipped *(commit `e75ff32`)*
  Migrations folder with timestamped SQL files. `users`, `accounts`,
  `verification_token`, `projects`, `pins`, `boards`, `palettes_saved`,
  `colors_saved`, `project_palette`, `bookmarked_palettes`,
  `brand_presets`, `schema_migrations`. JWT session strategy so no
  collision with Moodvote's existing `sessions` table.
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
  background extractors don't have to know which backend is in use.
  Home page shows an auth bar + sign-out when signed in, plus a
  welcoming empty state for users with zero projects.
- **6b.3. Production prep** ✅ shipped *(commit `9e8e1a8`)*
  `middleware.js` → `proxy.js` (Next 16 rename). `scripts/claim-projects.mjs`
  transfers placeholder-owned projects to a real user by email — run
  once after first prod sign-in.

**Still to do in Phase 6:**

- **6c. Account-free playground** *(next, ~2-3 days)* — The new
  default landing experience. Replaces "land at /login if unauthed."
  Visitors land in the editor with a Sample Studio loaded. All edits
  go to localStorage. Pinterest import lands in localStorage too
  (small JSONs are fine, ~250 pins worth of metadata is well under
  the quota). Mark/font/texture upload deferred to authed-only for
  now (need blob storage for those). "Sign in to save across
  devices" is the upsell on save actions. Flips `AUTH_REQUIRED=true`
  off in prod once the playground ships.
  Sample Studio content: Lorin picks ~30 sample pins + a starter
  brand template (wordmark, tagline, body, marks). Shipped as static
  JSON in the build.
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
   `lib/exportFormats.js`; the UI is what's missing.
   Open: replace `★ Save`, or live alongside as `Save preset`?

7. **Collaborative Brand Studio + voting — "Moodvote"** *(major, ~20–30 hrs)*

   Vision: collaborators don't just vote on your options, they *use the
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
