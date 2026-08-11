export type ContentStatus =
  | "confirmed"
  | "official-public"
  | "third-party"
  | "sample";

export type SourceReference = {
  status: ContentStatus;
  sourceUrl?: string;
  checkedAt?: string;
  checkedBy?: string;
  note?: string;
};

export type ExternalLink = {
  id: "open-info" | "google-maps" | "instagram";
  label: string;
  href?: string;
  source: SourceReference;
};

export type BeanCard = {
  id: string;
  name: string;
  country?: string;
  region?: string;
  variety?: string;
  process?: string;
  roast?: string;
  flavor?: string[];
  source: SourceReference;
};

export type OpeningInfo = {
  id: string;
  label: string;
  dates?: string[];
  notice: string;
  latestInfoUrl?: string;
  source: SourceReference;
};

export type AnalyticsEventName =
  | "open_info_click"
  | "map_click"
  | "instagram_click"
  | "section_view";

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  placement:
    | "header"
    | "hero"
    | "open-info"
    | "access"
    | "footer"
    | "mobile-fixed"
    | "section";
  targetUrl?: string;
  sectionId?: string;
};
