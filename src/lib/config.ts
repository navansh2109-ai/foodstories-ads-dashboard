// Central config: which ad accounts we track and how they map to cities.
// Edit this file if Foodstories adds/removes an ad account or a city.

export type Platform = "meta" | "google";

export interface MetaAccount {
  id: string;
  name: string;
  city: string;
}

// Meta (Facebook/Instagram) ad accounts — city is structural (one account per city).
export const META_ACCOUNTS: MetaAccount[] = [
  { id: "929239662040137", name: "foodstories Main", city: "All / HQ" },
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
  { city: "Hyderabad", patterns: [/hyd/i, /hyderabad/i, /secunderabad/i] },
  { city: "Bangalore", patterns: [/\bblr\b/i, /bangalore/i, /bengaluru/i] },
  { city: "Gurugram", patterns: [/\bggm\b/i, /gurgaon/i, /gurugram/i, /delhi/i, /\bncr\b/i] },
  { city: "Mumbai", patterns: [/\bmum\b/i, /mumbai/i, /bandra/i, /lokhandwala/i, /\bpow\b/i] },
  { city: "All Cities", patterns: [/allcity/i, /all[\s_-]?city/i, /pan[\s_-]?india/i] },
];

export function resolveGoogleCity(campaignName: string | null | undefined): string {
  if (!campaignName) return "Unmapped";
  for (const rule of GOOGLE_CITY_RULES) {
    if (rule.patterns.some((p) => p.test(campaignName))) return rule.city;
  }
  return "Unmapped";
}

export const TRACKED_CITIES = [
  "All / HQ",
  "Hyderabad",
  "Bangalore",
  "Gurugram",
  "Mumbai",
  "All Cities",
  "Unmapped",
] as const;
