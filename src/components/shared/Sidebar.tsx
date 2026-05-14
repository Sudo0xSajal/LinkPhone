"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, Activity, Bell, Settings, LogOut, Smartphone, Menu, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationsPanel } from "./NotificationsPanel";
import { useNotificationStore } from "@/store/notificationStore";
import Image from "next/image";

const NAV = [
  { href: "/dashboard", label: "Dashboard",    icon: LayoutDashboard },
  { href: "/activity",  label: "Activity Log", icon: Activity        },
  { href: "/settings",  label: "Settings",     icon: Settings        },
];

export function Sidebar() {
  const pathname      = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const content = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b dark:border-white/10 border-slate-200">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600">
          <Smartphone className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">LinkPhone</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`nav-item ${pathname.startsWith(href) ? "active" : ""}`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}

        <button
          onClick={() => { setNotifOpen(true); setMobileOpen(false); }}
          className="nav-item w-full"
        >
          <Bell className="h-4 w-4 flex-shrink-0" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </nav>

      {/* Bottom */}
      <div className="border-t dark:border-white/10 border-slate-200 px-3 py-3 space-y-1">
        <ThemeToggle showLabel />

        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          {session?.user?.image ? (
            <Image
              src={session.user.image} alt="avatar"
              width={32} height={32}
              className="h-8 w-8 rounded-full object-cover ring-2 dark:ring-white/20 ring-slate-300"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{session?.user?.name ?? "User"}</p>
            <p className="truncate text-xs dark:text-slate-400 text-slate-500">{session?.user?.email ?? ""}</p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="nav-item w-full !text-red-400 hover:!bg-red-500/10"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col h-screen border-r
        dark:bg-black/30 bg-white/80 backdrop-blur-xl dark:border-white/10 border-slate-200">
        {content}
      </aside>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen((v) => !v)}
        className="fixed top-4 left-4 z-50 md:hidden btn-ghost p-2"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 h-full w-60 md:hidden
            dark:bg-slate-900 bg-white border-r dark:border-white/10 border-slate-200">
            {content}
          </aside>
        </>
      )}

      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}