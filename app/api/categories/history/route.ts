import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { currentUserId } from "@/auth";
import { isValidISO, mondayOf } from "@/lib/week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/categories/history?week=YYYY-MM-DD
 * Distinct categories used in earlier weeks (name + most recent color),
 * most-recently-used first — lets the planner reuse a past category
 * instead of retyping it for a fresh week.
 */
export async function GET(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const weekParam = req.nextUrl.searchParams.get("week") ?? "";
  const week = isValidISO(weekParam) ? mondayOf(weekParam) : mondayOf();

  const rows = await sql`
    select distinct on (name) name, color, week_start
    from categories
    where user_id = ${uid} and week_start < ${week}
    order by name, week_start desc
  `;

  const history = rows
    .map((r) => ({ name: r.name as string, color: r.color as string, lastUsed: r.week_start as string }))
    .sort((a, b) => (a.lastUsed < b.lastUsed ? 1 : a.lastUsed > b.lastUsed ? -1 : 0));

  return NextResponse.json(history);
}
