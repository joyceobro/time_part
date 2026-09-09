import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import { signOut } from "@/auth";

export const metadata: Metadata = {
  title: "조각 배분",
  description: "일주일 시간 조각(30분 단위) 배분 계획 · 체크 · 통계",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#f7f7f8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <div className="pb-nav mx-auto min-h-full max-w-md">{children}</div>
        <Nav
          signOutAction={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        />
      </body>
    </html>
  );
}
