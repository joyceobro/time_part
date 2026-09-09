import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/stats?weeks=12 — per-week planned vs done, with per-category breakdown. */
export async function GET(req: NextRequest) {
  const weeks = Math.min(52, Math.max(1, Math.round(Number(req.nextUrl.searchParams.get("weeks")) || 12)));

  const [settingsRows, categories, rows] = await Promise.all([
    sql`select total_pieces from settings where id = 1`,
    sql`select id, name, color from categories order by sort_order asc, id asc`,
    sql`
      select
        to_char(week_start, 'YYYY-MM-DD') as week,
        category_id,
        count(*)::int as planned,
        count(*) filter (where checked)::int as done
      from slots
      where week_start >= (date_trunc('week', current_date) - make_interval(weeks => ${weeks - 1}))
      group by week_start, category_id
      order by week_start desc
    `,
  ]);

  const catMap = new Map(categories.map((c) => [c.id as number, c]));
  const byWeek = new Map<
    string,
    { week: string; planned: number; done: number; byCategory: Record<number, { planned: number; done: number }> }
  >();

  for (const r of rows) {
    const wk = r.week as string;
    if (!byWeek.has(wk)) byWeek.set(wk, { week: wk, planned: 0, done: 0, byCategory: {} });
    const entry = byWeek.get(wk)!;
    entry.planned += r.planned;
    entry.done += r.done;
    entry.byCategory[r.category_id as number] = { planned: r.planned, done: r.done };
  }

  return NextResponse.json({
    totalPieces: settingsRows[0]?.total_pieces ?? 0,
    categories: categories.map((c) => ({ id: c.id, name: c.name, color: c.color })),
    weeks: [...byWeek.values()].map((w) => ({
      week: w.week,
      planned: w.planned,
      done: w.done,
      rate: w.planned ? Math.round((w.done / w.planned) * 100) : 0,
      byCategory: categories
        .filter((c) => w.byCategory[c.id as number])
        .map((c) => ({
          categoryId: c.id,
          name: c.name,
          color: c.color,
          planned: w.byCategory[c.id as number].planned,
          done: w.byCategory[c.id as number].done,
        })),
    })),
  });
}
