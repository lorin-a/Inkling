# Sourcing & Rights — the ethical model (plan)

The plan for making Inkling ethical, legal, and *educational* about image rights —
so importing inspiration never puts Lorin (or a user) at risk, and the product
teaches good citizenship instead of quietly betting nobody checks.

Status: **proposed, 2026-06-11.** Supersedes the floating legal open-question in
STATUS ("official API vs scraping bookmarklet"). Not legal advice — see the last section.

---

## The problem in one paragraph

Today Inkling captures Pinterest boards by **auto-scrolling and scraping the DOM**
(`lib/pinterestBookmarklet.js`), then a **server-side fetcher hits Pinterest pin
pages with a spoofed Safari user-agent** to harvest source links
(`lib/pinterestSourceFetcher.js`), and stores copies of the images in a persistent
library. Each of those three moves trips a different wire. The fix is not a cleverer
scraper. It is a change to *what the product treats as the thing it owns.*

## Two risks, kept separate

They get conflated and they have different fixes. Hold them apart.

1. **Platform terms (a contract).** Pinterest's ToS forbids accessing data "by
   automated means." The auto-scroll + `MutationObserver` harvest is automated
   access; the server-side spoofed-UA fetch is worse because it runs under *our*
   infrastructure. Realistic exposure: IP/account blocks, a cease-and-desist, a
   breach claim. Fix = stop the automated access; use sanctioned channels.
2. **Copyright (independent of any platform).** The images belong to their original
   creators, not to Pinterest and not to the user who saved them. Saving a pin grants
   no license. Attribution is courtesy, **not** a license. Fix = never republish what
   you don't own or aren't licensed to use; gate that at *publish*, not at import.

The official Pinterest API solves (1) and **not** (2) — and its own no-storage rule
(below) makes it a poor fit anyway. So the model has to answer both directly.

## The model

Three moves. Each resolves a constraint that recurs across *every* source, not just
Pinterest.

### A. Reference, don't replicate

The durable, owned artifact is **the palette + the brand decisions + the user's own
uploads** — our analysis and their property. Nobody's terms touch those. A third-party
reference image becomes a **pointer**, never a stored file:

- source URL + extracted palette + attribution metadata + a license tag
- displayed by **hotlinking the live URL** (the pixels stay at their origin, like an embed)
- if the source link dies, **the swatch remains** — colour was always the point

This single reframe satisfies the no-store rules that show up in *both* Pinterest's API
guidelines (*"you may not store any information accessed through the API… call the API
each time"*) **and** Unsplash's API guidelines (*"permanent self-hosting or storage of
images is not permitted"*). One architecture, every source.

> Honest caveat: storing an extracted palette derived from an API image sits in a gray
> zone under a maximally-strict reading of "don't store information from the API." A
> palette is our transformation, not their content, and we discard the image — about as
> defensible as it gets, and aligned with what the rule is *for* (don't replicate the
> platform's data store). Build on it; keep it noted, not hidden.

### B. The gate is at *publish*, not at *import*

This maps exactly onto Inkling's own shape:

- **Gather / Play** (private, inward) — fair use. Reference *anything*. Private,
  transformative ideation is how designers actually work and is legally fine.
- **Build / publish / community gallery** (public, outward) — only content the user
  **owns** or that is **openly licensed**, attributed regardless.

The palette a Pinterest reference produced carries all the way through (colour isn't
copyrightable). Only the specific borrowed *pixels* can't appear in published output.
The honest seam: a published brand book swaps "the ref that nailed the mood" for an
openly-licensed image *in that same palette*, or the user's own photography. Inkling
makes that swap feel like a finishing move, not a tax.

Terminology fix while we're here: the goal is **owned or openly licensed**, not
"royalty-free." Royalty-free is a *pricing* model (Shutterstock is royalty-free and
paid and restricted). What we want is explicit reuse permission: Unsplash License,
Pexels License, Creative Commons, CC0, public domain — and attribution above the legal
floor.

### C. Teach at the seam (the *educational* layer)

The product's existing principle — *"every reference keeps a line home to its source"* —
becomes visible and instructive instead of decorative. This is the differentiator and
the portfolio story: a tool that models and teaches rights literacy by doing, never by
lecturing (principle #3: cultivate understanding, don't supply it).

- **Provenance chip** on every reference: who made it, what license, a clickable home.
- **Publish-gate explainer**, quiet and one-time-feeling: *"Published work uses only
  what you own or that's openly licensed. These 3 references shaped your palette; they
  won't appear in the book. Replace or swap?"* — teaches the fair-use-vs-publish line
  by walking the user through it.
- **Auto-generated credits** in every export: the brand book ships with an attribution
  colophon, modelling the practice the user should carry into their own work.
- **A rights legend** — CC0 · Unsplash · Pexels · Your upload · Reference-only — so the
  status of every image is legible at a glance.

## Source-by-source policy

| Source | Access channel | Store the file? | Publishable? | Notes |
|---|---|---|---|---|
| **User uploads** | direct | **Yes** (they own it) | **Yes** | The cleanest source. Their screenshots, scans, photos. |
| **Pexels** | official API (free) | **Yes** (license permits) | **Yes** | Attribution appreciated not required; no standalone resale; no trademark/brand depictions for commercial goods. The publishable well. |
| **Unsplash** | official API (free) | **No — hotlink only** | Yes, *as a hotlinked embed* | Must attribute photographer + Unsplash w/ `utm` params; must ping `download_location` on use; don't build an Unsplash clone. Reference-row, not store-row. |
| **CC0 / public domain / Openverse / Wikimedia** | API / direct | **Yes** | **Yes** | Breadth of openly-licensed supply for later. |
| **Pinterest** | the user's **own data export** (Settings → Privacy & Data → Download your data) | reference only (palette + attribution) | **No** — informs palette only | User exercises their data-portability right through Pinterest's sanctioned channel and hands us the file. Replaces the scraper entirely. |
| **Are.na** | open, documented API (already integrated) | reference only | No (third-party pixels) | Friendly terms; promote it as a first-class rail. |
| **Paste-a-link / web** | direct | reference only | No (unknown rights) | Keep attribution; informs palette. |

## Implementation plan (in order)

**Phase 0 — de-risk now (smallest change, biggest risk drop).** Before any public
launch: **delete `lib/pinterestSourceFetcher.js`** and its callers (server-side
spoofed-UA scraping is the single most exposed piece), and **stop the auto-scroll
harvest** in `lib/pinterestBookmarklet.js`. These two are the "automated means" the ToS
names. Nothing downstream needs them once Phase 1 lands.

**Phase 1 — the rights data model.** Every pin/reference carries provenance. Add a
`rights` shape to the pin model (`lib/storage/localStore.js`, `lib/db/moodboards.js`,
the import commit path):
```
rights: {
  source: 'upload' | 'pexels' | 'unsplash' | 'pinterest-export' | 'arena' | 'link' | 'cc0',
  license: 'owned' | 'pexels' | 'unsplash' | 'cc0' | 'cc-by' | 'public-domain' | 'unknown',
  storeable: boolean,    // may we hold the file, or hotlink only?
  publishable: boolean,  // may it appear in exported / public output?
  attribution: { author, authorUrl, sourceUrl }
}
```
Put the per-source defaults in one module — **`lib/rights.js`** — as the single source
of truth, so import paths and the publish gate read the same policy.

**Phase 2 — clean supply.** Add **Pexels** as a source tab first (storeable +
publishable + simplest terms — proves the whole model end to end). Then **Unsplash**
(reference well; wire the attribution `utm` links and the `download_location` ping).
Reframe the **Pinterest** tab from the bookmarklet to **"Import your Pinterest data
export"** (a small adapter on the existing JSON-drop flow — confirm the current archive
format carries image URLs first).

**Phase 3 — the publish gate.** At Build / export and the (future) community gallery,
filter to `publishable: true`. For non-publishable references that shaped the palette,
surface the swap flow from move B.

**Phase 4 — the educational layer.** Provenance chips, the publish-gate explainer,
auto-generated export credits, the rights legend (move C).

**Phase 5 — community gallery, gated.** Ship it *only* over owned / openly-licensed
content. This is the feature that most raises copyright risk, and the model above is
what makes it safe instead of a liability.

## What this retires

- `lib/pinterestSourceFetcher.js` — deleted.
- The auto-scroll / `MutationObserver` harvest in `lib/pinterestBookmarklet.js` —
  removed (the file may survive as a thin "open your export" helper, or go entirely).
- The "library = stored copies of everyone's images" assumption — replaced by
  "library = palettes + decisions + owned/licensed files + live references."

## Open decisions (Lorin's call)

1. **Pinterest, fully out or kept as data-export only?** The export path is clean but
   adds a step for the user. Are.na + Pexels + uploads may be enough that Pinterest
   isn't worth even that.
2. **Unsplash now or later?** Its hotlink + download-ping rules are more plumbing than
   Pexels. Pexels alone may cover the publishable need at launch.
3. **How loud is the educational layer?** A whisper (chips + colophon) vs a teaching
   moment at the gate. Recommend: whisper everywhere, one teaching moment at publish.

## Not legal advice

This maps the platform terms and the realistic risk; it is not a legal opinion. Before
the community-publishing feature ships, one hour with someone who does IP / platform law
is worth it — that feature is where the real exposure concentrates.
