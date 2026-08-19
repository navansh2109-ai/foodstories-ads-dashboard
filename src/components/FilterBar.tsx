"use client";

import { MetricKey, METRIC_DEFS } from "@/lib/metrics";
import { GroupByKey } from "@/lib/aggregate";

interface Dim {
  platform: string;
  city: string;
  campaign: string;
  ad_group: string;
}

interface Props {
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;

  dims: Dim[];
  platform: string[];
  city: string[];
  campaign: string[];
  adGroup: string[];
  onPlatformChange: (v: string[]) => void;
  onCityChange: (v: string[]) => void;
  onCampaignChange: (v: string[]) => void;
  onAdGroupChange: (v: string[]) => void;

  metric: MetricKey;
  onMetricChange: (m: MetricKey) => void;
  groupBy: GroupByKey;
  onGroupByChange: (g: GroupByKey) => void;

  live: boolean;
  onLiveChange: (v: boolean) => void;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      <label className="text-xs font-medium text-neutral-500">{label}</label>
      <select
        multiple
        value={selected}
        onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
        className="h-24 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {selected.length > 0 && (
        <button
          onClick={() => onChange([])}
          className="self-start text-xs text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Clear ({selected.length})
        </button>
      )}
    </div>
  );
}

export default function FilterBar(props: Props) {
  const platforms = uniqueSorted(props.dims.map((d) => d.platform));
  const cities = uniqueSorted(props.dims.map((d) => d.city));
  const campaigns = uniqueSorted(
    props.dims
      .filter((d) => props.platform.length === 0 || props.platform.includes(d.platform))
      .filter((d) => props.city.length === 0 || props.city.includes(d.city))
      .map((d) => d.campaign)
  );
  const adGroups = uniqueSorted(
    props.dims
      .filter((d) => props.campaign.length === 0 || props.campaign.includes(d.campaign))
      .map((d) => d.ad_group)
  );

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">From</label>
        <input
          type="date"
          value={props.dateFrom}
          onChange={(e) => props.onDateChange(e.target.value, props.dateTo)}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">To</label>
        <input
          type="date"
          value={props.dateTo}
          onChange={(e) => props.onDateChange(props.dateFrom, e.target.value)}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <MultiSelect label="Platform" options={platforms} selected={props.platform} onChange={props.onPlatformChange} />
      <MultiSelect label="City" options={cities} selected={props.city} onChange={props.onCityChange} />
      <MultiSelect label="Campaign" options={campaigns} selected={props.campaign} onChange={props.onCampaignChange} />
      <MultiSelect label="Ad set / Ad group" options={adGroups} selected={props.adGroup} onChange={props.onAdGroupChange} />

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Chart metric</label>
        <select
          value={props.metric}
          onChange={(e) => props.onMetricChange(e.target.value as MetricKey)}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          {METRIC_DEFS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Split lines by</label>
        <select
          value={props.groupBy}
          onChange={(e) => props.onGroupByChange(e.target.value as GroupByKey)}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="none">Combined</option>
          <option value="platform">Platform</option>
          <option value="city">City</option>
          <option value="campaign">Campaign</option>
          <option value="ad_group">Ad set / Ad group</option>
        </select>
      </div>

      <label className="flex items-center gap-2 self-center text-sm">
        <input
          type="checkbox"
          checked={props.live}
          onChange={(e) => props.onLiveChange(e.target.checked)}
          className="h-4 w-4"
        />
        Live (auto-refresh every 60s)
      </label>
    </div>
  );
}
