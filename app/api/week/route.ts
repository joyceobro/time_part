import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isValidISO, mondayOf } from "@/lib/week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/week?start=YYYY-MM-DD — everything the planner & check screens need. */
export async function GET(req: NextRequest) {
  const startParam = req.nextUrl.searchParams.get("start") ?? "";
  const week = isValidISO(startParam) ? mondayOf(startParam) : mondayOf();

  const [settingsRows, categories, slots] = await Promise.all([
    sql`select total_pieces from settings where id = 1`,
    sql`
      select id, name, pieces, color, sort_order
      from categories
      where archived = false
      order by sort_order asc, id asc
    `,
    sql`
      select id, weekday, category_id, checked
      from slots
      where week_start = ${week}
      order by id asc
    `,
  ]);

  return NextResponse.json({
    week,
    settings: { totalPieces: settingsRows[0]?.total_pieces ?? 0 },
    categories: categories.map((r) => ({
      id: r.id,
      name: r.name,
      pieces: r.pieces,
      color: r.color,
      sortOrder: r.sort_order,
    })),
    slots: slots.map((r) => ({
      id: r.id,
      weekday: r.weekday,
      categoryId: r.category_id,
      checked: r.checked,
    })),
  });
}
