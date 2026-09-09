"use client";

import { useEffect, useState } from "react";
import { weekLabel } from "@/lib/week";

type StatsWeek = {
  week: string;
  planned: number;
  done: number;
  rate: number;
  byCategory: { categoryId: number; name: string; color: string; planned: number; done: number }[];
};

type Stats = {
  totalPieces: number;
  categories: { id: number; name: string; color: string }[];
  weeks: StatsWeek[];
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/stats?weeks=12", { cache: "no-store" })
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          throw new Error("unauthorized");
        }
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  const overall = stats?.weeks.reduce(
    (a, w) => ({ planned: a.planned + w.planned, done: a.done + w.done }),
    { planned: 0, done: 0 },
  );

  return (
    <main className="px-4 pt-4">
      <h1 className="mb-3 text-lg font-bold">통계</h1>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {stats && (
        <>
          {overall && overall.planned > 0 && (
            <div className="mb-4 rounded-xl border border-border bg-card p-3">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted">최근 12주 누적 달성률</span>
                <span className="font-semibold">
                  {Math.round((overall.done / overall.planned) * 100)}%
                </span>
              </div>
              <div className="mt-1 text-xs text-muted">
                {overall.done} / {overall.planned} 조각 ·{" "}
                {((overall.done * 30) / 60).toFixed(1)}h 완료
              </div>
            </div>
          )}

          {stats.weeks.length === 0 && (
            <p className="text-sm text-muted">아직 배치된 데이터가 없습니다.</p>
          )}

          <div className="flex flex-col gap-3">
            {stats.weeks.map((w) => (
              <section key={w.week} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{weekLabel(w.week)}</span>
                  <span className="text-sm font-semibold tabular-nums">{w.rate}%</span>
                </div>
                <div className="mt-1 text-xs text-muted">
                  배치 {w.planned} · 달성 {w.done} 조각
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{ width: `${w.rate}%` }}
                  />
                </div>

                {w.byCategory.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-2">
                    {w.byCategory.map((c) => {
                      const r = c.planned ? Math.round((c.done / c.planned) * 100) : 0;
                      return (
                        <li key={c.categoryId} className="text-xs">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ background: c.color }}
                              />
                              {c.name}
                            </span>
                            <span className="tabular-nums text-muted">
                              {c.done}/{c.planned} · {r}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${r}%`, background: c.color }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
