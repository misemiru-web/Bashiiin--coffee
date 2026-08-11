"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";
import type { AnalyticsEventName, AnalyticsEvent } from "@/lib/types";

type TrackedLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  eventName: Exclude<AnalyticsEventName, "section_view">;
  placement: AnalyticsEvent["placement"];
  children: ReactNode;
};

export function TrackedLink({
  href,
  eventName,
  placement,
  children,
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <a
      href={href}
      onClick={(event) => {
        trackEvent({ name: eventName, placement, targetUrl: href });
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </a>
  );
}
