import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Auth.js v5 with Google, JWT sessions, no database adapter.
 * Each user is keyed by their verified Google email (lowercased); that
 * value is the `user_id` used to scope every row in the app's tables.
 *
 * Env: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
 *      (AUTH_URL in production if header inference is unreliable)
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/login" },
  callbacks: {
    signIn({ profile }) {
      return Boolean(profile?.email_verified && profile?.email);
    },
    jwt({ token, profile }) {
      if (profile?.email) token.uid = profile.email.toLowerCase();
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
});

/** Resolve the current user id (their email), or null if not signed in. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ? id.toLowerCase() : null;
}
