import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const mediaRouter = router({
  startStream: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        type: z.enum(["camera", "mic"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const device = await ctx.prisma.device.findFirst({
          where: { id: input.deviceId, ownerId: ctx.user!.id },
        });
        if (!device) throw new TRPCError({ code: "NOT_FOUND" });

        const socket = (global as any)._deviceSockets?.get(input.deviceId);
        if (socket?.connected) {
          socket.emit("command", {
            command: `start_${input.type}`,
            timestamp: Date.now(),
          });
        }

        await ctx.prisma.activityLog.create({
          data: {
            deviceId: device.id,
            userId: ctx.user!.id,
            action: `${input.type}_stream_start`,
            status: socket?.connected ? "delivered" : "queued",
            ipAddress: ctx.ip,
          },
        });

        return { success: true, delivered: !!socket?.connected };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        ctx.logger.error("[media.startStream]", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  stopStream: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        type: z.enum(["camera", "mic"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const device = await ctx.prisma.device.findFirst({
          where: { id: input.deviceId, ownerId: ctx.user!.id },
        });
        if (!device) throw new TRPCError({ code: "NOT_FOUND" });

        const socket = (global as any)._deviceSockets?.get(input.deviceId);
        if (socket?.connected) {
          socket.emit("command", {
            command: `stop_${input.type}`,
            timestamp: Date.now(),
          });
        }

        await ctx.prisma.activityLog.create({
          data: {
            deviceId: device.id,
            userId: ctx.user!.id,
            action: `${input.type}_stream_stop`,
            status: socket?.connected ? "delivered" : "queued",
            ipAddress: ctx.ip,
          },
        });

        return { success: true, delivered: !!socket?.connected };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        ctx.logger.error("[media.stopStream]", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
});