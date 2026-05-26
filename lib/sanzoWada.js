/**
 * Sanzo Wada starter pool — the zero-input on-ramp.
 *
 * A new project has no pins and no palette, so shuffle has nothing to compose
 * from and the "I have nothing" user stalls at step one. This seeds a built-in
 * historical color library (Sanzo Wada, 1933) so composition works on day one,
 * before any import. Surfaced as a "Sanzo Wada (1933)" source on Brand.
 *
 * Data baked by scripts/build-sanzo.mjs from the vendored MIT source.
 */
import data from "./sanzoWada.data.json";

/** 159 unique historical colors — the pool shuffle/compose draws from. */
export const SANZO_POOL = data.pool;

/** 228 ready-made 3–4 color combinations, for a future "browse starters" UI. */
export const SANZO_COMBINATIONS = data.combinations;

export const SANZO_ATTRIBUTION = data.attribution;
