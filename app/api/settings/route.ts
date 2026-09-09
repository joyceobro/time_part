import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { currentUserId } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await sql`select total_pieces from user_settings where user_id = ${uid}`;
  return NextResponse.json({ totalPieces: rows[0]?.total_pieces ?? 0 });
}

export async function PUT(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const totalPieces = Math.max(0, Math.round(Number(body?.totalPieces)));
  if (!Number.isFinite(totalPieces)) {
    return NextResponse.json({ error: "totalPieces must be a number" }, { status: 400 });
  }
  await sql`
    insert into user_settings (user_id, total_pieces, updated_at)
    values (${uid}, ${totalPieces}, now())
    on conflict (user_id)
    do update set total_pieces = excluded.total_pieces, updated_at = now()
  `;
  return NextResponse.json({ totalPieces });
}
