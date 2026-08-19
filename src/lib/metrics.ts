// Pure derived-metric math. Safe to import on client or server.

export interface Aggregatable {
  spend: number;
  impressions: number;
  clicks: number;
  add_to_cart: number;
  initiate_checkout: number;
  purchases: number;
  purchase_value: number;
}

export interface Derived extends Aggregatable {
  ctr: number; // %
  cpa: number; // spend / purchases
  roas: number; // purchase_value / spend
  aov: number; // purchase_value / purchases
  cpc: number; // spend / clicks
  cpm: number; // spend / impressions * 1000
}

// Coerce to Number defensively: Postgres NUMERIC/BIGINT columns come back as
// strings from some drivers, and a stray string here would turn `+=` into
// string concatenation instead of arithmetic.
function n(v: unknown): number {
  const num = typeof v === "number" ? v : Number(v);
  return Number.isFinite(num) ? num : 0;
}

export function sumAggregatable<T extends Aggregatable>(rows: T[]): Aggregatable {
  return rows.reduce(
    (acc, r) => ({
      spend: acc.spend + n(r.spend),
      impressions: acc.impressions + n(r.impressions),
      clicks: acc.clicks + n(r.clicks),
      add_to_cart: acc.add_to_cart + n(r.add_to_cart),
      initiate_checkout: acc.initiate_checkout + n(r.initiate_checkout),
      purchases: acc.purchases + n(r.purchases),
      purchase_value: acc.purchase_value + n(r.purchase_value),
    }),
    { spend: 0, impressions: 0, clicks: 0, add_to_cart: 0, initiate_checkout: 0, purchases: 0, purchase_value: 0 }
  );
}

export function deriveMetrics(a: Aggregatable): Derived {
  const ctr = a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0;
  const cpa = a.purchases > 0 ? a.spend / a.purchases : 0;
  const roas = a.spend > 0 ? a.purchase_value / a.spend : 0;
  const aov = a.purchases > 0 ? a.purchase_value / a.purchases : 0;
  const cpc = a.clicks > 0 ? a.spend / a.clicks : 0;
  const cpm = a.impressions > 0 ? (a.spend / a.impressions) * 1000 : 0;
  return { ...a, ctr, cpa, roas, aov, cpc, cpm };
}

export const METRIC_DEFS = [
  { key: "spend", label: "Spend", format: "currency" },
  { key: "roas", label: "ROAS", format: "ratio" },
  { key: "cpa", label: "CPA", format: "currency" },
  { key: "clicks", label: "Clicks", format: "number" },
  { key: "impressions", label: "Impressions", format: "number" },
  { key: "ctr", label: "CTR", format: "percent" },
  { key: "purchases", label: "Purchases", format: "number" },
  { key: "aov", label: "AOV", format: "currency" },
  { key: "add_to_cart", label: "Add to Cart", format: "number" },
  { key: "initiate_checkout", label: "Checkouts Initiated", format: "number" },
  { key: "cpc", label: "CPC", format: "currency" },
  { key: "cpm", label: "CPM", format: "currency" },
] as const;

export type MetricKey = (typeof METRIC_DEFS)[number]["key"];

export function formatMetric(key: MetricKey, value: number): string {
  const def = METRIC_DEFS.find((d) => d.key === key);
  if (!def) return String(value);
  switch (def.format) {
    case "currency":
      return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
    case "percent":
      return `${value.toFixed(2)}%`;
    case "ratio":
      return `${value.toFixed(2)}x`;
    default:
      return value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }
}
