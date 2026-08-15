"use client";

import gsap from "gsap";
import { useEffect, useId, useRef } from "react";

type RainbowSweepTextProps = {
  text: string;
  duration?: number;
  stagger?: number;
  className?: string;
};

const rainbow =
  "linear-gradient(90deg,#ff4fd8 0%,#ffde59 25%,#3ff5d4 52%,#3277ff 78%,#8b5cf6 100%)";

export function RainbowSweepText({
  text,
  duration = 0.22,
  stagger = 0.035,
  className = "",
}: RainbowSweepTextProps) {
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const chars = gsap.utils.toArray<HTMLElement>(
      root.querySelectorAll("[data-rainbow-char]")
    );

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      gsap.set(chars, {
        opacity: 1,
        color: "#000000",
        backgroundImage: "none",
      });
      return;
    }

    const play = () => {
      if (animated.current) return;
      animated.current = true;

      gsap
        .timeline()
        .fromTo(
          chars,
          {
            opacity: 0,
            yPercent: 35,
            backgroundImage: rainbow,
            backgroundSize: "240% 100%",
            backgroundPosition: "0% 50%",
            color: "transparent",
          },
          {
            opacity: 1,
            yPercent: 0,
            duration,
            ease: "power3.out",
            stagger,
          }
        )
        .to(
          chars,
          {
            color: "#000000",
            backgroundImage: "none",
            duration: duration * 0.9,
            ease: "power2.out",
            stagger,
          },
          `-=${duration * 0.35}`
        );
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          play();
          observer.disconnect();
        }
      },
      { threshold: 0.45 }
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, [duration, stagger]);

  return (
    <span
      ref={rootRef}
      className={`inline-block ${className}`}
      aria-label={text}
      role="text"
    >
      <span className="sr-only">{text}</span>
      {Array.from(text).map((char, index) => (
        <span
          key={`${id}-${index}-${char}`}
          data-rainbow-char
          aria-hidden="true"
          className="inline-block bg-clip-text text-transparent"
          style={{
            backgroundImage: rainbow,
            whiteSpace: char === " " ? "pre" : undefined,
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}
