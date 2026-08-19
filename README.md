# Foodstories — Hourly Ads Dashboard

Hourly Meta + Google Ads performance for Foodstories: spend, ROAS, CPA, clicks,
impressions, CTR, funnel (impressions → clicks → add-to-cart → checkout →
purchase), purchases, AOV — broken down by city, campaign, and ad set/ad
group, with an interactive chart (pick the metric, pick how lines are split,
toggle series in the legend) and a live "Update now" button.

## How it's wired

- **Data source**: [Windsor.ai](https://windsor.ai) REST API (`connectors.windsor.ai`), which is already connected to Foodstories' 4 Meta ad accounts (Main, Hyderabad, Bangalore, Gurugram) and its 1 Google Ads account. See `src/lib/config.ts` for the account list and the Google campaign-name → city mapping (Google's raw geo-click "city" field is too noisy for this — campaign naming convention is the reliable signal).
- **Storage**: Postgres (`hourly_ad_metrics` table, upserted so re-pulling the same hour just updates it). Works with Vercel Postgres or any Neon/Postgres instance via `POSTGRES_URL` / `DATABASE_URL`.
- **Refresh paths**:
  - `POST /api/refresh` — the dashboard's "Update now" button. Pulls live data for the selected date range right now.
  - `GET /api/cron/snapshot?secret=...` — same pull, meant to be hit by an external hourly scheduler (Vercel's free-tier cron is daily-only, so this project relies on an outside scheduler — see below).
- **Auth**: single shared password (`DASHBOARD_PASSWORD`), gated by `src/proxy.ts` (Next's middleware/proxy convention) which redirects unauthenticated page loads to `/login` and 401s unauthenticated API calls.

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables (see `.env.example`):

| Variable | Where to get it |
|---|---|
| `WINDSOR_API_KEY` | windsor.ai dashboard → Settings → API |
| `POSTGRES_URL` (or `DATABASE_URL`) | Vercel → Storage → Postgres (auto-injected once attached) |
| `DASHBOARD_PASSWORD` | whatever you want the login password to be |
| `CRON_SECRET` | any random string — required by `/api/cron/snapshot` so only the scheduler can trigger it |

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values above
npm run dev
```

## Hourly refresh outside Vercel's cron

Vercel Hobby-tier cron only fires once a day, so true hourly refresh is driven
by an external scheduler hitting:

```
GET https://<your-deployment>/api/cron/snapshot?secret=<CRON_SECRET>
```

once an hour. Any scheduler works (GitHub Actions on a cron trigger, an
external cron service, etc.) — this doesn't have to be Vercel's own cron.

## Notes on data granularity

- Meta gives a true hourly breakdown (`hourly_stats_aggregated_by_advertiser_time_zone`) alongside campaign/ad set — city comes from which ad account the row belongs to.
- Google Ads' `hour` segment cannot be combined with a geographic segment in the same report (a Google Ads API restriction), so Google's city comes from parsing the campaign name instead of a geo field — see `resolveGoogleCity()` in `src/lib/config.ts`. If Foodstories renames campaigns or expands to a new city, update the patterns there.
- Google's funnel steps (add-to-cart / checkout) aren't broken out in this build — the account uses custom-named conversion actions per platform (iOS app, Android app, web) rather than one standard "add to cart" action, so only `conversions` / `conversions_value` (treated as purchases) are pulled for Google. Meta's funnel is fully wired (`actions_add_to_cart`, `actions_initiate_checkout`, `actions_purchase`).
