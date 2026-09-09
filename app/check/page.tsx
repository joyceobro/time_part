"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type WeekData } from "@/lib/client";
import { WEEKDAYS_KO, addDays, mondayOf, weekLabel } from "@/lib/week";

export default function CheckPage() {
  const [week, setWeek] = useState<string>(() => mondayOf());
  const [data, setData] = useState<WeekData | null>(null);
  const [error, setError] = useState("");

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

  const catMap = useMemo(
    () => new Map((data?.categories ?? []).map((c) => [c.id, c])),
    [data],
  );

  const done = data?.slots.filter((s) => s.checked).length ?? 0;
  const total = data?.slots.length ?? 0;
  const rate = total ? Math.round((done / total) * 100) : 0;

  async function toggle(id: number, checked: boolean) {
    if (!data) return;
    // optimistic
    setData({
      ...data,
      slots: data.slots.map((s) => (s.id === id ? { ...s, checked } : s)),
    });
    try {
      await api.toggleSlot(id, checked);
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경 실패");
      load(week);
    }
  }

  function shiftWeek(d: number) {
    load(mondayOf(addDays(week, d * 7)));
  }

  return (
    <main className="px-4 pt-4">
      <header className="mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">체크</h1>
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
          <div className="mb-3 rounded-xl border border-border bg-card p-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted">달성</span>
              <span className="font-semibold">
                {done} / {total} 조각 · {rate}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${rate}%` }}
              />
            </div>
          </div>

          {total === 0 && (
            <p className="text-sm text-muted">이 주에 배치된 조각이 없습니다. 배치 탭에서 먼저 배치하세요.</p>
          )}

          <div className="flex flex-col gap-2">
            {WEEKDAYS_KO.map((wd, i) => {
              const daySlots = data.slots.filter((s) => s.weekday === i);
              if (daySlots.length === 0) return null;
              const dayDate = addDays(week, i);
              const [, mm, dd] = dayDate.split("-");
              const dDone = daySlots.filter((s) => s.checked).length;
              return (
                <section key={i} className="rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="flex items-baseline gap-2">
                      <span className="text-base font-semibold">{wd}</span>
                      <span className="text-xs text-muted">
                        {Number(mm)}.{Number(dd)}
                      </span>
                    </span>
                    <span className="text-xs text-muted">
                      {dDone}/{daySlots.length}
                    </span>
                  </div>
                  <ul className="border-t border-border">
                    {daySlots.map((s) => {
                      const c = catMap.get(s.categoryId);
                      return (
                        <li
                          key={s.id}
                          className="[&:not(:last-child)]:border-b [&:not(:last-child)]:border-border/60"
                        >
                          <label className="flex cursor-pointer items-center gap-3 px-3 py-3">
                            <input
                              type="checkbox"
                              checked={s.checked}
                              onChange={(e) => toggle(s.id, e.target.checked)}
                              className="h-5 w-5 accent-green-500"
                            />
                            <span
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{ background: c?.color ?? "#6b7280" }}
                            />
                            <span
                              className={`text-sm ${
                                s.checked ? "text-muted line-through" : ""
                              }`}
                            >
                              {c?.name ?? "삭제된 카테고리"}
                            </span>
                            <span className="ml-auto text-xs text-muted">30분</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
