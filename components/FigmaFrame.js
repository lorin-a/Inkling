"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./FigmaFrame.module.css";

/**
 * Renders Figma-faithful absolute-positioned children at a fixed logical
 * width (default 1920), then CSS-scales the entire frame to fit the viewport
 * width. Height auto-adjusts so the page scrolls naturally.
 */
export default function FigmaFrame({
  width = 1920,
  height,
  background,
  children,
  className = "",
  onClick,
}) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setScale(Math.min(1, w / width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div
      ref={wrapRef}
      className={`${styles.wrap} ${className} ${onClick ? styles.wrapClickable : ""}`}
      style={{
        height: height ? height * scale : undefined,
        background,
      }}
      onClick={onClick}
    >
      <div
        className={styles.frame}
        style={{
          width,
          height,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
