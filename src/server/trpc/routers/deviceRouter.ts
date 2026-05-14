import { router, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

declare global {
  // eslint-disable-next-line no-var
  var _pairingCodes: Map<string, { ownerId: string; expires: number }>;
  // eslint-disable-next-line no-var
  var _deviceSockets: Map<string, import("socket.io").Socket>;
}
if (!globalThis._pairingCodes) globalThis._pairingCodes = new Map();

function serializeDevice(d: {
  id: string; name: string; model: string | null; osVersion: string | null;
  publicKey: string | null; isOnline: boolean; lastSeen: Date; batteryLevel: number | null;
  location: unknown; ownerId: string; pairedAt: Date; isActive: boolean; allowedFeatures: string[];
}) {
  return {
    ...d,
    lastSeen: d.lastSeen instanceof Date ? d.lastSeen.toISOString() : String(d.lastSeen),
    pairedAt: d.pairedAt instanceof Date ? d.pairedAt.toISOString() : String(d.pairedAt),
  };
}

export const deviceRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const devices = await ctx.prisma.device.findMany({
      where: { ownerId: ctx.user!.id, isActive: true },
      orderBy: { lastSeen: "desc" },
    });
    return devices.map(serializeDevice);
  }),

  getById: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const device = await ctx.prisma.device.findFirst({
        where: { id: input.deviceId, ownerId: ctx.user!.id },
      });
      if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
      return serializeDevice(device);
    }),

  pair: publicProcedure
    .input(z.object({
      pairingCode: z.string().min(1),
      deviceName:  z.string().min(1).max(60),
      publicKey:   z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const stored = globalThis._pairingCodes.get(input.pairingCode);
      if (!stored) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired pairing code" });
      if (stored.expires < Date.now()) {
        globalThis._pairingCodes.delete(input.pairingCode);
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pairing code expired" });
      }

      const device = await ctx.prisma.device.create({
        data: {
          name: input.deviceName, publicKey: input.publicKey ?? null,
          ownerId: stored.ownerId,
          allowedFeatures: ["camera", "mic", "files", "sms", "location"],
        },
      });
      globalThis._pairingCodes.delete(input.pairingCode);

      ctx.prisma.activityLog.create({
        data: { deviceId: device.id, userId: stored.ownerId, action: "pair_device", status: "completed", ipAddress: ctx.ip ?? "unknown" },
      }).catch((e: Error) => console.error("[pair] activity:", e.message));

      return {
        id: device.id, name: device.name, isOnline: false,
        liveKitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "wss://localhost:7880",
        pairedAt: device.pairedAt.toISOString(),
      };
    }),

  rename: protectedProcedure
    .input(z.object({ deviceId: z.string(), name: z.string().min(1).max(60) }))
    .mutation(async ({ ctx, input }) => {
      const device = await ctx.prisma.device.findFirst({ where: { id: input.deviceId, ownerId: ctx.user!.id } });
      if (!device) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.device.update({ where: { id: input.deviceId }, data: { name: input.name } });
      return { success: true };
    }),

  remove: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const device = await ctx.prisma.device.findFirst({ where: { id: input.deviceId, ownerId: ctx.user!.id } });
      if (!device) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.device.update({ where: { id: input.deviceId }, data: { isActive: false, isOnline: false } });
      const socket = globalThis._deviceSockets?.get(input.deviceId);
      if (socket) { socket.emit("unpaired"); socket.disconnect(true); }
      return { success: true };
    }),

  getLiveKitToken: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const device = await ctx.prisma.device.findFirst({ where: { id: input.deviceId, ownerId: ctx.user!.id } });
      if (!device) throw new TRPCError({ code: "NOT_FOUND" });
      const { createLiveKitToken } = await import("@/lib/livekit");
      const token = await createLiveKitToken(device.id, ctx.user!.id);
      return { token };
    }),

  sendCommand: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
      command:  z.enum(["flashlight","vibrate","screenshot","volume_up","volume_down"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const device = await ctx.prisma.device.findFirst({ where: { id: input.deviceId, ownerId: ctx.user!.id } });
      if (!device) throw new TRPCError({ code: "NOT_FOUND" });
      const socket    = globalThis._deviceSockets?.get(input.deviceId);
      const delivered = !!(socket?.connected);
      if (delivered) socket!.emit("command", { command: input.command, timestamp: Date.now() });
      await ctx.prisma.activityLog.create({
        data: { deviceId: device.id, userId: ctx.user!.id, action: input.command, status: delivered ? "delivered" : "queued", ipAddress: ctx.ip ?? "unknown" },
      });
      return { success: true, delivered };
    }),

  requestLocation: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const device = await ctx.prisma.device.findFirst({ where: { id: input.deviceId, ownerId: ctx.user!.id } });
      if (!device) throw new TRPCError({ code: "NOT_FOUND" });
      const socket = globalThis._deviceSockets?.get(input.deviceId);
      if (!socket?.connected) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Device is offline" });
      socket.emit("command", { command: "get_location", timestamp: Date.now() });
      return { success: true };
    }),
});