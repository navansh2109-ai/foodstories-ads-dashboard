import { NextResponse } from "next/server";
import { fetchAllRows } from "@/lib/windsor";
import { ensureSchema, upsertRows } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Manual "Update" button target. Pulls live data for the given date range
// (defaults to today, advertiser-local) straight from Windsor.ai and upserts
// it into Postgres so the dashboard reflects it immediately.
export async function POST(req: Request) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const dateFrom = searchParams.get("date_from") ?? today;
  const dateTo = searchParams.get("date_to") ?? today;

  try {
    await ensureSchema();
    const rows = await fetchAllRows(dateFrom, dateTo);
    const count = await upsertRows(rows);
    return NextResponse.json({ ok: true, rowsUpserted: count, dateFrom, dateTo });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
