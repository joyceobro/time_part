import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));

  const name = body?.name != null ? String(body.name).trim() : undefined;
  const pieces = body?.pieces != null ? Math.max(0, Math.round(Number(body.pieces))) : undefined;
  const color = body?.color != null ? String(body.color) : undefined;
  const sortOrder = body?.sortOrder != null ? Math.round(Number(body.sortOrder)) : undefined;

  const rows = await sql`
    update categories set
      name = coalesce(${name ?? null}, name),
      pieces = coalesce(${pieces ?? null}, pieces),
      color = coalesce(${color ?? null}, color),
      sort_order = coalesce(${sortOrder ?? null}, sort_order)
    where id = ${id}
    returning id, name, pieces, color, sort_order
  `;
  if (rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  const r = rows[0];
  return NextResponse.json({
    id: r.id,
    name: r.name,
    pieces: r.pieces,
    color: r.color,
    sortOrder: r.sort_order,
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  // Slots for this category are removed by ON DELETE CASCADE.
  await sql`delete from categories where id = ${id}`;
  return NextResponse.json({ ok: true });
}
