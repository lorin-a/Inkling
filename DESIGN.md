# Design

Inkling's visual system. The source of truth is `app/globals.css` (tokens) + `~/.claude/GRID.md`
(grid craft + the pre-ship gate). Keep variants on-brand by reading both. The brand is **locked**
— see PRODUCT.md → "Deliberate divergences" before flagging anything here as an AI tell.

## Theme

Editorial / publication rigor on warm paper — mastheads, edition lines, hairline rules, a mono
system index, specimen plates. Sharp corners, flat decisive buttons. NOT soft-rounded-trendy,
NOT Canva. The user's art is the hero; chrome is a quiet structured frame. Light, warm, creamy
ground; warm near-black ink; a surgical two-colour spark.

## Color Palette

OKLCH-friendly hex, defined in `globals.css`. Spark colours are used **surgically** (a dot, one
word, an active marker, the CTA arrow) — never as fills.

| Role | Token | Value | Notes |
|---|---|---|---|
| Ground (newsprint) | `--bg` | `#f7f6f2` | Cooler/truer than the old cream `#f9f4ec` (2026-06-11) — a near-neutral ground doesn't recolour the user's art. Warmth lives in ink + accent + the pins, not the bg. |
| Ground (deeper) | `--bg-warm` | `#efeee9` | Bands, feedback panels. |
| Elevated | `--bg-elevated` | `#fdfdfb` | Cards, inputs, drop zones. Near-white, neutral. |
| Ink | `--ink` | `#1c1810` | Warm near-black. Body text. |
| Ink muted | `--ink-muted` | `#8a7f70` | Secondary text (verify ≥4.5:1 on bg). |
| Ink faint | `--ink-faint` | `#b6ab99` | Index numbers, ghosts — decorative only. |
| Hairline | `--hairline` / `--hairline-soft` | warm alphas | Soft dividers. |
| Rule | `--rule` | `#2a2419` | The hard editorial section rule (1.5px). |
| Spark — primary | `--accent` | `#6a2ee6` | Ultraviolet / instinct. |
| Spark — pop | `--pop` | `#f0531f` | Tangerine / warm pop (arrows, active marks). |

Elevation: `--elev-1/2/float` (warm, subtle). Grain overlay at 4% via `--grain`.

## Typography

- **Display + statements:** Fraunces (`--font-serif`) — its SOFT/WONK/opsz axes animate headings.
- **Body / UI:** Noto Sans (`--font-sans`).
- **System labels, index numbers, captions, kickers:** Noto Sans Mono (`--font-mono`), uppercase,
  letter-spacing ~0.08–0.14em.
- Hierarchy by **≥3:1 size ratio** (display vs mono caption), not timid 1.5:1. Display clamp ceiling
  ~52–72px on inner heads, larger only on the landing hero. `text-wrap: balance` on big heads.

## Components

Masthead (wordmark `inkling.` + `No. 01 · Est. 2026` edition line + nav, bottom rule); the index
(mono number + serif label + description, hairline-divided — 3-up on landing, step-rows on import);
specimen plates (art captioned like catalogue plates); editorial tab selector (underline, not pills);
squared inputs with rule borders; flat ink buttons (`--radius-sm`) with a `--pop` arrow; paper-toned
feedback panels (NOT stoplight green/red); `BrandShuffle` living-brand hero (GSAP). Cards are used
sparingly (project cards, source forms) — never nested, never an identical repeated grid.

## Layout

**The grid is defined once** — `components/Grid.js` (`<Bleed>`, `<Grid>`) + tokens. Read `~/.claude/GRID.md`
and run its pre-ship gate before shipping any layout.

- **Spacing scale (4pt):** `--space-3xs…3xl` (4·8·12·16·24·32·48·64·96). Never an off-scale value.
  Tight 8–12px within a group, generous 48–96px between sections. Use `gap`, not margins.
- **Grid:** `--grid-cols: 12`, `--gutter: var(--space-xl)`. Sections share it → things align down the page.
- **Fluid frame:** `--bleed: clamp(24px, 4.5vw, 64px)` (section edge), `--rhythm: clamp(56px, 8vw, 112px)`
  (vertical section padding). Full-bleed editorial rules; content composes on the 12-col grid.
- **Register split (see PRODUCT.md):**
  - **Brand** (`/`, `/import`): asymmetric, fluid, grid-breaking for emphasis; visible grid edges
    (metadata harness — top-left label, top-right meta, left context rail); ≥3:1 scale contrast.
  - **Product** (studio / gather / build): predictable, consistent density; structural responsive.
- Responsive: 12-col collapses to 1-col at ≤880px.

## Motion

GSAP installed. Apple-restraint easing (`--ease-out` cubic-bezier(0.22,1,0.36,1)); **no bounce/spring/
overshoot.** Entrance reveals enhance an already-visible default (never gate visibility on a class).
Staggered list reveals OK; avoid one uniform reflex on every section. `prefers-reduced-motion` settles
to a still, legible arrangement, content always visible. The tactile "pile" (Gather/Play) is the
validated motion language for the divergent half; Build stays clean.
