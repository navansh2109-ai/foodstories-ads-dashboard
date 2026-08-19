import { NextResponse } from "next/server";
import { fetchAllRows } from "@/lib/windsor";
import { ensureSchema, upsertRows } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Hit hourly by an external scheduler (see README) since Vercel's free-tier
// cron only fires once a day. Protected by CRON_SECRET, not the dashboard
// password, since this is called machine-to-machine.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const dateFrom = searchParams.get("date_from") ?? today;
  const dateTo = searchParams.get("date_to") ?? today;

  try {
    await ensureSchema();
    const rows = await fetchAllRows(dateFrom, dateTo);
    const count = await upsertRows(rows);
    return NextResponse.json({ ok: true, rowsUpserted: count, dateFrom, dateTo, at: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
