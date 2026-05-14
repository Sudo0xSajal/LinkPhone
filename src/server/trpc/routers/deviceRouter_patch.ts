// This file shows the changed sendCommand procedure.
// We'll replace the existing one by editing the file directly.

import { getDeviceSocket } from '@/lib/socket';

// Replace the sendCommand mutation in your existing deviceRouter.ts with this version:

/*
sendCommand: protectedProcedure
  .input(z.object({
    deviceId: z.string(),
    command: z.enum(["flashlight", "vibrate", "screenshot", "volume_up", "volume_down"]),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      const device = await ctx.prisma.device.findFirst({
        where: { id: input.deviceId, ownerId: ctx.user.id },
      });
      if (!device) throw new TRPCError({ code: "NOT_FOUND" });

      // Log request
      await ctx.prisma.activityLog.create({
        data: {
          deviceId: device.id,
          userId: ctx.user.id,
          action: input.command,
          status: "requested",
          ipAddress: ctx.ip,
        },
      });

      // Forward command via WebSocket
      const socket = getDeviceSocket(input.deviceId);
      if (socket) {
        socket.emit('command', { command: input.command, deviceId: input.deviceId });
        return { success: true, delivered: true };
      } else {
        return { success: false, delivered: false, error: "Device offline" };
      }
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      ctx.logger.error({ err }, 'device.sendCommand failed');
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),
*/
