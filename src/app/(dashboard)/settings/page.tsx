"use client";

import { useSession, signOut } from "next-auth/react";
import { useTheme } from "../../../contexts/ThemeContext";
import { Moon, Sun, LogOut, User, Shield } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 dark:text-slate-400 text-slate-500 text-sm">Manage your account and preferences.</p>
      </div>

      {/* Profile */}
      <section className="glass-card p-6 space-y-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-blue-400" /> Profile
        </h2>
        <div className="flex items-center gap-4">
          {session?.user?.image ? (
            <Image src={session.user.image} alt="avatar" width={64} height={64}
              className="h-16 w-16 rounded-2xl object-cover ring-2 dark:ring-white/20 ring-slate-300" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
              {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold">{session?.user?.name ?? "—"}</p>
            <p className="dark:text-slate-400 text-slate-500 text-sm">{session?.user?.email ?? "—"}</p>
            <span className="badge badge-blue mt-1">Google Account</span>
          </div>
        </div>
        <div className="rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 p-3">
          <p className="text-xs dark:text-slate-400 text-slate-500 mb-0.5">User ID</p>
          <p className="font-mono text-sm">{(session?.user as any)?.id ?? "—"}</p>
        </div>
      </section>

      {/* Appearance */}
      <section className="glass-card p-6 space-y-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          {isDark ? <Moon className="h-5 w-5 text-blue-400" /> : <Sun className="h-5 w-5 text-yellow-400" />}
          Appearance
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Theme</p>
            <p className="text-sm dark:text-slate-400 text-slate-500">
              Currently using <strong>{isDark ? "dark" : "light"}</strong> mode.
            </p>
          </div>
          <button onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDark ? "bg-blue-600" : "bg-slate-300"}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isDark ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(["dark", "light"] as const).map((t) => (
            <button key={t} onClick={() => { if (isDark !== (t === "dark")) toggleTheme(); }}
              className={`rounded-xl border p-4 text-center transition
                ${isDark === (t === "dark") ? "border-blue-500 dark:bg-blue-950/30 bg-blue-50" : "dark:border-white/10 border-slate-200 dark:hover:bg-white/5 hover:bg-slate-50"}`}>
              {t === "dark"
                ? <Moon className="mx-auto h-6 w-6 text-blue-400 mb-1.5" />
                : <Sun  className="mx-auto h-6 w-6 text-yellow-400 mb-1.5" />}
              <p className="text-sm font-medium capitalize">{t} Mode</p>
            </button>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="glass-card p-6 space-y-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-400" /> Security
        </h2>
        <div className="flex items-center justify-between rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 p-4">
          <div>
            <p className="font-medium">Authentication</p>
            <p className="text-sm dark:text-slate-400 text-slate-500">Signed in via Google OAuth</p>
          </div>
          <span className="badge badge-green">Active</span>
        </div>
      </section>

      {/* Sign out */}
      <section className="glass-card border !border-red-500/30 p-6 space-y-4">
        <h2 className="font-semibold text-lg text-red-400 flex items-center gap-2">
          <LogOut className="h-5 w-5" /> Sign Out
        </h2>
        <p className="text-sm dark:text-slate-400 text-slate-500">
          Your paired devices will remain accessible next time you sign in.
        </p>
        <button onClick={() => { toast.message("Signing out…"); signOut({ callbackUrl: "/login" }); }} className="btn-danger">
          <LogOut className="h-4 w-4" /> Sign Out of LinkPhone
        </button>
      </section>
    </div>
  );
}