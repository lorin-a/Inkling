/**
 * Crop math for image blocks — the frame-vs-image model.
 *
 * A block is a *frame* (w×h); the image sits inside it, scaled to cover and
 * positioned by a focal point so you choose which part shows. Everything is
 * derived from the image's aspect `ratio` (natW/natH) + the frame size, so no
 * absolute natural-pixel measurement is needed; `focal {x,y}` is normalized
 * 0..1 (which point of the image sits at the frame center) and `zoom` ≥ 1
 * scales beyond cover.
 *
 * Shared by ImageBlock (render) and Block (drag-to-pan) so the two can't drift.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Displayed image size in px for a frame, aspect ratio, and zoom (cover × zoom). */
export function dispDims(frameW, frameH, ratio, zoom = 1) {
  const ar = ratio > 0 ? ratio : 1;
  const cover = Math.max(frameW / ar, frameH); // unit height = 1 → cover is the height scale
  const dispH = cover * (zoom || 1);
  const dispW = ar * dispH;
  return { dispW, dispH };
}

/** Absolute {width,height,left,top} (px) for the image inside the frame. */
export function cropLayout(frameW, frameH, ratio, fx = 0.5, fy = 0.5, zoom = 1) {
  const { dispW, dispH } = dispDims(frameW, frameH, ratio, zoom);
  let left = frameW / 2 - fx * dispW;
  let top = frameH / 2 - fy * dispH;
  // Never reveal a gap: the image always covers the frame.
  left = Math.min(0, Math.max(frameW - dispW, left));
  top = Math.min(0, Math.max(frameH - dispH, top));
  return { width: dispW, height: dispH, left, top };
}

/** Clamp a focal point to the range that keeps the image covering the frame. */
export function clampFocal(fx, fy, frameW, frameH, ratio, zoom = 1) {
  const { dispW, dispH } = dispDims(frameW, frameH, ratio, zoom);
  const fxPad = dispW > frameW ? frameW / (2 * dispW) : 0.5;
  const fyPad = dispH > frameH ? frameH / (2 * dispH) : 0.5;
  return {
    x: dispW > frameW ? clamp(fx, fxPad, 1 - fxPad) : 0.5,
    y: dispH > frameH ? clamp(fy, fyPad, 1 - fyPad) : 0.5,
  };
}

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
export const clampZoom = (z) => clamp(z || 1, ZOOM_MIN, ZOOM_MAX);

/**
 * Render a cropped sub-region as a fixed-size thumbnail — same frame-vs-image
 * model as ImageBlock, but for an arbitrary thumb box (the well, previews).
 * Returns inline-style objects: `wrap` clips the box, `img` is positioned inside
 * it by the same `cropLayout` math, so a thumbnail shows exactly the region the
 * user framed. No pixel read, so cross-origin images are fine.
 */
export function croppedThumb(thumbW, thumbH, ratio, fx = 0.5, fy = 0.5, zoom = 1) {
  const box = cropLayout(thumbW, thumbH, ratio, fx, fy, zoom);
  return {
    wrap: { position: "relative", width: thumbW, height: thumbH, overflow: "hidden" },
    img: {
      position: "absolute",
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      maxWidth: "none",
    },
  };
}
