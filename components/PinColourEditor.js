"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { colorName } from "../lib/nameThatColor";
import styles from "./PinColourEditor.module.css";

/**
 * Pick the colours of a pin straight off its image. The auto-extraction is only a
 * rough first guess — here you sample the colours *you* would pull (the bloom, not
 * the foliage behind it), delete the ones the extractor got wrong, and add your
 * own. The result is what this pin contributes to the direction.
 *
 * Sampling reads pixels from a canvas the image is drawn into. That works for
 * same-origin images (the Whelm sample lives under /sample/); a cross-origin pin
 * would taint the canvas and block the read — those need an image proxy first, so
 * the eyedropper is disabled and only the existing swatches stay editable.
 */
const HEX = /^#?[0-9a-fA-F]{6}$/;
const norm = (h) => (h.startsWith("#") ? h : `#${h}`).toLowerCase();

const ZOOM = 8; // magnification — high enough to see individual pixels
const LOUPE = 132; // loupe diameter in px
const LR = LOUPE / 2; // loupe radius (centres the magnified view on the cursor)

export default function PinColourEditor({ pin, colours, isOverridden, onChange, onReset, onClose }) {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const [canSample, setCanSample] = useState(true);
  const [loupe, setLoupe] = useState(null); // { px, py, dispW, dispH, hex }
  const [hexInput, setHexInput] = useState("");
  const src = pin.imageDisplay || pin.thumbnail || pin.imageOriginal || pin.thumbnail236;

  const handleLoad = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    try {
      canvas.getContext("2d").drawImage(img, 0, 0);
      // Probe once — a tainted canvas throws here, not on every sample.
      canvas.getContext("2d").getImageData(0, 0, 1, 1);
      setCanSample(true);
    } catch {
      setCanSample(false);
    }
  }, []);

  const sampleAt = useCallback((clientX, clientY) => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return null;
    const rect = img.getBoundingClientRect();
    const rx = (clientX - rect.left) / rect.width;
    const ry = (clientY - rect.top) / rect.height;
    if (rx < 0 || rx > 1 || ry < 0 || ry > 1) return null;
    const cx = Math.floor(rx * canvas.width);
    const cy = Math.floor(ry * canvas.height);
    const ctx = canvas.getContext("2d");
    const rad = 2; // average a 5×5 box so a single noisy pixel doesn't define it
    const x0 = Math.max(0, cx - rad);
    const y0 = Math.max(0, cy - rad);
    const w = Math.min(canvas.width, cx + rad + 1) - x0;
    const h = Math.min(canvas.height, cy + rad + 1) - y0;
    let R = 0, G = 0, B = 0, n = 0;
    try {
      const { data } = ctx.getImageData(x0, y0, Math.max(1, w), Math.max(1, h));
      for (let i = 0; i < data.length; i += 4) {
        R += data[i]; G += data[i + 1]; B += data[i + 2]; n += 1;
      }
    } catch {
      return null;
    }
    if (!n) return null;
    const aR = Math.round(R / n), aG = Math.round(G / n), aB = Math.round(B / n);
    const hex = "#" + [aR, aG, aB].map((v) => v.toString(16).padStart(2, "0")).join("");
    // Luminance → does the colour need dark or light text laid over it.
    const light = (0.299 * aR + 0.587 * aG + 0.114 * aB) / 255 > 0.6;
    return { hex, light, px: rx * rect.width, py: ry * rect.height, dispW: rect.width, dispH: rect.height };
  }, []);

  const onMove = useCallback((e) => {
    if (!canSample) return;
    setLoupe(sampleAt(e.clientX, e.clientY));
  }, [canSample, sampleAt]);

  const addColour = useCallback((hex) => {
    const h = norm(hex);
    if (!HEX.test(h)) return;
    if (colours.some((c) => c.toLowerCase() === h)) return;
    onChange([...colours, h]);
  }, [colours, onChange]);

  const onPick = useCallback((e) => {
    if (!canSample) return;
    const s = sampleAt(e.clientX, e.clientY);
    if (s) addColour(s.hex);
  }, [canSample, sampleAt, addColour]);

  const removeColour = (hex) => onChange(colours.filter((c) => c.toLowerCase() !== hex.toLowerCase()));

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submitHex = (e) => {
    e.preventDefault();
    addColour(hexInput);
    setHexInput("");
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Pick colours from this image" onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <p className={styles.title}>Pick your colours</p>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Done">Done</button>
        </div>

        <div className={styles.stage}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt={pin.title || "Reference"}
            className={styles.img}
            onLoad={handleLoad}
            onPointerMove={onMove}
            onPointerLeave={() => setLoupe(null)}
            onClick={onPick}
            draggable={false}
            data-sample={canSample ? "true" : undefined}
          />
          {loupe && (
            <span
              className={styles.loupe}
              style={{
                left: loupe.px,
                top: loupe.py,
                backgroundImage: `url(${src})`,
                backgroundSize: `${loupe.dispW * ZOOM}px ${loupe.dispH * ZOOM}px`,
                backgroundPosition: `${-(loupe.px * ZOOM - LR)}px ${-(loupe.py * ZOOM - LR)}px`,
              }}
            >
              {/* hollow target — marks the exact pixel under the cursor, the one
                  being sampled, so there's no doubt which part of the image you're on */}
              <span className={styles.loupeTarget} />
              <span
                className={styles.loupeHex}
                style={{ background: loupe.hex, color: loupe.light ? "#1a1a1a" : "#fff" }}
              >
                {loupe.hex.toUpperCase()}
              </span>
            </span>
          )}
        </div>
        <canvas ref={canvasRef} className={styles.hiddenCanvas} aria-hidden="true" />

        <div className={styles.readout} aria-live="polite">
          {!canSample ? (
            <span className={styles.readTip}>
              This image is hosted elsewhere, so it can’t be sampled yet — edit the swatches below or add a hex.
            </span>
          ) : loupe ? (
            <>
              <span className={styles.readSwatch} style={{ background: loupe.hex }} />
              <code className={styles.readHex}>{loupe.hex.toUpperCase()}</code>
              <span className={styles.readName}>{colorName(loupe.hex).name}</span>
              <span className={styles.readTip}>click to add</span>
            </>
          ) : (
            <span className={styles.readTip}>Hover the image to find a colour, click to add it.</span>
          )}
        </div>

        <div className={styles.swatchRow}>
          {colours.map((hex) => (
            <span key={hex} className={styles.swatch} style={{ background: hex }} title={colorName(hex).name}>
              <button
                type="button"
                className={styles.swatchRemove}
                onClick={() => removeColour(hex)}
                aria-label={`Remove ${colorName(hex).name}`}
              >
                ×
              </button>
            </span>
          ))}
          {colours.length === 0 && <span className={styles.swatchEmpty}>No colours yet — sample some from the image.</span>}
        </div>

        <div className={styles.foot}>
          <form className={styles.hexForm} onSubmit={submitHex}>
            <input
              className={styles.hexInput}
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              placeholder="#hex"
              aria-label="Add a colour by hex"
              spellCheck={false}
            />
            <button type="submit" className={styles.hexAdd} disabled={!HEX.test(norm(hexInput || ""))}>Add</button>
          </form>
          {isOverridden && (
            <button type="button" className={styles.resetAuto} onClick={onReset}>Reset to auto</button>
          )}
        </div>
      </div>
    </div>
  );
}
