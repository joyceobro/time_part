import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await sql`select total_pieces from settings where id = 1`;
  const totalPieces = rows[0]?.total_pieces ?? 0;
  return NextResponse.json({ totalPieces });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const totalPieces = Math.max(0, Math.round(Number(body?.totalPieces)));
  if (!Number.isFinite(totalPieces)) {
    return NextResponse.json({ error: "totalPieces must be a number" }, { status: 400 });
  }
  await sql`
    insert into settings (id, total_pieces, updated_at) values (1, ${totalPieces}, now())
    on conflict (id) do update set total_pieces = excluded.total_pieces, updated_at = now()
  `;
  return NextResponse.json({ totalPieces });
}
