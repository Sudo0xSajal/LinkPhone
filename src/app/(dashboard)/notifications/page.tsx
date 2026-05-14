"use client";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-slate-600 dark:text-slate-400">Manage your device notifications</p>
      </div>

      <div className="glass-card p-6">
        <p className="text-slate-600 dark:text-slate-400">No notifications yet</p>
      </div>
    </div>
  );
}
