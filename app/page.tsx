"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type WeekData } from "@/lib/client";
import { WEEKDAYS_KO, addDays, mondayOf, weekLabel } from "@/lib/week";

export default function PlannerPage() {
  const [week, setWeek] = useState<string>(() => mondayOf());
  const [data, setData] = useState<WeekData | null>(null);
  const [error, setError] = useState("");
  const [openDay, setOpenDay] = useState<number>(() => {
    const js = new Date().getDay(); // 0=Sun..6=Sat
    return js === 0 ? 6 : js - 1;
  });

  const load = useCallback((w: string) => {
    setError("");
    api
      .week(w)
      .then((d) => {
        setData(d);
        setWeek(d.week);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load(week);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placedByCat = useMemo(() => {
    const m = new Map<number, number>();
    data?.slots.forEach((s) => m.set(s.categoryId, (m.get(s.categoryId) ?? 0) + 1));
    return m;
  }, [data]);

  const placedByDayCat = useMemo(() => {
    const m = new Map<string, number>();
    data?.slots.forEach((s) => {
      const k = `${s.weekday}:${s.categoryId}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  }, [data]);

  const totalPlaced = data?.slots.length ?? 0;
  const totalTarget = data?.settings.totalPieces ?? 0;
  const catTargetSum = data?.categories.reduce((a, c) => a + c.pieces, 0) ?? 0;

  async function step(weekday: number, categoryId: number, delta: number) {
    if (!data) return;
    try {
      const res = await api.changeSlots({ week, weekday, categoryId, delta });
      setData({ ...data, slots: res.slots });
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경 실패");
    }
  }

  function shiftWeek(deltaWeeks: number) {
    const w = mondayOf(addDays(week, deltaWeeks * 7));
    load(w);
  }

  return (
    <main className="px-4 pt-4">
      <header className="mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">주간 배치</h1>
          <button
            onClick={() => load(mondayOf())}
            className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted"
          >
            이번 주
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-card px-2 py-2">
          <button onClick={() => shiftWeek(-1)} className="px-3 py-1 text-lg leading-none">
            ‹
          </button>
          <span className="text-sm font-medium">{weekLabel(week)}</span>
          <button onClick={() => shiftWeek(1)} className="px-3 py-1 text-lg leading-none">
            ›
          </button>
        </div>
      </header>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {data && (
        <>
          <div className="mb-3 rounded-xl border border-border bg-card p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">배치한 조각</span>
              <span className="font-semibold">
                {totalPlaced} / {catTargetSum || totalTarget} 조각
                <span className="ml-1 text-xs text-muted">
                  ({((totalPlaced * 30) / 60).toFixed(1)}h)
                </span>
              </span>
            </div>
            {catTargetSum !== totalTarget && totalTarget > 0 && (
              <p className="mt-1 text-xs text-amber-600">
                ⚠ 설정의 총 조각({totalTarget})과 카테고리 합({catTargetSum})이 다릅니다.
              </p>
            )}
            {data.categories.length === 0 && (
              <p className="mt-1 text-xs text-muted">
                설정에서 카테고리를 먼저 추가하세요.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {WEEKDAYS_KO.map((wd, i) => {
              const dayDate = addDays(week, i);
              const [, mm, dd] = dayDate.split("-");
              const dayTotal =
                data.slots.filter((s) => s.weekday === i).length;
              const isOpen = openDay === i;
              return (
                <section key={i} className="overflow-hidden rounded-xl border border-border bg-card">
                  <button
                    onClick={() => setOpenDay(isOpen ? -1 : i)}
                    className="flex w-full items-center justify-between px-3 py-3"
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="text-base font-semibold">{wd}</span>
                      <span className="text-xs text-muted">
                        {Number(mm)}.{Number(dd)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-sm text-muted">
                      {dayTotal > 0 && (
                        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground">
                          {dayTotal}조각
                        </span>
                      )}
                      <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border">
                      {data.categories.length === 0 && (
                        <p className="px-3 py-3 text-sm text-muted">카테고리가 없습니다.</p>
                      )}
                      {data.categories.map((c) => {
                        const here = placedByDayCat.get(`${i}:${c.id}`) ?? 0;
                        const weekPlaced = placedByCat.get(c.id) ?? 0;
                        const remaining = c.pieces - weekPlaced;
                        return (
                          <div
                            key={c.id}
                            className="flex items-center justify-between px-3 py-2.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border/60"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ background: c.color }}
                              />
                              <span className="truncate text-sm">{c.name}</span>
                              <span
                                className={`text-xs ${
                                  remaining < 0 ? "text-red-500" : "text-muted"
                                }`}
                              >
                                {remaining >= 0 ? `남음 ${remaining}` : `초과 ${-remaining}`}
                              </span>
                            </span>
                            <span className="flex items-center gap-2">
                              <button
                                onClick={() => step(i, c.id, -1)}
                                disabled={here === 0}
                                className="h-8 w-8 rounded-lg border border-border text-lg leading-none disabled:opacity-30"
                              >
                                −
                              </button>
                              <span className="w-6 text-center text-sm font-semibold tabular-nums">
                                {here}
                              </span>
                              <button
                                onClick={() => step(i, c.id, 1)}
                                className="h-8 w-8 rounded-lg border border-border text-lg leading-none"
                              >
                                +
                              </button>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
