import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

/**
 * File router.
 *
 * Real-world flow (when Android is connected):
 *  1. Browser calls file.list → server emits 'request_files' to the device socket
 *  2. Android receives the event, reads the directory, and emits 'file_list_result'
 *  3. Until WebSocket-based two-way RPC is added, we return a mock file list
 *     so the UI is functional.  The mock is clearly labelled so it's easy to
 *     replace when Android integration is complete.
 *
 * TODO: replace mock with real device data once Android sends 'file_list_result'
 * events back via Socket.io.
 */

const MOCK_FILES = [
  { name: "DCIM",      type: "directory", path: "/DCIM"      },
  { name: "Download",  type: "directory", path: "/Download"  },
  { name: "Documents", type: "directory", path: "/Documents" },
  { name: "test.txt",  type: "file",      path: "/test.txt",  size: 1_234     },
  { name: "photo.jpg", type: "file",      path: "/photo.jpg", size: 2_048_576 },
];

export const fileRouter = router({
  list: protectedProcedure
    .input(z.object({ deviceId: z.string(), path: z.string().default("/") }))
    .query(async ({ ctx, input }) => {
      try {
        const device = await ctx.prisma.device.findFirst({
          where: { id: input.deviceId, ownerId: ctx.user!.id },
        });
        if (!device) throw new TRPCError({ code: "NOT_FOUND" });

        // If the device is connected, ask it for the real file list.
        // The result arrives asynchronously via Socket.io; for now we still
        // return the mock below so the UI isn't blocked.
        const socket = (global as any)._deviceSockets?.get(input.deviceId);
        if (socket?.connected) {
          socket.emit("command", {
            command: "list_files",
            path: input.path,
            timestamp: Date.now(),
          });
        }

        await ctx.prisma.activityLog.create({
          data: {
            deviceId: device.id,
            userId:   ctx.user!.id,
            action:   "file_list",
            status:   "completed",
            metadata: { path: input.path },
            ipAddress: ctx.ip,
          },
        });

        return { files: MOCK_FILES, isMock: !socket?.connected };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        ctx.logger.error("file.list failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  download: protectedProcedure
    .input(z.object({ deviceId: z.string(), filePath: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const device = await ctx.prisma.device.findFirst({
          where: { id: input.deviceId, ownerId: ctx.user!.id },
        });
        if (!device) throw new TRPCError({ code: "NOT_FOUND" });

        // Ask the device to push the file via socket (real implementation)
        const socket = (global as any)._deviceSockets?.get(input.deviceId);
        if (socket?.connected) {
          socket.emit("command", {
            command:   "download_file",
            filePath:  input.filePath,
            timestamp: Date.now(),
          });
        }

        await ctx.prisma.activityLog.create({
          data: {
            deviceId: device.id,
            userId:   ctx.user!.id,
            action:   "file_download",
            status:   socket?.connected ? "requested" : "queued",
            metadata: { filePath: input.filePath },
            ipAddress: ctx.ip,
          },
        });

        // Placeholder URL until Android streams the real file
        const dummyBlob = `data:text/plain;base64,${Buffer.from(
          `Placeholder for ${input.filePath} – real file transfers require Android integration`,
        ).toString("base64")}`;

        return {
          url:      dummyBlob,
          fileName: input.filePath.split("/").pop() || "file",
          isMock:   !socket?.connected,
        };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        ctx.logger.error("file.download failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
});