export default function Offline() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="glass-card p-8 text-center">
        <h1 className="text-2xl font-bold">You are offline</h1>
        <p className="mt-2 text-gray-400">LinkPhone will sync when you’re back online.</p>
      </div>
    </div>
  );
}
