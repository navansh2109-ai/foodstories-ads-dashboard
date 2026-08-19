import { Aggregatable, Derived, deriveMetrics } from "./metrics";

// See metrics.ts `n()` — same defensive numeric coercion, needed here too
// since these functions sum raw rows independently of sumAggregatable.
function n(v: unknown): number {
  const num = typeof v === "number" ? v : Number(v);
  return Number.isFinite(num) ? num : 0;
}

export interface RawRow extends Aggregatable {
  platform: string;
  city: string;
  campaign: string;
  ad_group: string;
  date: string;
  hour: number;
}

export type GroupByKey = "none" | "platform" | "city" | "campaign" | "ad_group";

function keyFor(row: RawRow, groupBy: GroupByKey): string {
  if (groupBy === "none") return "All";
  return row[groupBy] || "Unspecified";
}

// Bucket rows by hour-of-timeline (date+hour) and by an optional grouping
// dimension, so the trend chart can show one line per city/campaign/etc.
export interface TrendPoint {
  bucket: string; // "2026-08-19 14:00"
  date: string;
  hour: number;
  series: Record<string, Derived>; // key = group label
}

export function buildTrend(rows: RawRow[], groupBy: GroupByKey): TrendPoint[] {
  const byBucket = new Map<string, Map<string, Aggregatable>>();

  for (const row of rows) {
    const bucket = `${row.date} ${String(row.hour).padStart(2, "0")}:00`;
    const groupKey = keyFor(row, groupBy);
    if (!byBucket.has(bucket)) byBucket.set(bucket, new Map());
    const groupMap = byBucket.get(bucket)!;
    const prev =
      groupMap.get(groupKey) ??
      { spend: 0, impressions: 0, clicks: 0, add_to_cart: 0, initiate_checkout: 0, purchases: 0, purchase_value: 0 };
    groupMap.set(groupKey, {
      spend: prev.spend + n(row.spend),
      impressions: prev.impressions + n(row.impressions),
      clicks: prev.clicks + n(row.clicks),
      add_to_cart: prev.add_to_cart + n(row.add_to_cart),
      initiate_checkout: prev.initiate_checkout + n(row.initiate_checkout),
      purchases: prev.purchases + n(row.purchases),
      purchase_value: prev.purchase_value + n(row.purchase_value),
    });
  }

  const points: TrendPoint[] = Array.from(byBucket.entries()).map(([bucket, groupMap]) => {
    const [date, hourPart] = bucket.split(" ");
    const series: Record<string, Derived> = {};
    for (const [group, agg] of groupMap.entries()) series[group] = deriveMetrics(agg);
    return { bucket, date, hour: parseInt(hourPart, 10), series };
  });

  points.sort((a, b) => a.bucket.localeCompare(b.bucket));
  return points;
}

export function distinctGroupLabels(points: TrendPoint[]): string[] {
  const set = new Set<string>();
  for (const p of points) for (const k of Object.keys(p.series)) set.add(k);
  return Array.from(set).sort();
}

export interface BreakdownRow {
  city: string;
  campaign: string;
  ad_group: string;
  platform: string;
  metrics: Derived;
}

export function buildBreakdown(rows: RawRow[]): BreakdownRow[] {
  const map = new Map<string, { city: string; campaign: string; ad_group: string; platform: string; agg: Aggregatable }>();
  for (const row of rows) {
    const key = `${row.platform}|${row.city}|${row.campaign}|${row.ad_group}`;
    const prev = map.get(key);
    if (prev) {
      prev.agg.spend += n(row.spend);
      prev.agg.impressions += n(row.impressions);
      prev.agg.clicks += n(row.clicks);
      prev.agg.add_to_cart += n(row.add_to_cart);
      prev.agg.initiate_checkout += n(row.initiate_checkout);
      prev.agg.purchases += n(row.purchases);
      prev.agg.purchase_value += n(row.purchase_value);
    } else {
      map.set(key, {
        city: row.city,
        campaign: row.campaign,
        ad_group: row.ad_group,
        platform: row.platform,
        agg: {
          spend: n(row.spend),
          impressions: n(row.impressions),
          clicks: n(row.clicks),
          add_to_cart: n(row.add_to_cart),
          initiate_checkout: n(row.initiate_checkout),
          purchases: n(row.purchases),
          purchase_value: n(row.purchase_value),
        },
      });
    }
  }
  return Array.from(map.values()).map((v) => ({
    city: v.city,
    campaign: v.campaign,
    ad_group: v.ad_group,
    platform: v.platform,
    metrics: deriveMetrics(v.agg),
  }));
}
