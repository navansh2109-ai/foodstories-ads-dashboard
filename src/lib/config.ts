// Central config: which ad accounts we track and how they map to cities.
// Edit this file if Foodstories adds/removes an ad account or a city.

export type Platform = "meta" | "google";

export interface MetaAccount {
  id: string;
  name: string;
  city: string;
}

// Meta ad accounts. "city" is a FALLBACK only, used when the campaign and ad-set
// names carry no city token. "foodstories Main" is mixed-city (Mumbai, Delhi and
// GGM all run from it), so it has none — inheriting a city from it was the bug.
export const META_ACCOUNTS: MetaAccount[] = [
  { id: "929239662040137", name: "foodstories Main", city: "" },
  { id: "8631371813636214", name: "Foodstories - Hyderabad", city: "Hyderabad" },
  { id: "1179134110540058", name: "Foodstories - Bangalore", city: "Bangalore" },
  { id: "2325798964591693", name: "Foodstories - Gurugram", city: "Gurugram" },
];

// Google Ads — single account. City is inferred from campaign naming convention
// (Google's raw geo-click "city" field is extremely noisy — 100+ incidental
// delivery cities — so campaign-name pattern matching is the reliable signal
// that matches how Foodstories actually structures Google campaigns).
export const GOOGLE_ACCOUNT = { id: "138-894-0094", name: "foodstories" };

interface CityRule {
  city: string;
  patterns: RegExp[];
}

const GOOGLE_CITY_RULES: CityRule[] = [
  { city: "All Cities", patterns: [/all[\s_-]?cit(y|ies)/i, /national/i, /pan[\s_-]?india/i] },
  { city: "Hyderabad", patterns: [/(?<![a-z0-9])(hyd|hyderabad|secunderabad)(?![a-z0-9])/i] },
  { city: "Bangalore", patterns: [/(?<![a-z0-9])(blr|bangalore|bengaluru)(?![a-z0-9])/i] },
  { city: "Delhi", patterns: [/(?<![a-z0-9])(delhi|del|ncr)(?![a-z0-9])/i] },
  { city: "Gurugram", patterns: [/(?<![a-z0-9])(ggm|gurgaon|gurugram)(?![a-z0-9])/i] },
  { city: "Mumbai", patterns: [/(?<![a-z0-9])(mum|mumbai|mumcity|bandra|powai|pow|lokhandwala|lok|andheri|juhu)(?![a-z0-9])/i] },
];

export function resolveGoogleCity(campaignName: string | null | undefined): string {
  if (!campaignName) return "Unmapped";
  for (const rule of GOOGLE_CITY_RULES) {
    if (rule.patterns.some((p) => p.test(campaignName))) return rule.city;
  }
  return "Unmapped";
}

export const TRACKED_CITIES = [
    "Delhi",
  "Hyderabad",
  "Bangalore",
  "Gurugram",
  "Mumbai",
  "All Cities",
  "Unmapped",
] as const;
