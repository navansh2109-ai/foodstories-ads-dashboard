import { Pool } from "pg";
import type { NormalizedRow } from "./windsor";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString =
    process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (!connectionString) throw new Error("No Postgres connection string set (POSTGRES_URL / DATABASE_URL)");
  pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  return pool;
}

export async function ensureSchema() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS hourly_ad_metrics (
      id BIGSERIAL PRIMARY KEY,
      platform TEXT NOT NULL,
      account_id TEXT NOT NULL,
      account_name TEXT NOT NULL,
      city TEXT NOT NULL,
      campaign TEXT NOT NULL,
      ad_group TEXT NOT NULL,
      date DATE NOT NULL,
      hour INT NOT NULL,
      spend NUMERIC NOT NULL DEFAULT 0,
      impressions BIGINT NOT NULL DEFAULT 0,
      clicks BIGINT NOT NULL DEFAULT 0,
      add_to_cart NUMERIC NOT NULL DEFAULT 0,
      initiate_checkout NUMERIC NOT NULL DEFAULT 0,
      purchases NUMERIC NOT NULL DEFAULT 0,
      purchase_value NUMERIC NOT NULL DEFAULT 0,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (platform, account_id, campaign, ad_group, city, date, hour)
    );
    CREATE INDEX IF NOT EXISTS idx_ham_date_hour ON hourly_ad_metrics (date, hour);
    CREATE INDEX IF NOT EXISTS idx_ham_platform ON hourly_ad_metrics (platform);
    CREATE INDEX IF NOT EXISTS idx_ham_city ON hourly_ad_metrics (city);
  `);
}

export async function upsertRows(rows: NormalizedRow[]) {
  if (rows.length === 0) return 0;
  const db = getPool();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    for (const r of rows) {
      await client.query(
        `INSERT INTO hourly_ad_metrics
          (platform, account_id, account_name, city, campaign, ad_group, date, hour,
           spend, impressions, clicks, add_to_cart, initiate_checkout, purchases, purchase_value, fetched_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now())
         ON CONFLICT (platform, account_id, campaign, ad_group, city, date, hour)
         DO UPDATE SET
           spend = EXCLUDED.spend,
           impressions = EXCLUDED.impressions,
           clicks = EXCLUDED.clicks,
           add_to_cart = EXCLUDED.add_to_cart,
           initiate_checkout = EXCLUDED.initiate_checkout,
           purchases = EXCLUDED.purchases,
           purchase_value = EXCLUDED.purchase_value,
           fetched_at = now()`,
        [
          r.platform,
          r.account_id,
          r.account_name,
          r.city,
          r.campaign,
          r.ad_group,
          r.date,
          r.hour,
          r.spend,
          r.impressions,
          r.clicks,
          r.add_to_cart,
          r.initiate_checkout,
          r.purchases,
          r.purchase_value,
        ]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return rows.length;
}

export interface MetricsFilter {
  dateFrom: string;
  dateTo: string;
  platform?: string[];
  city?: string[];
  campaign?: string[];
  adGroup?: string[];
}

export interface MetricsRow {
  platform: string;
  city: string;
  campaign: string;
  ad_group: string;
  date: string;
  hour: number;
  spend: number;
  impressions: number;
  clicks: number;
  add_to_cart: number;
  initiate_checkout: number;
  purchases: number;
  purchase_value: number;
}

export async function queryMetrics(filter: MetricsFilter): Promise<MetricsRow[]> {
  const db = getPool();
  const conditions: string[] = ["date >= $1", "date <= $2"];
  const params: unknown[] = [filter.dateFrom, filter.dateTo];

  function addInClause(col: string, values?: string[]) {
    if (!values || values.length === 0) return;
    params.push(values);
    conditions.push(`${col} = ANY($${params.length}::text[])`);
  }
  addInClause("platform", filter.platform);
  addInClause("city", filter.city);
  addInClause("campaign", filter.campaign);
  addInClause("ad_group", filter.adGroup);

  // Cast NUMERIC/BIGINT columns to float8 — node-postgres returns those types
  // as strings by default (to avoid silent precision loss), which would make
  // every downstream `+=` sum a string concatenation instead of arithmetic.
  const { rows } = await db.query(
    `SELECT platform, city, campaign, ad_group, date::text, hour,
            spend::float8 AS spend,
            impressions::float8 AS impressions,
            clicks::float8 AS clicks,
            add_to_cart::float8 AS add_to_cart,
            initiate_checkout::float8 AS initiate_checkout,
            purchases::float8 AS purchases,
            purchase_value::float8 AS purchase_value
     FROM hourly_ad_metrics
     WHERE ${conditions.join(" AND ")}
     ORDER BY date, hour`,
    params
  );
  return rows as MetricsRow[];
}

export async function distinctDims(dateFrom: string, dateTo: string) {
  const db = getPool();
  const { rows } = await db.query(
    `SELECT DISTINCT platform, city, campaign, ad_group
     FROM hourly_ad_metrics WHERE date >= $1 AND date <= $2`,
    [dateFrom, dateTo]
  );
  return rows as { platform: string; city: string; campaign: string; ad_group: string }[];
}

export async function lastFetchedAt(): Promise<string | null> {
  const db = getPool();
  const { rows } = await db.query(`SELECT MAX(fetched_at)::text AS ts FROM hourly_ad_metrics`);
  return rows[0]?.ts ?? null;
}
