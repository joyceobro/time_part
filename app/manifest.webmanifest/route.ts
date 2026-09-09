import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "조각 배분",
    short_name: "조각",
    description: "일주일 시간 조각 배분 계획 · 체크 · 통계",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f8",
    theme_color: "#f7f7f8",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  });
}
