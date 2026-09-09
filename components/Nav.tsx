"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "배치", icon: "▦" },
  { href: "/check", label: "체크", icon: "✓" },
  { href: "/stats", label: "통계", icon: "▤" },
  { href: "/settings", label: "설정", icon: "⚙" },
];

export default function Nav({ signOutAction }: { signOutAction: () => Promise<void> }) {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
                active ? "text-foreground font-semibold" : "text-muted"
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
        <form action={signOutAction} className="flex flex-1">
          <button
            type="submit"
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs text-muted"
          >
            <span className="text-lg leading-none">⎋</span>
            로그아웃
          </button>
        </form>
      </div>
    </nav>
  );
}
