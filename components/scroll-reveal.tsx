"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

// Progressive-enhancement scroll reveal. The server renders the card visible;
// the pre-paint script in app/layout.tsx adds `.js` to <html>, and only under
// `.js` does a `pending` card start hidden and slightly above its resting place
// (see app/globals.css). Without JavaScript the content is never hidden.
//
// The observer reveals each card once and then disconnects, so scrolling up and
// down never replays the animation. Users who prefer reduced motion — or any
// environment without IntersectionObserver — get the card shown immediately.
export function ScrollReveal({ index = 0, className = "", children }: { index?: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!node || reduce || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={shown ? "shown" : "pending"}
      style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}
      className={className}
    >
      {children}
    </div>
  );
}
