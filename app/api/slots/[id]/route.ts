import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/slots/:id  body: { checked?: boolean, weekday?: 0..6 }
 * Toggle a piece's checked state and/or move it to another weekday.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const checked = body?.checked != null ? Boolean(body.checked) : undefined;
  const weekday =
    body?.weekday != null ? Math.round(Number(body.weekday)) : undefined;

  if (weekday != null && !(weekday >= 0 && weekday <= 6)) {
    return NextResponse.json({ error: "weekday must be 0..6" }, { status: 400 });
  }
  if (checked === undefined && weekday === undefined) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const rows = await sql`
    update slots set
      checked = coalesce(${checked ?? null}, checked),
      weekday = coalesce(${weekday ?? null}, weekday)
    where id = ${id}
    returning id, weekday, category_id, checked
  `;
  if (rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  const r = rows[0];
  return NextResponse.json({
    id: r.id,
    weekday: r.weekday,
    categoryId: r.category_id,
    checked: r.checked,
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  await sql`delete from slots where id = ${id}`;
  return NextResponse.json({ ok: true });
}
