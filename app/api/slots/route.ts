import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { currentUserId } from "@/auth";
import { isValidISO, mondayOf } from "@/lib/week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/slots — add or remove pieces for one (week, weekday, category) cell.
 * body: { week: "YYYY-MM-DD", weekday: 0..6, categoryId: number, delta: number }
 * delta > 0 inserts that many pieces; delta < 0 removes that many (unchecked first).
 * Returns the full slot list for the week.
 */
export async function POST(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const week = isValidISO(String(body?.week)) ? mondayOf(String(body.week)) : null;
  const weekday = Math.round(Number(body?.weekday));
  const categoryId = Math.round(Number(body?.categoryId));
  const delta = Math.round(Number(body?.delta));

  if (!week || !(weekday >= 0 && weekday <= 6) || !Number.isInteger(categoryId) || !delta) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const owns = await sql`
    select 1 from categories where id = ${categoryId} and user_id = ${uid} limit 1
  `;
  if (owns.length === 0) {
    return NextResponse.json({ error: "unknown category" }, { status: 404 });
  }

  if (delta > 0) {
    const capped = Math.min(delta, 48); // sanity cap per request
    for (let i = 0; i < capped; i++) {
      await sql`
        insert into slots (user_id, week_start, weekday, category_id)
        values (${uid}, ${week}, ${weekday}, ${categoryId})
      `;
    }
  } else {
    const toRemove = Math.min(-delta, 48);
    await sql`
      delete from slots where id in (
        select id from slots
        where user_id = ${uid} and week_start = ${week}
          and weekday = ${weekday} and category_id = ${categoryId}
        order by checked asc, id desc
        limit ${toRemove}
      )
    `;
  }

  const slots = await sql`
    select id, weekday, category_id, checked
    from slots
    where user_id = ${uid} and week_start = ${week}
    order by id asc
  `;
  return NextResponse.json({
    week,
    slots: slots.map((r) => ({
      id: r.id,
      weekday: r.weekday,
      categoryId: r.category_id,
      checked: r.checked,
    })),
  });
}
