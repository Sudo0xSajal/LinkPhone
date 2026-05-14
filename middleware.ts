/**
 * Next.js Middleware – server-side route protection.
 * Without this file, unauthenticated users who visit protected pages directly
 * would briefly see the page before the client-side redirect fires.
 * The middleware intercepts the request before any page renders.
 *
 * FIX: Previously only /dashboard/:path* was protected.
 * The app also has /activity, /notifications, and /settings under the
 * (dashboard) route group — those were completely unprotected and accessible
 * without a session.
 */

export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/activity/:path*",
    "/notifications/:path*",
    "/settings/:path*",
  ],
};