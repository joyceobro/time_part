"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "로그인 실패");
      }
      router.replace(params.get("next") || "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs">
        <h1 className="mb-1 text-center text-xl font-bold">조각 배분</h1>
        <p className="mb-6 text-center text-sm text-muted">비밀번호를 입력하세요</p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="rounded-xl border border-border bg-card px-4 py-3 text-base outline-none focus:border-foreground"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={busy || !password}
            className="rounded-xl bg-foreground px-4 py-3 text-base font-semibold text-background disabled:opacity-40"
          >
            {busy ? "확인 중…" : "로그인"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
