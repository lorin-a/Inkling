"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import styles from "./studio.module.css";

/**
 * A zoomable, pannable surface. Scroll pans in every direction, pinch or
 * ⌘/Ctrl + scroll zooms around the cursor, a drag on empty ground pans
 * (unless the step claims that drag for something else, like drawing a
 * group). Steps that need the world coordinates of a pointer call
 * `toCanvas`, which the parent reaches through the ref.
 */
const MIN = 0.2;
const MAX = 2;

const Canvas = forwardRef(function Canvas(
  { size, children, className = "", onEmptyPointerDown, onEmptyPointerMove, onEmptyPointerUp, onZoom, onPointerCancel, cursor },
  ref
) {
  const viewportRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  useEffect(() => { zoomRef.current = zoom; onZoom?.(zoom); }, [zoom, onZoom]);

  const toCanvas = useCallback((clientX, clientY) => {
    const vp = viewportRef.current;
    const r = vp.getBoundingClientRect();
    const z = zoomRef.current;
    return { x: (clientX - r.left + vp.scrollLeft) / z, y: (clientY - r.top + vp.scrollTop) / z };
  }, []);

  const zoomTo = useCallback((next, ax0, ay0) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    const ax = ax0 == null ? r.width / 2 : ax0 - r.left;
    const ay = ay0 == null ? r.height / 2 : ay0 - r.top;
    const clamped = Math.min(MAX, Math.max(MIN, next));
    const prev = zoomRef.current;
    if (clamped === prev) return;
    const cx = (vp.scrollLeft + ax) / prev;
    const cy = (vp.scrollTop + ay) / prev;
    setZoom(clamped);
    requestAnimationFrame(() => { vp.scrollLeft = cx * clamped - ax; vp.scrollTop = cy * clamped - ay; });
  }, []);

  const fit = useCallback((box, pad = 40) => {
    const vp = viewportRef.current;
    if (!vp || !box) return;
    const next = Math.min(MAX, Math.max(MIN, Math.min((vp.clientWidth - pad * 2) / box.w, (vp.clientHeight - pad * 2) / box.h)));
    setZoom(next);
    requestAnimationFrame(() => {
      vp.scrollLeft = box.x * next - (vp.clientWidth - box.w * next) / 2;
      vp.scrollTop = box.y * next - (vp.clientHeight - box.h * next) / 2;
    });
  }, []);

  const center = useCallback(() => {
    const vp = viewportRef.current;
    const z = zoomRef.current;
    return { x: (vp.scrollLeft + vp.clientWidth / 2) / z, y: (vp.scrollTop + vp.clientHeight / 2) / z };
  }, []);

  useImperativeHandle(ref, () => ({
    toCanvas, zoomTo, fit, center,
    zoomBy: (f) => zoomTo(zoomRef.current * f),
    get zoom() { return zoomRef.current; },
    get viewport() { return viewportRef.current; },
    // Keep the pointer's card in view while it is being dragged to an edge.
    nudge: (clientX, clientY) => {
      const vp = viewportRef.current;
      const r = vp.getBoundingClientRect();
      const EDGE = 80;
      if (clientX > r.right - EDGE) vp.scrollLeft += 16;
      else if (clientX < r.left + EDGE) vp.scrollLeft -= 16;
      if (clientY > r.bottom - EDGE) vp.scrollTop += 12;
      else if (clientY < r.top + EDGE) vp.scrollTop -= 12;
    },
  }), [toCanvas, zoomTo, fit, center]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return; // plain scroll pans; pinch arrives as ctrl+wheel
      e.preventDefault();
      zoomTo(zoomRef.current * (1 - e.deltaY * 0.0018), e.clientX, e.clientY);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [zoomTo]);

  const [panning, setPanning] = useState(null);
  const onDown = (e) => {
    if (e.button !== 0 || e.target.closest("[data-card],[data-group],[data-ui],input,textarea,button")) return;
    if (onEmptyPointerDown?.(e) === true) return; // the step took it
    const vp = viewportRef.current;
    e.currentTarget.setPointerCapture(e.pointerId);
    setPanning({ x: e.clientX, y: e.clientY, left: vp.scrollLeft, top: vp.scrollTop, pointer: e.pointerId });
  };
  const onMove = (e) => {
    if (onEmptyPointerMove?.(e) === true) return;
    if (!panning || e.pointerId !== panning.pointer) return;
    const vp = viewportRef.current;
    vp.scrollLeft = panning.left - (e.clientX - panning.x);
    vp.scrollTop = panning.top - (e.clientY - panning.y);
  };
  const onUp = (e) => {
    onEmptyPointerUp?.(e);
    setPanning(null);
  };

  return (
    <div
      ref={viewportRef}
      className={`${styles.viewport} ${panning ? styles.panning : ""} ${className}`}
      style={cursor ? { cursor } : undefined}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={(e) => { setPanning(null); onPointerCancel?.(e); }}
    >
      <div className={styles.canvasScroll} style={{ width: size.w * zoom, height: size.h * zoom }}>
        <div className={styles.canvas} style={{ width: size.w, height: size.h, transform: `scale(${zoom})`, transformOrigin: "0 0" }}>
          {children}
        </div>
      </div>
    </div>
  );
});

export default Canvas;
