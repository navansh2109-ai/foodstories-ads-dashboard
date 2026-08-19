"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Aggregatable } from "@/lib/metrics";

const COLORS = ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#4f46e5"];

export default function FunnelChart({ agg, includeAtc }: { agg: Aggregatable; includeAtc: boolean }) {
  const steps = includeAtc
    ? [
        { stage: "Impressions", value: agg.impressions },
        { stage: "Clicks", value: agg.clicks },
        { stage: "Add to Cart", value: agg.add_to_cart },
        { stage: "Checkout", value: agg.initiate_checkout },
        { stage: "Purchases", value: agg.purchases },
      ]
    : [
        { stage: "Impressions", value: agg.impressions },
        { stage: "Clicks", value: agg.clicks },
        { stage: "Purchases", value: agg.purchases },
      ];

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={steps} layout="vertical" margin={{ left: 24, right: 24 }}>
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="stage" width={100} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => Number(v).toLocaleString("en-IN")} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {steps.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
