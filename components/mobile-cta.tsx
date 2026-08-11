"use client";

import { externalLinks } from "@/lib/content";
import { TrackedLink } from "@/components/tracked-link";

export function MobileCta() {
  return (
    <nav className="mobile-cta" aria-label="来店情報">
      <TrackedLink
        href={externalLinks["open-info"].href!}
        eventName="open_info_click"
        placement="mobile-fixed"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>01</span> OPEN
      </TrackedLink>
      <TrackedLink
        href={externalLinks["google-maps"].href!}
        eventName="map_click"
        placement="mobile-fixed"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>02</span> MAP ↗
      </TrackedLink>
    </nav>
  );
}
