import { NextResponse } from "next/server";
import { ensureSchema, queryMetrics, distinctDims, lastFetchedAt } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const dateFrom = searchParams.get("date_from") ?? today;
  const dateTo = searchParams.get("date_to") ?? today;
  const platform = searchParams.getAll("platform");
  const city = searchParams.getAll("city");
  const campaign = searchParams.getAll("campaign");
  const adGroup = searchParams.getAll("ad_group");

  try {
    await ensureSchema();
    const [rows, dims, lastFetch] = await Promise.all([
      queryMetrics({
        dateFrom,
        dateTo,
        platform: platform.length ? platform : undefined,
        city: city.length ? city : undefined,
        campaign: campaign.length ? campaign : undefined,
        adGroup: adGroup.length ? adGroup : undefined,
      }),
      distinctDims(dateFrom, dateTo),
      lastFetchedAt(),
    ]);
    return NextResponse.json({ ok: true, rows, dims, lastFetch });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
