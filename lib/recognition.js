import { deltaEOK, oklchFromHex, relativeLuminance } from "./colorTheory";
import { PAIRINGS, paletteProfile } from "./fontPairings";

/**
 * The recognition engine — the pure core of the YES/NO loop.
 *
 * The whole reframed product rests on one claim: that *reacting* to your own
 * inspiration (recognition — "I know it when I see it") converges on a direction
 * you feel, where *articulating* it forward can’t. You react to whole reference
 * pins; this reads the one honest signal every pin already carries — its
 * extracted colour palette — and turns the accumulating YES (and the informative
 * NO) into two things:
 *   1. steering  — which pin to show next, so the queue tightens toward your
 *                  taste instead of slot-machining a fresh random card each time;
 *   2. a direction — a composed colour palette + a suggested type voice that
 *                  crystallises from what resonated, updating cumulatively.
 *
 * Pure: no I/O, no React, no `Math.random()` — the same reactions always yield
 * the same direction, so convergence is real and the "settling" signal means
 * something. (The shipped `composePalette` / `suggestPairing` engines sample
 * randomly for *variety*; that’s the opposite of what a convergence loop needs,
 * so this composes deterministically with the same `colorTheory` primitives and
 * the same curated `PAIRINGS`.)
 *
 * Mirrors the `extractBoardMaterials` pattern: a small, testable distiller.
 */

/** The five reactions, warm → cold. `weight` drives both the steering profile
 *  and which colours feed the emerging direction. */
export const REACTIONS = [
  { key: "yes", label: "YES", weight: 2, resonant: true, hint: "This is it" },
  { key: "sure", label: "Sure", weight: 1, resonant: true, hint: "Yes, quietly" },
  { key: "maybe", label: "Maybe", weight: 0, resonant: false, hint: "On the fence" },
  { key: "meh", label: "Meh", weight: -1, resonant: false, hint: "Not really" },
  { key: "nope", label: "Nope", weight: -2, resonant: false, hint: "Pull away from this" },
];

const WEIGHT = Object.fromEntries(REACTIONS.map((r) => [r.key, r.weight]));

export function reactionWeight(key) {
  return WEIGHT[key] ?? 0;
}

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const isHex = (s) => typeof s === "string" && HEX6.test(s);
const TOP = 4; // the dominant colours that actually carry a pin (k-means head)
const SIGMA = 0.09; // OKLab affinity falloff — ~one perceptual step

const gauss = (d) => Math.exp(-((d / SIGMA) ** 2));

function dedupeHex(hexes) {
  const seen = new Set();
  const out = [];
  for (const h of hexes) {
    if (!isHex(h)) continue;
    const k = h.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

const orderByLum = (hexes) =>
  hexes.slice().sort((a, b) => relativeLuminance(a) - relativeLuminance(b));

/**
 * Fold the reaction history into the resonance profile.
 *
 * Each reacted pin contributes its dominant colours, scaled by reaction
 * magnitude, to a *liked* region (YES/Sure) or a *rejected* region (Meh/Nope).
 * "Maybe" is a true neutral — it records that the pin was seen (so it leaves the
 * queue) but adds no colour signal. `likedColours` is the deduped pool the
 * direction composes from.
 *
 * @param {{pin: object, key: string}[]} reactions  chronological reaction log
 */
export function buildProfile(reactions = []) {
  const liked = []; // { hex, weight }  weight > 0
  const rejected = []; // { hex, weight }  weight > 0 (magnitude)
  const likedColours = [];
  const likedPins = [];
  const rejectedPins = [];
  const seen = new Set();

  for (const r of reactions) {
    const w = reactionWeight(r.key);
    const pal = (r.pin?.palette || []).filter(isHex);
    if (w > 0) {
      likedPins.push(r.pin);
      for (const hex of pal.slice(0, TOP)) liked.push({ hex: hex.toLowerCase(), weight: w });
      for (const hex of pal.slice(0, 5)) {
        const h = hex.toLowerCase();
        if (!seen.has(h)) {
          seen.add(h);
          likedColours.push(h);
        }
      }
    } else if (w < 0) {
      rejectedPins.push(r.pin);
      for (const hex of pal.slice(0, TOP)) rejected.push({ hex: hex.toLowerCase(), weight: -w });
    }
  }

  return {
    liked,
    rejected,
    likedColours,
    likedPins,
    rejectedPins,
    resonantCount: likedPins.length,
    hasSignal: liked.length > 0 || rejected.length > 0,
  };
}

/** Strongest weighted affinity from one colour to a region (0 = unrelated). */
function bestPull(hex, region) {
  let best = 0;
  for (const s of region) {
    const a = s.weight * gauss(deltaEOK(hex, s.hex));
    if (a > best) best = a;
  }
  return best;
}

/**
 * How much a pin resonates with the profile so far: pulled toward the liked
 * region, pushed away from the rejected one. Averaged over the pin’s dominant
 * colours so palette length doesn’t bias the score.
 */
export function pinAffinity(pin, profile) {
  const pal = (pin?.palette || []).filter(isHex).slice(0, TOP);
  if (!pal.length) return 0;
  let score = 0;
  for (const hex of pal) {
    score += bestPull(hex, profile.liked) - bestPull(hex, profile.rejected);
  }
  return score / pal.length;
}

/** Mean pull toward the liked region only — used to find the most *contrasting*
 *  pin (least like what you’ve loved) for a boundary-testing probe. */
function likedPull(pin, profile) {
  const pal = (pin?.palette || []).filter(isHex).slice(0, TOP);
  if (!pal.length) return 0;
  let s = 0;
  for (const hex of pal) s += bestPull(hex, profile.liked);
  return s / pal.length;
}

/** Remaining pins sorted by affinity, highest first (stable on ties). */
export function rankRemaining(remaining, profile) {
  return remaining
    .map((pin, i) => ({ pin, i, score: pinAffinity(pin, profile) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.pin);
}

/**
 * Choose the next pin to react to — the steering that makes this converge
 * instead of slot-machine.
 *
 *   - cold start (no signal): take the queue as given (the API hands them
 *     starred-first, then most-recent) so the first cards are representative.
 *   - resonant turns: surface the highest-affinity pin — you feel it learning.
 *   - every 3rd turn (`contrastEvery`): surface the *least* liked pin instead —
 *     a deliberate contrast probe. The informative NO is what sharpens the YES
 *     (and a surprise YES here broadens the direction); without it the queue
 *     becomes an echo chamber that only ever shows you more of the same.
 *
 * `turn` is the 0-based count of reactions already made.
 * Returns `{ pin, reason }` or null when the pool is exhausted.
 */
export function pickNext(remaining, profile, { turn = 0, contrastEvery = 3 } = {}) {
  if (!remaining || remaining.length === 0) return null;
  if (!profile.hasSignal) return { pin: remaining[0], reason: "coldstart" };

  const isProbe = remaining.length > 1 && turn > 0 && (turn + 1) % contrastEvery === 0;
  if (isProbe) {
    let probe = remaining[0];
    let least = Infinity;
    remaining.forEach((pin) => {
      const p = likedPull(pin, profile);
      if (p < least) {
        least = p;
        probe = pin;
      }
    });
    return { pin: probe, reason: "contrast" };
  }
  return { pin: rankRemaining(remaining, profile)[0], reason: "resonant" };
}

// — Direction composition (deterministic) —

function pickMuted(rest, accent) {
  // A quieter cousin: lowest-chroma colour that’s perceptually distinct from
  // the accent, so the direction reads as a system, not one loud hue twinned.
  let muted = null;
  for (const c of rest) {
    if (accent && c === accent) continue;
    if (accent && deltaEOK(c.hex, accent.hex) < 0.04) continue;
    if (!muted || c.C < muted.C) muted = c;
  }
  return muted;
}

function pickFiller(rest, chosen) {
  // The colour that most widens the luminance spread of what’s chosen —
  // deterministic argmax, so the direction only shifts when a reaction earns it.
  let filler = null;
  let bestGap = -Infinity;
  for (const c of rest) {
    if (chosen.includes(c)) continue;
    const gap = Math.min(...chosen.map((p) => Math.abs(p.L - c.L)));
    if (gap > bestGap) {
      bestGap = gap;
      filler = c;
    }
  }
  return filler;
}

function moodWeights({ chroma, lightness }) {
  // Same shape as the shipped pairing engine, minus the random jitter: vivid
  // palettes lean expressive, muted ones quiet, lightness nudges warmth.
  const vivid = Math.min(Math.max((chroma - 0.06) / 0.12, 0), 1);
  return {
    editorial: 1 + vivid * 1.2,
    brutalist: 0.4 + vivid * 1.8,
    geometric: 0.7 + vivid * 1.0,
    modern: 1,
    refined: 1 + (1 - vivid) * 1.2,
    classic: 0.7 + (1 - vivid) * 1.2,
    soft: 0.6 + (1 - vivid) * 1.0,
    warm: 0.6 + (lightness > 0.6 ? 0.6 : 0) + (1 - vivid) * 0.4,
  };
}

/** The pairing whose mood best fits the palette’s character — argmax, no jitter,
 *  so the type voice is stable and only turns when the colour mood really shifts. */
function pickPairing(palette) {
  const w = moodWeights(paletteProfile(palette));
  let best = PAIRINGS[0];
  let bestScore = -Infinity;
  for (const p of PAIRINGS) {
    const score = p.mood.reduce((a, m) => a + (w[m] || 0.5), 0) / p.mood.length;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    } // first-wins on ties keeps the choice stable
  }
  return best;
}

function pairingFonts(pairing) {
  return {
    title: { family: pairing.display, source: "google" },
    subhead: { family: pairing.text, source: "google" },
    body: { family: pairing.text, source: "google" },
  };
}

/**
 * Compose the emerging direction from everything that resonated: a role-ready
 * colour palette (deterministic — darkest + lightest anchors, most-chromatic
 * accent, a quiet muted, a spread-widening filler) plus a type pairing weighted
 * by the palette’s mood. Returns null until at least two liked colours exist.
 *
 * The palette is luminance-ordered so the existing `derivePreviewRoles`
 * recovers bg / ink / accent / muted the same way the rest of the app does.
 */
export function composeDirection(profile) {
  const pool = dedupeHex(profile.likedColours);
  if (pool.length < 2) return null;

  const enriched = pool.map((hex) => ({ hex, L: relativeLuminance(hex), C: oklchFromHex(hex).C }));
  const byL = enriched.slice().sort((a, b) => a.L - b.L);
  const darkest = byL[0];
  const lightest = byL[byL.length - 1];
  const rest = enriched.filter((c) => c !== darkest && c !== lightest);

  let accent = null;
  for (const c of rest) if (!accent || c.C > accent.C) accent = c;
  const muted = pickMuted(rest, accent);

  const chosen = [darkest, lightest, accent, muted].filter(Boolean);
  const filler = pickFiller(rest, chosen);

  const palette = orderByLum(
    dedupeHex([darkest, lightest, accent, muted, filler].filter(Boolean).map((c) => c.hex)),
  );
  const pairing = pickPairing(palette);

  return {
    palette,
    pairing,
    fonts: pairingFonts(pairing),
    poolSize: pool.length,
  };
}

/**
 * How far one composed palette moved from the last — the convergence metric.
 * Both palettes are luminance-ordered, so index-aligned deltaE is meaningful.
 * Near zero = the direction has stopped changing as you react = it’s settling.
 */
export function paletteShift(a = [], b = []) {
  if (!a.length || !b.length) return Infinity;
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += deltaEOK(a[i], b[i]);
  return sum / n + Math.abs(a.length - b.length) * 0.02;
}

export const SETTLE_THRESHOLD = 0.03;

/** The direction is settling once enough has resonated AND the palette has
 *  stopped moving — both, so a single lucky still-frame early on doesn’t claim it. */
export function isSettling({ resonantCount = 0, recentShift = Infinity } = {}) {
  return resonantCount >= 4 && recentShift <= SETTLE_THRESHOLD;
}
