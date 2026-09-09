"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORY_COLORS, api, type Category } from "@/lib/client";

export default function SettingsPage() {
  const [totalPieces, setTotalPieces] = useState(0);
  const [totalInput, setTotalInput] = useState("0");
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPieces, setNewPieces] = useState("");
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0]);

  useEffect(() => {
    api
      .week(new Date().toISOString().slice(0, 10))
      .then((d) => {
        setTotalPieces(d.settings.totalPieces);
        setTotalInput(String(d.settings.totalPieces));
        setCategories(d.categories);
      })
      .catch((e) => setError(e.message));
  }, []);

  const catSum = useMemo(() => categories.reduce((a, c) => a + c.pieces, 0), [categories]);

  function flash() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }

  async function saveTotal() {
    const n = Math.max(0, Math.round(Number(totalInput) || 0));
    setTotalInput(String(n));
    try {
      await api.setSettings(n);
      setTotalPieces(n);
      flash();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    }
  }

  async function patchCat(id: number, patch: Partial<Omit<Category, "id">>) {
    try {
      const updated = await api.updateCategory(id, patch);
      setCategories((cs) => cs.map((c) => (c.id === id ? updated : c)));
      flash();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    }
  }

  async function addCat(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      const c = await api.addCategory({
        name,
        pieces: Math.max(0, Math.round(Number(newPieces) || 0)),
        color: newColor,
      });
      setCategories((cs) => [...cs, c]);
      setNewName("");
      setNewPieces("");
      setNewColor(CATEGORY_COLORS[(categories.length + 1) % CATEGORY_COLORS.length]);
      flash();
    } catch (err) {
      setError(err instanceof Error ? err.message : "추가 실패");
    }
  }

  async function removeCat(id: number, name: string) {
    if (!confirm(`"${name}" 카테고리와 배치된 조각이 모두 삭제됩니다. 계속할까요?`)) return;
    try {
      await api.deleteCategory(id);
      setCategories((cs) => cs.filter((c) => c.id !== id));
      flash();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  return (
    <main className="px-4 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">설정</h1>
        {savedFlash && <span className="text-xs text-green-600">저장됨 ✓</span>}
      </div>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      <section className="mb-4 rounded-xl border border-border bg-card p-3">
        <label className="text-sm font-medium">주당 총 조각 수</label>
        <p className="mb-2 text-xs text-muted">1조각 = 30분</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={totalInput}
            onChange={(e) => setTotalInput(e.target.value)}
            onBlur={saveTotal}
            className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-foreground"
          />
          <span className="text-sm text-muted">
            조각 = {((totalPieces * 30) / 60).toFixed(1)}시간 / 주
          </span>
        </div>
      </section>

      <section className="mb-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">카테고리별 배분</h2>
          <span
            className={`text-xs ${
              catSum === totalPieces ? "text-muted" : "text-amber-600"
            }`}
          >
            합계 {catSum} / {totalPieces}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {categories.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <input
                  defaultValue={c.name}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== c.name) patchCat(c.id, { name: v });
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-foreground"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  defaultValue={c.pieces}
                  onBlur={(e) => {
                    const v = Math.max(0, Math.round(Number(e.target.value) || 0));
                    if (v !== c.pieces) patchCat(c.id, { pieces: v });
                  }}
                  className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-foreground"
                />
                <span className="text-xs text-muted">조각</span>
                <button
                  onClick={() => removeCat(c.id, c.name)}
                  className="ml-1 rounded-lg border border-border px-2 py-1.5 text-xs text-red-500"
                >
                  삭제
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CATEGORY_COLORS.map((col) => (
                  <button
                    key={col}
                    onClick={() => patchCat(c.id, { color: col })}
                    className={`h-6 w-6 rounded-full border-2 ${
                      c.color === col ? "border-foreground" : "border-transparent"
                    }`}
                    style={{ background: col }}
                    aria-label={col}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={addCat}
          className="mt-2 rounded-xl border border-dashed border-border bg-card p-3"
        >
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="새 카테고리"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-foreground"
            />
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={newPieces}
              onChange={(e) => setNewPieces(e.target.value)}
              placeholder="0"
              className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-foreground"
            />
            <button
              type="submit"
              className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-semibold text-background"
            >
              추가
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CATEGORY_COLORS.map((col) => (
              <button
                type="button"
                key={col}
                onClick={() => setNewColor(col)}
                className={`h-6 w-6 rounded-full border-2 ${
                  newColor === col ? "border-foreground" : "border-transparent"
                }`}
                style={{ background: col }}
                aria-label={col}
              />
            ))}
          </div>
        </form>
      </section>
    </main>
  );
}
