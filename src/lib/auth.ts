import { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
const cookiePrefix = useSecureCookies ? "__Secure-" : "";

// ✅ FIX: Always use Prisma adapter – guarantees a User record in DB on sign‑in
const adapter = PrismaAdapter(prisma) as any;

function buildAuthOptions(): NextAuthOptions {
  return {
    adapter, // 👈 Always enabled

    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        httpOptions: { timeout: 15_000 },
      }),
    ],

    useSecureCookies,

    cookies: {
      sessionToken: {
        name: `${cookiePrefix}next-auth.session-token`,
        options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecureCookies },
      },
      callbackUrl: {
        name: `${cookiePrefix}next-auth.callback-url`,
        options: { sameSite: "lax", path: "/", secure: useSecureCookies },
      },
      csrfToken: {
        name: `next-auth.csrf-token`,
        options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecureCookies },
      },
      pkceCodeVerifier: {
        name: `${cookiePrefix}next-auth.pkce.code_verifier`,
        options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecureCookies, maxAge: 900 },
      },
      state: {
        name: `${cookiePrefix}next-auth.state`,
        options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecureCookies, maxAge: 900 },
      },
    },

    session: { strategy: "database" }, // 👈 Always use database sessions

    callbacks: {
      async jwt({ token, user }) {
        if (user?.id) token.sub = user.id;
        return token;
      },
      async session({ session, user, token }) {
        // With database strategy, 'user' is always available
        const sessionUserId = user?.id ?? token?.sub;

        if (session.user && sessionUserId) {
          session.user.id = sessionUserId;
        }

        return session;
      },
      async redirect({ url, baseUrl }) {
        if (url.startsWith(baseUrl)) return url;
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        return `${baseUrl}/dashboard`;
      },
    },

    pages: { signIn: "/login", error: "/login" },
    debug: false,
  };
}

export const authOptions = buildAuthOptions();