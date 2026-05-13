import sharp from "sharp";

/**
 * Extract a palette of `k` dominant colors via sharp (resize → raw RGB)
 * + a small k-means implementation. Accepts either a URL (fetched) or a
 * Buffer (used directly — e.g., from a multipart upload).
 *
 * Image is downsampled to 120×120 before clustering — plenty for stable
 * dominant-color detection, and keeps the algorithm fast (≈80ms per pin).
 */
export async function extractPalette(input, { k = 7, iterations = 14 } = {}) {
  let buffer;
  if (Buffer.isBuffer(input)) {
    buffer = input;
  } else if (typeof input === "string") {
    const res = await fetch(input, {
      headers: { "User-Agent": "Mozilla/5.0 Moodbuilder" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
  } else {
    throw new Error("extractPalette: input must be a URL string or Buffer");
  }

  const { data, info } = await sharp(buffer)
    .resize(120, 120, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const pixels = [];
  for (let i = 0; i < data.length; i += channels) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }

  if (pixels.length === 0) return [];

  let centroids = initKMeansPlusPlus(pixels, k);

  for (let iter = 0; iter < iterations; iter++) {
    const sums = Array.from({ length: centroids.length }, () => [0, 0, 0, 0]);
    for (const p of pixels) {
      const a = nearestIdx(p, centroids);
      sums[a][0] += p[0];
      sums[a][1] += p[1];
      sums[a][2] += p[2];
      sums[a][3] += 1;
    }
    for (let j = 0; j < centroids.length; j++) {
      if (sums[j][3] > 0) {
        centroids[j] = [
          sums[j][0] / sums[j][3],
          sums[j][1] / sums[j][3],
          sums[j][2] / sums[j][3],
        ];
      }
    }
  }

  // Final assignment for sort by cluster size
  const counts = new Array(centroids.length).fill(0);
  for (const p of pixels) counts[nearestIdx(p, centroids)]++;

  const ranked = centroids
    .map((c, i) => ({ c, n: counts[i] }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map(({ c }) => rgbToHex(c[0], c[1], c[2]));

  return dedupSimilar(ranked, 12);
}

function initKMeansPlusPlus(pixels, k) {
  if (k >= pixels.length) return pixels.map((p) => [...p]);
  const centroids = [pixels[Math.floor(Math.random() * pixels.length)].slice()];
  while (centroids.length < k) {
    let total = 0;
    const distances = new Array(pixels.length);
    for (let i = 0; i < pixels.length; i++) {
      distances[i] = minSqDist(pixels[i], centroids);
      total += distances[i];
    }
    if (total === 0) break;
    const target = Math.random() * total;
    let cum = 0;
    for (let i = 0; i < distances.length; i++) {
      cum += distances[i];
      if (cum >= target) {
        centroids.push(pixels[i].slice());
        break;
      }
    }
  }
  return centroids;
}

function nearestIdx(p, centroids) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < centroids.length; i++) {
    const c = centroids[i];
    const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function minSqDist(p, centroids) {
  let m = Infinity;
  for (const c of centroids) {
    const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
    if (d < m) m = d;
  }
  return m;
}

function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

function dedupSimilar(hexes, tolerance = 10) {
  const out = [];
  const t2 = tolerance * tolerance * 3;
  for (const h of hexes) {
    const rgb = hexToRgb(h);
    if (!out.some((o) => sqDist(rgb, hexToRgb(o)) < t2)) out.push(h);
  }
  return out;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function sqDist(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}
