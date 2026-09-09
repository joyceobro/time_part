"use client";

export type Category = {
  id: number;
  name: string;
  pieces: number;
  color: string;
  sortOrder: number;
};

export type Slot = {
  id: number;
  weekday: number;
  categoryId: number;
  checked: boolean;
};

export type WeekData = {
  week: string;
  settings: { totalPieces: number };
  categories: Category[];
  slots: Slot[];
};

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg?.error ?? `요청 실패 (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  week: (start: string) => req<WeekData>(`/api/week?start=${start}`),
  setSettings: (totalPieces: number) =>
    req<{ totalPieces: number }>("/api/settings", {
      method: "PUT",
      body: JSON.stringify({ totalPieces }),
    }),
  listCategories: () => req<Category[]>("/api/categories"),
  addCategory: (c: { name: string; pieces: number; color: string }) =>
    req<Category>("/api/categories", { method: "POST", body: JSON.stringify(c) }),
  updateCategory: (id: number, patch: Partial<Omit<Category, "id">>) =>
    req<Category>(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteCategory: (id: number) =>
    req<{ ok: true }>(`/api/categories/${id}`, { method: "DELETE" }),
  changeSlots: (b: { week: string; weekday: number; categoryId: number; delta: number }) =>
    req<{ week: string; slots: Slot[] }>("/api/slots", {
      method: "POST",
      body: JSON.stringify(b),
    }),
  toggleSlot: (id: number, checked: boolean) =>
    req<Slot>(`/api/slots/${id}`, { method: "PATCH", body: JSON.stringify({ checked }) }),
  moveSlot: (id: number, weekday: number) =>
    req<Slot>(`/api/slots/${id}`, { method: "PATCH", body: JSON.stringify({ weekday }) }),
  deleteSlot: (id: number) =>
    req<{ ok: true }>(`/api/slots/${id}`, { method: "DELETE" }),
  logout: () => req<{ ok: true }>("/api/login", { method: "DELETE" }),
};

export const CATEGORY_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
];
