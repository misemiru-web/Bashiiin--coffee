import type { AnalyticsEvent } from "@/lib/types";

export function trackEvent(event: AnalyticsEvent) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[Bashiiin analytics contract]", event);
  }
}
