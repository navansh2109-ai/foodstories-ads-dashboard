// Windsor.ai data-fetch layer.
// Calls Windsor's REST connectors API directly (server-side only — needs
// WINDSOR_API_KEY). Not the MCP integration; this runs standalone on Vercel.

import { META_ACCOUNTS, GOOGLE_ACCOUNT, resolveGoogleCity } from "./config";

const WINDSOR_BASE = "https://connectors.windsor.ai";

function apiKey(): string {
  const key = process.env.WINDSOR_API_KEY;
  if (!key) throw new Error("WINDSOR_API_KEY is not set");
  return key;
}

async function windsorGet(connector: string, params: Record<string, string>) {
  const url = new URL(`${WINDSOR_BASE}/${connector}`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("_r", "json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Windsor ${connector} error ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = await res.json();
  const rows = json.data ?? json.result ?? [];
  if (!Array.isArray(rows)) {
    throw new Error(`Windsor ${connector}: unexpected response shape`);
  }
  return rows as Record<string, unknown>[];
}

export interface NormalizedRow {
  platform: "meta" | "google";
  account_id: string;
  account_name: string;
  city: string;
  campaign: string;
  ad_group: string;
  date: string; // yyyy-MM-dd
  hour: number; // 0-23
  spend: number;
  impressions: number;
  clicks: number;
  add_to_cart: number;
  initiate_checkout: number;
  purchases: number;
  purchase_value: number;
}

function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

// "09:00:00 - 09:59:59" -> 9
function parseMetaHour(hourly: unknown): number {
  const s = String(hourly ?? "");
  const m = s.match(/^(\d{1,2}):/);
  return m ? parseInt(m[1], 10) : 0;
}

const META_FIELDS = [
  "account_id",
  "account_name",
  "campaign",
  "adset_name",
  "date",
  "hourly_stats_aggregated_by_advertiser_time_zone",
  "spend",
  "clicks",
  "impressions",
  "actions_add_to_cart",
  "actions_initiate_checkout",
  "actions_purchase",
  "action_values_purchase",
].join(",");

export async function fetchMetaRows(dateFrom: string, dateTo: string): Promise<NormalizedRow[]> {
  const accountsById = new Map(META_ACCOUNTS.map((a) => [a.id, a]));
  const rows = await windsorGet("facebook", {
    accounts: META_ACCOUNTS.map((a) => a.id).join(","),
    fields: META_FIELDS,
    date_from: dateFrom,
    date_to: dateTo,
  });

  // SECURITY: the `accounts` param above is a request-side filter, not a
  // guarantee — if Windsor.ai ever ignores/broadens it, rows from OTHER
  // clients on this Windsor workspace would land here. Never fall back to
  // an "Unmapped" bucket for an unrecognized account_id — drop the row
  // outright. This is the last line of defense against cross-client data
  // leaking into Foodstories' dashboard.
  const out: NormalizedRow[] = [];
  for (const r of rows) {
    const accountId = String(r.account_id ?? "");
    const known = accountsById.get(accountId);
    if (!known) continue; // not one of Foodstories' 4 Meta accounts — discard
    out.push({
      platform: "meta",
      account_id: accountId,
      account_name: known.name,
      city: known.city,
      campaign: String(r.campaign ?? ""),
      ad_group: String(r.adset_name ?? ""),
      date: String(r.date ?? dateFrom),
      hour: parseMetaHour(r.hourly_stats_aggregated_by_advertiser_time_zone),
      spend: num(r.spend),
      impressions: num(r.impressions),
      clicks: num(r.clicks),
      add_to_cart: num(r.actions_add_to_cart),
      initiate_checkout: num(r.actions_initiate_checkout),
      purchases: num(r.actions_purchase),
      purchase_value: num(r.action_values_purchase),
    });
  }
  return out;
}

const GOOGLE_FIELDS = [
  "account_id",
  "campaign_name",
  "adgroup",
  "date",
  "hour",
  "cost",
  "clicks",
  "impressions",
  "conversions",
  "conversions_value",
].join(",");

// Windsor may return the Google Ads customer ID with or without dashes
// ("138-894-0094" vs "1388940094") — compare digits only so formatting
// differences don't cause a false mismatch (or worse, a false match).
function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export async function fetchGoogleRows(dateFrom: string, dateTo: string): Promise<NormalizedRow[]> {
  const rows = await windsorGet("google_ads", {
    accounts: GOOGLE_ACCOUNT.id,
    fields: GOOGLE_FIELDS,
    date_from: dateFrom,
    date_to: dateTo,
  });

  const expectedId = digitsOnly(GOOGLE_ACCOUNT.id);

  // SECURITY: same reasoning as fetchMetaRows above — the `accounts` param
  // is a request-side filter, not a guarantee. Every row's account_id is
  // checked here and anything that isn't Foodstories' single Google Ads
  // account is dropped, never included.
  const out: NormalizedRow[] = [];
  for (const r of rows) {
    const rowAccountId = digitsOnly(String(r.account_id ?? ""));
    if (rowAccountId !== expectedId) continue; // not Foodstories' account — discard
    const campaign = String(r.campaign_name ?? "");
    out.push({
      platform: "google",
      account_id: GOOGLE_ACCOUNT.id,
      account_name: GOOGLE_ACCOUNT.name,
      city: resolveGoogleCity(campaign),
      campaign,
      ad_group: String(r.adgroup ?? ""),
      date: String(r.date ?? dateFrom),
      hour: num(r.hour),
      spend: num(r.cost),
      impressions: num(r.impressions),
      clicks: num(r.clicks),
      // Google's generic "conversions" is used as the purchase-equivalent;
      // upstream funnel (ATC/checkout) isn't split out for this account's
      // custom conversion actions, so we leave those at 0 for Google rows.
      add_to_cart: 0,
      initiate_checkout: 0,
      purchases: num(r.conversions),
      purchase_value: num(r.conversions_value),
    });
  }
  return out;
}

export async function fetchAllRows(dateFrom: string, dateTo: string): Promise<NormalizedRow[]> {
  const [meta, google] = await Promise.all([
    fetchMetaRows(dateFrom, dateTo),
    fetchGoogleRows(dateFrom, dateTo),
  ]);
  return [...meta, ...google];
}
