export interface User { id: string; email: string; name?: string | null; image?: string | null; }
export interface Device { id: string; name: string; isOnline: boolean; batteryLevel: number; lastSeen: Date; model?: string | null; }
export interface ActivityLog { id: string; action: string; status: string; createdAt: Date; metadata?: Record<string, unknown>; }
