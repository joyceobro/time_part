import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/slots/:id  body: { checked: boolean } — toggle one piece. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const checked = Boolean(body?.checked);

  const rows = await sql`
    update slots set checked = ${checked} where id = ${id}
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
