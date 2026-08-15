"use client";

import gsap from "gsap";
import { useEffect, useId, useMemo, useRef } from "react";

type WaveFlipTextProps = {
  text: string;
  duration?: number;
  stagger?: number;
  delay?: number;
  className?: string;
};

function splitGraphemes(text: string) {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });

    return Array.from(segmenter.segment(text), (part) => part.segment);
  }

  return Array.from(text);
}

export function WaveFlipText({
  text,
  duration = 0.72,
  stagger = 0.04,
  delay = 0,
  className = "",
}: WaveFlipTextProps) {
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const segments = useMemo(() => splitGraphemes(text), [text]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const chars = gsap.utils.toArray<HTMLElement>(
      root.querySelectorAll("[data-wave-flip-char]")
    );

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      gsap.set(chars, {
        opacity: 1,
        rotateX: 0,
      });
      return;
    }

    gsap.set(chars, {
      opacity: 0,
      rotateX: -82,
      transformOrigin: "center top",
      transformPerspective: 800,
    });

    const timeline = gsap.timeline({ delay });
    timeline.to(chars, {
      opacity: 1,
      rotateX: 0,
      duration,
      ease: "power3.out",
      stagger,
    });

    return () => {
      timeline.kill();
    };
  }, [delay, duration, stagger]);

  return (
    <span
      ref={rootRef}
      aria-label={text}
      className={`inline-block overflow-hidden [perspective:800px] ${className}`}
      role="text"
    >
      <span className="sr-only">{text}</span>
      {segments.map((segment, index) => (
        <span
          key={`${id}-${index}-${segment}`}
          aria-hidden="true"
          data-wave-flip-char
          className="inline-block will-change-transform"
          style={{ whiteSpace: segment === " " ? "pre" : undefined }}
        >
          {segment}
        </span>
      ))}
    </span>
  );
}
