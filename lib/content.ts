import type {
  BeanCard,
  ExternalLink,
  OpeningInfo,
} from "@/lib/types";

const checkedAt = "2026-08-11";

export const externalLinks: Record<ExternalLink["id"], ExternalLink> = {
  "open-info": {
    id: "open-info",
    label: "営業情報を確認",
    href: "https://www.instagram.com/bashiiin_coffee/",
    source: {
      status: "third-party",
      sourceUrl: "https://www.instagram.com/bashiiin_coffee/",
      checkedAt,
      note: "公式アカウント候補。店舗確認前のため暫定。",
    },
  },
  instagram: {
    id: "instagram",
    label: "Instagramを見る",
    href: "https://www.instagram.com/bashiiin_coffee/",
    source: {
      status: "third-party",
      sourceUrl: "https://www.instagram.com/bashiiin_coffee/",
      checkedAt,
      note: "公式アカウント候補。店舗確認前のため暫定。",
    },
  },
  "google-maps": {
    id: "google-maps",
    label: "Google Mapsで行く",
    href: "https://www.google.com/maps/search/?api=1&query=Bashiiin%21%20coffee%20Kyoto",
    source: {
      status: "third-party",
      checkedAt,
      note: "店舗名検索リンク。正式Place URLは店舗確認後に差し替え。",
    },
  },
};

export const beans: BeanCard[] = [
  {
    id: "sample-bean-01",
    name: "SAMPLE BEAN 01",
    country: "TO BE CONFIRMED",
    region: "TO BE CONFIRMED",
    process: "PROCESS",
    roast: "ROAST",
    flavor: ["FLAVOR", "NOTE", "FINISH"],
    source: { status: "sample", note: "UI確認用。実在商品ではない。" },
  },
  {
    id: "sample-bean-02",
    name: "SAMPLE BEAN 02",
    country: "TO BE CONFIRMED",
    region: "TO BE CONFIRMED",
    process: "PROCESS",
    roast: "ROAST",
    flavor: ["FLAVOR", "NOTE", "FINISH"],
    source: { status: "sample", note: "UI確認用。実在商品ではない。" },
  },
  {
    id: "sample-bean-03",
    name: "SAMPLE BEAN 03",
    country: "TO BE CONFIRMED",
    region: "TO BE CONFIRMED",
    process: "PROCESS",
    roast: "ROAST",
    flavor: ["FLAVOR", "NOTE", "FINISH"],
    source: { status: "sample", note: "UI確認用。実在商品ではない。" },
  },
];

export const openingInfo: OpeningInfo = {
  id: "sample-calendar",
  label: "SAMPLE CALENDAR",
  notice: "実際の営業日ではありません。最新情報はInstagramでご確認ください。",
  latestInfoUrl: externalLinks["open-info"].href,
  source: { status: "sample", note: "カレンダーUI確認用。" },
};
