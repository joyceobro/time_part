import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { currentUserId } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await sql`
    select id, name, pieces, color, sort_order, archived
    from categories
    where user_id = ${uid} and archived = false
    order by sort_order asc, id asc
  `;
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      pieces: r.pieces,
      color: r.color,
      sortOrder: r.sort_order,
    })),
  );
}

export async function POST(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const pieces = Math.max(0, Math.round(Number(body?.pieces) || 0));
  const color = String(body?.color ?? "#6b7280");
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const rows = await sql`
    select coalesce(max(sort_order), -1) + 1 as next from categories where user_id = ${uid}
  `;
  const sortOrder = rows[0].next as number;

  const inserted = await sql`
    insert into categories (user_id, name, pieces, color, sort_order)
    values (${uid}, ${name}, ${pieces}, ${color}, ${sortOrder})
    returning id, name, pieces, color, sort_order
  `;
  const r = inserted[0];
  return NextResponse.json(
    { id: r.id, name: r.name, pieces: r.pieces, color: r.color, sortOrder: r.sort_order },
    { status: 201 },
  );
}
