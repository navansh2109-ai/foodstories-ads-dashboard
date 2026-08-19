"use client";

import { Derived, formatMetric } from "@/lib/metrics";

const TILES: { key: keyof Derived; label: string }[] = [
  { key: "spend", label: "Spend" },
  { key: "roas", label: "ROAS" },
  { key: "cpa", label: "CPA" },
  { key: "clicks", label: "Clicks" },
  { key: "impressions", label: "Impressions" },
  { key: "ctr", label: "CTR" },
  { key: "purchases", label: "Purchases" },
  { key: "aov", label: "AOV" },
];

export default function KpiTiles({ metrics }: { metrics: Derived }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TILES.map((t) => (
        <div
          key={t.key}
          className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{t.label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMetric(t.key as never, metrics[t.key])}
          </div>
        </div>
      ))}
    </div>
  );
}
