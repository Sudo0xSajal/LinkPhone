"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Smartphone, Chrome } from "lucide-react";

export default function LoginPageClient() {
  const { status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const error = params.get("error");

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">LinkPhone</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Remote control your Android device</p>
        </div>

        <div className="glass-card space-y-5 p-8">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">
              {error === "OAuthCallback" ? "Sign-in failed. Please try again." : `Sign-in error: ${error}`}
            </div>
          )}

          <div className="space-y-1 text-center">
            <h2 className="text-xl font-semibold">Welcome back</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Sign in with Google to continue.</p>
          </div>

          <button
            onClick={handleSignIn}
            disabled={loading || status === "loading"}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold shadow-sm transition hover:bg-slate-50 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20"
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-blue-500 dark:border-white/30" />
            ) : (
              <Chrome className="h-5 w-5 text-blue-500" />
            )}
            {loading ? "Signing in…" : "Continue with Google"}
          </button>
        </div>
      </div>
    </div>
  );
}