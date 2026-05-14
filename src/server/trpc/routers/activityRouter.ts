import { router, protectedProcedure } from "../trpc";
import { z } from "zod";

export const activityRouter = router({
  getForDevice: protectedProcedure
    .input(z.object({ deviceId: z.string(), limit: z.number().min(1).max(100).default(30) }))
    .query(async ({ ctx, input }) => {
      const device = await ctx.prisma.device.findFirst({
        where: { id: input.deviceId, ownerId: ctx.user!.id }, select: { id: true },
      });
      if (!device) return [];
      const activities = await ctx.prisma.activityLog.findMany({
        where: { deviceId: input.deviceId, userId: ctx.user!.id },
        orderBy: { createdAt: "desc" }, take: input.limit,
      });
      return activities.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }));
    }),

  getAll: protectedProcedure
    .input(z.object({
      limit:    z.number().min(1).max(100).default(30),
      cursor:   z.string().optional(),
      deviceId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.activityLog.findMany({
        where: { userId: ctx.user!.id, ...(input.deviceId ? { deviceId: input.deviceId } : {}) },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: { device: { select: { name: true } } },
      });
      let nextCursor: string | undefined;
      if (items.length > input.limit) nextCursor = items.pop()!.id;
      return {
        activities: items.map((a) => ({
          id: a.id, action: a.action, status: a.status,
          deviceId: a.deviceId, deviceName: a.device?.name ?? "Unknown",
          createdAt: a.createdAt.toISOString(),
        })),
        nextCursor,
      };
    }),
});