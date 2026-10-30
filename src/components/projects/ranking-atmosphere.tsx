"use client";

import { useEffect, useRef } from "react";

/** Decorative paints are useful only while this section is on screen. */
export function RankingAtmosphere() {
  const backgroundRef = useRef<HTMLDivElement>(null);
  const scanlinesRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const background = backgroundRef.current;
    if (!background) return;
    const layers = [scanlinesRef.current, particlesRef.current];
    let visible = false;
    const update = () => {
      const state = visible && !document.hidden ? "running" : "paused";
      for (const layer of layers) if (layer) layer.style.animationPlayState = state;
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(background);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  // Keep the original sibling layers: a wrapper changes the blending/compositing tree.
  return <>
    <div ref={backgroundRef} className="absolute inset-0 pg-grid-bg opacity-80" aria-hidden="true" />
    <div ref={scanlinesRef} className="absolute inset-0 pg-scanlines opacity-20" style={{ animationPlayState: "paused" }} aria-hidden="true" />
    <div ref={particlesRef} className="absolute inset-0 pg-particles opacity-35" style={{ animationPlayState: "paused" }} aria-hidden="true" />
  </>;
}
