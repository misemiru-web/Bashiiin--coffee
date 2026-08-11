"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

type TrackedSectionProps = {
  id: string;
  className?: string;
  labelledBy?: string;
  children: ReactNode;
};

export function TrackedSection({
  id,
  className,
  labelledBy,
  children,
}: TrackedSectionProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tracked = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (tracked) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          timer = setTimeout(() => {
            tracked = true;
            trackEvent({
              name: "section_view",
              placement: "section",
              sectionId: id,
            });
            observer.disconnect();
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
      },
      { threshold: [0.5] },
    );

    observer.observe(node);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [id]);

  return (
    <section ref={ref} id={id} className={className} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}
