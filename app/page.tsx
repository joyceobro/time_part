"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { api, type Category, type WeekData } from "@/lib/client";
import { WEEKDAYS_KO, addDays, mondayOf, weekLabel } from "@/lib/week";

type Piece =
  | { kind: "warehouse"; categoryId: number; color: string }
  | { kind: "slot"; slotId: number; weekday: number; categoryId: number; color: string };

function sameCategory(a: Piece | null, categoryId: number) {
  return a?.kind === "warehouse" && a.categoryId === categoryId;
}

function Dot({ color, size = 22, faded = false }: { color: string; size?: number; faded?: boolean }) {
  return (
    <span
      className="inline-block rounded-full ring-1 ring-black/10"
      style={{ width: size, height: size, background: color, opacity: faded ? 0.28 : 1 }}
    />
  );
}

function Chip({
  id,
  data,
  size,
  picked,
  checked,
  onPick,
}: {
  id: string;
  data: Piece;
  size: number;
  picked: boolean;
  checked?: boolean;
  onPick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data });
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
      className={`relative touch-none rounded-full transition-transform ${
        picked ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : ""
      }`}
      style={{ opacity: isDragging ? 0.3 : 1, cursor: "grab" }}
      aria-label={data.kind === "slot" ? "배치된 조각" : "조각"}
    >
      <Dot color={data.color} size={size} />
      {checked && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center text-[13px] font-bold text-white">
          ✓
        </span>
      )}
    </button>
  );
}

export default function PlannerPage() {
  const [week, setWeek] = useState<string>(() => mondayOf());
  const [data, setData] = useState<WeekData | null>(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState<Piece | null>(null);
  const [picked, setPicked] = useState<Piece | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 6 } }),
  );

  const load = useCallback((w: string) => {
    setError("");
    setPicked(null);
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
    () => new Map<number, Category>((data?.categories ?? []).map((c) => [c.id, c])),
    [data],
  );

  const placedByCat = useMemo(() => {
    const m = new Map<number, number>();
    data?.slots.forEach((s) => m.set(s.categoryId, (m.get(s.categoryId) ?? 0) + 1));
    return m;
  }, [data]);

  const totalPlaced = data?.slots.length ?? 0;
  const catTargetSum = data?.categories.reduce((a, c) => a + c.pieces, 0) ?? 0;

  function shiftWeek(d: number) {
    load(mondayOf(addDays(week, d * 7)));
  }

  /** Apply a piece → target. target is a weekday number, or "warehouse". */
  const applyMove = useCallback(
    async (p: Piece, target: number | "warehouse") => {
      if (!data) return;
      try {
        if (p.kind === "warehouse" && typeof target === "number") {
          const res = await api.changeSlots({
            week,
            weekday: target,
            categoryId: p.categoryId,
            delta: 1,
          });
          setData({ ...data, slots: res.slots });
        } else if (p.kind === "slot" && target === "warehouse") {
          setData({ ...data, slots: data.slots.filter((s) => s.id !== p.slotId) });
          await api.deleteSlot(p.slotId);
        } else if (p.kind === "slot" && typeof target === "number") {
          if (target === p.weekday) return;
          setData({
            ...data,
            slots: data.slots.map((s) => (s.id === p.slotId ? { ...s, weekday: target } : s)),
          });
          await api.moveSlot(p.slotId, target);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "변경 실패");
        load(week);
      }
    },
    [data, week, load],
  );

  function onDragStart(e: DragStartEvent) {
    setPicked(null);
    setActive((e.active.data.current as Piece) ?? null);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const p = e.active.data.current as Piece | undefined;
    const overId = e.over?.id as string | undefined;
    if (!p || !overId) return;
    if (overId === "warehouse") return applyMove(p, "warehouse");
    if (overId.startsWith("day-")) return applyMove(p, Number(overId.slice(4)));
  }

  /** Tap handling: pick a piece, then tap a target to move it. */
  function pick(p: Piece) {
    setPicked((cur) => {
      if (!cur) return p;
      if (cur.kind === "slot" && p.kind === "slot" && cur.slotId === p.slotId) return null;
      if (cur.kind === "warehouse" && sameCategory(p, cur.categoryId)) return null;
      return p;
    });
  }
  function tapTarget(target: number | "warehouse") {
    if (!picked) return;
    const p = picked;
    setPicked(null);
    applyMove(p, target);
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
        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActive(null)}
        >
          <Warehouse
            categories={data.categories}
            placedByCat={placedByCat}
            totalPlaced={totalPlaced}
            catTargetSum={catTargetSum}
            picked={picked}
            onPick={pick}
            onTapWarehouse={() => tapTarget("warehouse")}
          />

          {picked && (
            <p className="mt-2 rounded-lg bg-foreground/10 px-3 py-1.5 text-center text-xs">
              조각 선택됨 · 요일을 탭해 배치{" "}
              {picked.kind === "slot" && "· 창고를 탭해 제거"}
            </p>
          )}

          <div className="mt-3 flex flex-col gap-2">
            {WEEKDAYS_KO.map((wd, i) => (
              <DayZone
                key={i}
                weekday={i}
                label={wd}
                date={addDays(week, i)}
                slots={data.slots.filter((s) => s.weekday === i)}
                catMap={catMap}
                picked={picked}
                armed={picked != null}
                onPick={pick}
                onTapDay={() => tapTarget(i)}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {active ? <Dot color={active.color} size={active.kind === "slot" ? 26 : 22} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </main>
  );
}

function Warehouse({
  categories,
  placedByCat,
  totalPlaced,
  catTargetSum,
  picked,
  onPick,
  onTapWarehouse,
}: {
  categories: Category[];
  placedByCat: Map<number, number>;
  totalPlaced: number;
  catTargetSum: number;
  picked: Piece | null;
  onPick: (p: Piece) => void;
  onTapWarehouse: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "warehouse" });
  const armedForReturn = picked?.kind === "slot";

  return (
    <div
      ref={setNodeRef}
      onClick={armedForReturn ? onTapWarehouse : undefined}
      className={`sticky top-2 z-10 rounded-xl border bg-card p-3 shadow-sm transition-colors ${
        isOver || armedForReturn
          ? "border-red-400 bg-red-50 dark:bg-red-950/30"
          : "border-border"
      }`}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-semibold">창고</span>
        <span className="text-xs text-muted">
          배치 {totalPlaced} / {catTargetSum} 조각
        </span>
      </div>

      {categories.length === 0 && (
        <p className="text-xs text-muted">설정에서 카테고리와 조각 수를 먼저 정하세요.</p>
      )}

      <div className="flex flex-col gap-2.5">
        {categories.map((c) => {
          const placed = placedByCat.get(c.id) ?? 0;
          const remaining = c.pieces - placed;
          return (
            <div key={c.id}>
              <div className="mb-1 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="text-xs font-medium">{c.name}</span>
                <span
                  className={`text-xs tabular-nums ${
                    remaining < 0 ? "text-red-500" : "text-muted"
                  }`}
                >
                  {placed}/{c.pieces}
                  {remaining < 0 ? ` · 초과 ${-remaining}` : ""}
                </span>
              </div>
              <div className="flex min-h-[24px] flex-wrap items-center gap-1.5">
                {remaining <= 0 ? (
                  <span className="text-xs text-muted">
                    {remaining < 0 ? "" : "모두 배치됨"}
                  </span>
                ) : (
                  Array.from({ length: remaining }).map((_, k) => (
                    <Chip
                      key={k}
                      id={`wh-${c.id}-${k}`}
                      size={22}
                      data={{ kind: "warehouse", categoryId: c.id, color: c.color }}
                      picked={k === 0 && sameCategory(picked, c.id)}
                      onPick={() => onPick({ kind: "warehouse", categoryId: c.id, color: c.color })}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayZone({
  weekday,
  label,
  date,
  slots,
  catMap,
  picked,
  armed,
  onPick,
  onTapDay,
}: {
  weekday: number;
  label: string;
  date: string;
  slots: { id: number; weekday: number; categoryId: number; checked: boolean }[];
  catMap: Map<number, Category>;
  picked: Piece | null;
  armed: boolean;
  onPick: (p: Piece) => void;
  onTapDay: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${weekday}` });
  const [, mm, dd] = date.split("-");

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-3 pt-2.5">
        <span className="flex items-baseline gap-2">
          <span className="text-base font-semibold">{label}</span>
          <span className="text-xs text-muted">
            {Number(mm)}.{Number(dd)}
          </span>
        </span>
        {slots.length > 0 && (
          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium">
            {slots.length}조각
          </span>
        )}
      </div>
      <div
        ref={setNodeRef}
        onClick={armed ? onTapDay : undefined}
        className={`m-2 flex min-h-[52px] flex-wrap content-start items-center gap-2 rounded-lg border-2 border-dashed p-2 transition-colors ${
          isOver || armed
            ? "border-green-500 bg-green-50 dark:bg-green-950/30"
            : "border-border/70"
        }`}
      >
        {slots.length === 0 && (
          <span className="px-1 text-xs text-muted">
            {armed ? "여기를 탭해 배치" : "여기에 조각을 끌어다 놓기"}
          </span>
        )}
        {slots.map((s) => {
          const c = catMap.get(s.categoryId);
          const color = c?.color ?? "#6b7280";
          return (
            <Chip
              key={s.id}
              id={`slot-${s.id}`}
              size={26}
              checked={s.checked}
              data={{
                kind: "slot",
                slotId: s.id,
                weekday: s.weekday,
                categoryId: s.categoryId,
                color,
              }}
              picked={picked?.kind === "slot" && picked.slotId === s.id}
              onPick={() =>
                onPick({
                  kind: "slot",
                  slotId: s.id,
                  weekday: s.weekday,
                  categoryId: s.categoryId,
                  color,
                })
              }
            />
          );
        })}
      </div>
    </section>
  );
}
