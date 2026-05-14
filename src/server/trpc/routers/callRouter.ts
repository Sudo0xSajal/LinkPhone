import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const callRouter = router({
  getRecent: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const device = await ctx.prisma.device.findFirst({
          where: { id: input.deviceId, ownerId: ctx.user!.id },
        });
        if (!device) throw new TRPCError({ code: "NOT_FOUND" });
        const now = new Date().toISOString();
        return {
          calls: [
            { id: "1", number: "+1 234 567 890", type: "incoming", time: now, duration: 120 },
            { id: "2", number: "+1 987 654 321", type: "outgoing", time: now, duration: 45 },
            { id: "3", number: "+1 456 789 012", type: "missed", time: now, duration: 0 },
          ],
        };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        ctx.logger.error("call.getRecent failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
});

