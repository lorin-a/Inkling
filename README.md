# Moodbuilder

Moodbuilder: Transform inspiration into brand identity.

## What it is

This was created to solve the gap between screenshotting Pinterest
boards to put in Figma for moodboarding by bringing them together in
one place. With too many options for color inspiration and disparate
tools, Moodbuilder puts what you need in one place to go from idea to
inspiration to brandbook mockups.

## What it does today

Local-first brand studio. One active project at a time. Real exports
out.

- **`/`** — homepage, project picker, create or switch the active project.
- **`/brand`** — live wordmark composition, role mapping, palette
  shuffle, click-to-recolor, marks gallery, export menu.
- **`/colors`** — starred set, curated palette rows, brand swatches,
  moodboard-derived pool.
- **`/gradients`** — linear, radial, and conic builder over the active
  palette.
- **`/import`** — Pinterest board capture via a bookmarklet, then drop
  the JSON onto this page.
- **`/library`** — pin grid with palette extract, manual upload, modal
  editor.
- **`/print`** — five-page brand book at letter landscape, browser-print
  to PDF.

## Data layout

Everything is on disk. No database.

```
data/
  active-project.json        # { slug }
  projects/{slug}/
    project.json             # name, wordmark, period, initial, tagline, body
    library.json             # pins, starred hexes, boards
public/
  projects/{slug}/
    uploads/{hash}.{ext}     # user-uploaded images
    marks/*.svg              # per-project marks
```

API routes resolve the active slug via `lib/projectRegistry.js`.

## Stack

- Next.js, App Router. The in-repo `node_modules/next/dist/docs/` is
  the source of truth for framework APIs in this version. See
  `AGENTS.md`.
- CSS Modules. No Tailwind, no UI library.
- Node filesystem for persistence.
- Client-side palette extraction via `lib/extractPalette.js`.

## Running

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Roadmap, open questions, current task

See **`NEXT.md`**. That doc holds the working roadmap, the recommended
next-session order, known gaps, and open product questions. This
README is the door; `NEXT.md` is the workbench.
