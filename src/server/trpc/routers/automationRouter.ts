import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const automationRouter = router({
  getAll: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const device = await ctx.prisma.device.findFirst({
          where: { id: input.deviceId, ownerId: ctx.user!.id },
        });
        if (!device) throw new TRPCError({ code: "NOT_FOUND" });
        const rules = await ctx.prisma.automationRule.findMany({
          where: { deviceId: input.deviceId, userId: ctx.user!.id },
        });
        return rules.map(rule => ({
          ...rule,
          createdAt: rule.createdAt instanceof Date ? rule.createdAt.toISOString() : rule.createdAt,
          lastTriggered: rule.lastTriggered instanceof Date ? rule.lastTriggered?.toISOString() : rule.lastTriggered,
        }));
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        ctx.logger.error("automation.getAll failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  create: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
      name: z.string(),
      trigger: z.string(),
      action: z.string(),
      actionParams: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const device = await ctx.prisma.device.findFirst({
          where: { id: input.deviceId, ownerId: ctx.user!.id },
        });
        if (!device) throw new TRPCError({ code: "NOT_FOUND" });
        const rule = await ctx.prisma.automationRule.create({
          data: {
            name: input.name,
            deviceId: input.deviceId,
            trigger: input.trigger,
            action: input.action,
            actionParams: input.actionParams || {},
            userId: ctx.user!.id,
          },
        });
        return {
          ...rule,
          createdAt: rule.createdAt instanceof Date ? rule.createdAt.toISOString() : rule.createdAt,
          lastTriggered: rule.lastTriggered instanceof Date ? rule.lastTriggered?.toISOString() : rule.lastTriggered,
        };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        ctx.logger.error("automation.create failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ ruleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const rule = await ctx.prisma.automationRule.findFirst({
          where: { id: input.ruleId, userId: ctx.user!.id },
        });
        if (!rule) throw new TRPCError({ code: "NOT_FOUND" });
        await ctx.prisma.automationRule.delete({ where: { id: input.ruleId } });
        return { success: true };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        ctx.logger.error("automation.delete failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
});

