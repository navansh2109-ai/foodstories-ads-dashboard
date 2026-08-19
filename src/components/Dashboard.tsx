"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FilterBar from "./FilterBar";
import KpiTiles from "./KpiTiles";
import TrendChart from "./TrendChart";
import FunnelChart from "./FunnelChart";
import BreakdownTable from "./BreakdownTable";
import { buildTrend, buildBreakdown, GroupByKey, RawRow } from "@/lib/aggregate";
import { sumAggregatable, deriveMetrics, MetricKey } from "@/lib/metrics";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ApiResponse {
  ok: boolean;
  rows: RawRow[];
  dims: { platform: string; city: string; campaign: string; ad_group: string }[];
  lastFetch: string | null;
  error?: string;
}

export default function Dashboard() {
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [platform, setPlatform] = useState<string[]>([]);
  const [city, setCity] = useState<string[]>([]);
  const [campaign, setCampaign] = useState<string[]>([]);
  const [adGroup, setAdGroup] = useState<string[]>([]);
  const [metric, setMetric] = useState<MetricKey>("spend");
  const [groupBy, setGroupBy] = useState<GroupByKey>("city");
  const [live, setLive] = useState(true);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      platform.forEach((v) => params.append("platform", v));
      city.forEach((v) => params.append("city", v));
      campaign.forEach((v) => params.append("campaign", v));
      adGroup.forEach((v) => params.append("ad_group", v));

      const res = await fetch(`/api/metrics?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json: ApiResponse = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed to load metrics");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, platform, city, campaign, adGroup]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount/filter-change
    load();
  }, [load]);

  useEffect(() => {
    if (live) {
      pollRef.current = setInterval(load, 60_000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [live, load]);

  async function handleUpdate() {
    setUpdating(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      const res = await fetch(`/api/refresh?${params.toString()}`, { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Refresh failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUpdating(false);
    }
  }

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const trendPoints = useMemo(() => buildTrend(rows, groupBy), [rows, groupBy]);
  const breakdown = useMemo(() => buildBreakdown(rows), [rows]);
  const totals = useMemo(() => deriveMetrics(sumAggregatable(rows)), [rows]);
  const includeAtc = useMemo(() => rows.some((r) => r.platform === "meta"), [rows]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Foodstories — Hourly Ads Dashboard</h1>
          <p className="text-xs text-neutral-500">
            Meta + Google Ads, by city / campaign / ad set, hour by hour.
            {data?.lastFetch && (
              <> Last data pull: {new Date(data.lastFetch).toLocaleString("en-IN")}.</>
            )}
          </p>
        </div>
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {updating ? "Updating…" : "Update now"}
        </button>
      </header>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <FilterBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateChange={(f, t) => {
          setDateFrom(f);
          setDateTo(t);
        }}
        dims={data?.dims ?? []}
        platform={platform}
        city={city}
        campaign={campaign}
        adGroup={adGroup}
        onPlatformChange={setPlatform}
        onCityChange={setCity}
        onCampaignChange={setCampaign}
        onAdGroupChange={setAdGroup}
        metric={metric}
        onMetricChange={setMetric}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        live={live}
        onLiveChange={setLive}
      />

      <KpiTiles metrics={totals} />

      <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Hourly trend — {metric.toUpperCase()} {loading && <span className="text-neutral-400">(refreshing…)</span>}
        </h2>
        <TrendChart points={trendPoints} metric={metric} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-neutral-200 bg-white p-4 lg:col-span-1 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Funnel</h2>
          <FunnelChart agg={totals} includeAtc={includeAtc} />
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-4 lg:col-span-2 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Breakdown — city / campaign / ad set
          </h2>
          <BreakdownTable rows={breakdown} />
        </section>
      </div>
    </div>
  );
}
