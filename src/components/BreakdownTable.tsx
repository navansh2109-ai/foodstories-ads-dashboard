"use client";

import { useMemo, useState } from "react";
import { BreakdownRow } from "@/lib/aggregate";
import { formatMetric } from "@/lib/metrics";

type SortKey = "city" | "campaign" | "ad_group" | "platform" | "spend" | "roas" | "cpa" | "clicks" | "impressions" | "ctr" | "purchases" | "aov";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "platform", label: "Platform", numeric: false },
  { key: "city", label: "City", numeric: false },
  { key: "campaign", label: "Campaign", numeric: false },
  { key: "ad_group", label: "Ad set / group", numeric: false },
  { key: "spend", label: "Spend", numeric: true },
  { key: "roas", label: "ROAS", numeric: true },
  { key: "cpa", label: "CPA", numeric: true },
  { key: "clicks", label: "Clicks", numeric: true },
  { key: "impressions", label: "Impr.", numeric: true },
  { key: "ctr", label: "CTR", numeric: true },
  { key: "purchases", label: "Purchases", numeric: true },
  { key: "aov", label: "AOV", numeric: true },
];

export default function BreakdownTable({ rows }: { rows: BreakdownRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const withVal = rows.map((r) => ({
      row: r,
      val: (r as unknown as Record<string, unknown>)[sortKey] ?? (r.metrics as unknown as Record<string, unknown>)[sortKey],
    }));
    withVal.sort((a, b) => {
      const av = a.val,
        bv = b.val;
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return withVal.map((w) => w.row);
  }, [rows, sortKey, sortDir]);

  function onSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
        <thead className="bg-neutral-50 dark:bg-neutral-900/60">
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                onClick={() => onSort(c.key)}
                className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 ${c.numeric ? "text-right" : ""}`}
              >
                {c.label}
                {sortKey === c.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
          {sorted.map((r, i) => (
            <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40">
              <td className="whitespace-nowrap px-3 py-2 capitalize">{r.platform}</td>
              <td className="whitespace-nowrap px-3 py-2">{r.city}</td>
              <td className="max-w-[220px] truncate px-3 py-2" title={r.campaign}>
                {r.campaign}
              </td>
              <td className="max-w-[200px] truncate px-3 py-2" title={r.ad_group}>
                {r.ad_group}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatMetric("spend", r.metrics.spend)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatMetric("roas", r.metrics.roas)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatMetric("cpa", r.metrics.cpa)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatMetric("clicks", r.metrics.clicks)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatMetric("impressions", r.metrics.impressions)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatMetric("ctr", r.metrics.ctr)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatMetric("purchases", r.metrics.purchases)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatMetric("aov", r.metrics.aov)}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-neutral-500">
                No rows for this selection.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
