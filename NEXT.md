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

### PDF export — one-click SHIPPED 2026-05-27 *(commit `2649999`)*
"↓ Download PDF" in the Export modal's Brand book tab renders the /print page
in headless Chromium and streams a Letter-landscape PDF — no Cmd+P. Stack is
`puppeteer-core` + `@sparticuz/chromium` (NOT full puppeteer — won't run on
Vercel and is huge). The headless browser has no session, so the client posts
the brand snapshot and the route seeds it into localStorage before boot
(reuses the signed-out editor path) + palette via `?palette=`. Verified
locally (5-page PDF, custom fonts + palette render). **Prod TODO: verify on
Vercel after deploy** — serverless Chromium can't be tested locally; may need
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

**Phase 2b — Font pairing engine** *(SHIPPED 2026-05-27)*
- **Manual picker — SHIPPED (was already built).** `TypePanel` +
  `FontPicker` search the full Google Fonts catalog (~1934 families via the
  public metadata endpoint, no key), plus upload + custom URL, applied live
  via `FontLoader`. Discoverability fixed (slots say "Choose a font," not
  "—"). So "pick any font" is done.
- **Faceted browser — SHIPPED 2026-05-27** *(commit `faa290b`)*. A "Browse
  all" surface (`components/FontBrowser.js`, portaled to body) filters the
  full catalog by facets computed server-side from Google's own metadata:
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
  the palette's OKLCH profile (vivid → expressive moods, muted → quiet),
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

**Phase 3 — Combos as the sketch unit + Decide surface** *(Decide SHIPPED 2026-05-27, commit `d9e76b3`)*
- **`/decide` page — SHIPPED.** Pick up to 5 saved Brand Presets, see them
  side by side at full Brand-page fidelity (real `BrandPreview`, auto-scaled
  via `FigmaFrame`). Same wordmark; each preset brings its palette + type +
  role overrides. Dark/light toggle, union FontLoader, palette swatches named
  via Name That Color. Added as path step 05 "Compare" (home grid + PathFooter
  auto-pick-up; gradients/print renumbered 06/07). Step body copy is
  placeholder-quality — wants Lorin's voice pass.
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
    palette so Shuffle works on first visit. **Swap in Lorin's real
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
    Lorin's `pinterest.com/lorinanderberg1/moodbuilder` board (33 pins
    captured, 31 mirrored — 2 i.pinimg originals 403'd). Pipeline:
    `npm run sample <board.json>` (`scripts/build-sample-studio.mjs`)
    mirrors + downscales images into `public/sample/` (~3.1 MB, max
    1000px / q80 jpeg), extracts a palette per pin, derives a brand +
    starred + source set from the board's colors, and bakes it into
    `lib/sampleStudio.data.json`. Re-runnable with a new board JSON.
    The "Your Brand" project template (wordmark / tagline / body) stays
    hand-authored in `lib/sampleStudio.js`. Verified: all 31 render
    from the local mirror, 0 broken; Brand page composes from the
    board's palette.
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
    infra-only and Lorin's to do: rename the Vercel project / domain off
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
    (2) "Sample" labeling so the seeded studio doesn't read as a real
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
    `AUTH_REQUIRED=false` on Vercel — **with Lorin's explicit OK**,
    since it's the production-facing switch.
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
   you're at it (bare `@moodbuilder` is taken by a dormant squatter).
2. **Add the domain in Vercel** → Project → Settings → Domains → add
   `moodbuilder.studio`, set it as the Production domain. Vercel shows the
   DNS records to set at the registrar; wait for it to verify.
3. **Google Cloud Console (don't remove the old URI yet):**
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
   sign-in and a magic-link sign-in end to end. (Sessions don't carry
   over from the old domain — cookies are domain-scoped — so you'll
   re-login. Expected.)
6. **Retire the old subdomain:** Vercel → Settings → General → rename the
   project so the default becomes `moodbuilder.vercel.app`;
   `moodvote.vercel.app` stops resolving. (Safe now that `AUTH_URL` points
   at the custom domain, not the subdomain.)
7. **Resend (optional but on-brand):** verify `moodbuilder.studio` as a
   sender domain and set the from-name/address to Moodbuilder (e.g.
   `noreply@moodbuilder.studio`) so magic-link emails aren't generic.
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
    breakage risk. Also can't be tested without an account.
  - **Behance — hardest.** Adobe closed its public API to new keys years
    ago; scraping is ToS-risky and brittle. Lowest priority.
  - **Rule going forward:** only build adapters against sources with a
    free/public read path we can actually test. No blind adapters (Savee,
    etc. deferred until testable).

---

## Resources & competitive map *(from Lorin's bookmarks, 2026-05-26)*

Parsed 409 bookmarks by content (folders were unreliable — Klim was filed
under "Shopping list," 176 links sat in an unnamed root bucket). The signal,
and what it means for the build.

### The Type step is really two layers
Lorin collects **independent and premium foundries**, almost none on Google
Fonts. So the Type step can't be only a Google Fonts search box — that's not
where her taste lives. It's:
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
  nothing; we pair from the user's *collected* type taste.
- **Huemint**, **EnigmaEasel** — AI palette generators. Same contrast:
  they generate; we synthesize from what the user already loves. Confirms
  the wedge is defensible — nobody's doing taste-driven synthesis.
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
  to `/api/import/pinterest` → background enrichment fetches each pin's
  source URL with concurrency 6 → library updates incrementally (refresh
  to see new source badges).
