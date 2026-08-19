"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TrendPoint, distinctGroupLabels } from "@/lib/aggregate";
import { MetricKey, formatMetric } from "@/lib/metrics";

const PALETTE = ["#6366f1", "#059669", "#dc2626", "#d97706", "#0891b2", "#7c3aed", "#db2777", "#65a30d"];

export default function TrendChart({ points, metric }: { points: TrendPoint[]; metric: MetricKey }) {
  const groups = useMemo(() => distinctGroupLabels(points), [points]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const data = useMemo(
    () =>
      points.map((p) => {
        const row: Record<string, string | number> = {
          bucket: p.bucket.slice(5).replace(" ", " · "), // "08-19 · 14:00"
        };
        for (const g of groups) row[g] = p.series[g] ? p.series[g][metric] : 0;
        return row;
      }),
    [points, groups, metric]
  );

  function toggle(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (points.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-neutral-500">
        No data yet for this selection — hit Update, or widen the date range.
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" />
          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} minTickGap={24} />
          <YAxis tick={{ fontSize: 11 }} width={64} />
          <Tooltip
            formatter={(value, name) => [formatMetric(metric, Number(value)), String(name)]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend
            onClick={(e) => toggle(String(e.value))}
            wrapperStyle={{ fontSize: 12, cursor: "pointer" }}
          />
          {groups.map((g, i) => (
            <Line
              key={g}
              type="monotone"
              dataKey={g}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={false}
              hide={hidden.has(g)}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
