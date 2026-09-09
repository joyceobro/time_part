import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Route protection. Auth.js populates `req.auth` with the session (or null).
 * - /login: always allowed (redirect to / if already signed in)
 * - /api/*: 401 JSON when not signed in
 * - everything else: redirect to /login when not signed in
 * /api/auth/* is excluded via the matcher below so sign-in can run.
 */
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = Boolean(req.auth);

  if (pathname === "/login") {
    if (isAuthed) return NextResponse.redirect(new URL("/", req.nextUrl));
    return NextResponse.next();
  }

  if (isAuthed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
